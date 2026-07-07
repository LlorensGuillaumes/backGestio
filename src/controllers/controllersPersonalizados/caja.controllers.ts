// src/controllers/controllersPersonalizados/caja.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getVeriFactuConfig, enviarFacturaVenta } from "../../services/verifactu.service.js";

// Helper para obtener IdUsuario para auditoría (null para master)
function getUserId(req: Request): number | null {
  const userId = req.user?.userId;
  return typeof userId === "number" ? userId : null;
}

/**
 * GET /caja/movimientos
 * Lista movimientos de caja con filtros y paginación
 */
export async function getMovimientosCaja(req: Request, res: Response, next: NextFunction) {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const porPagina = Math.min(Number(req.query.porPagina ?? 50), 100);
    const offset = (pagina - 1) * porPagina;

    // Filtros
    const fecha = req.query.fecha ? String(req.query.fecha) : null;
    const desdeFecha = req.query.desdeFecha ? String(req.query.desdeFecha) : null;
    const hastaFecha = req.query.hastaFecha ? String(req.query.hastaFecha) : null;
    const tipo = req.query.tipo ? String(req.query.tipo) : null;
    const idModoPago = req.query.idModoPago ? Number(req.query.idModoPago) : null;

    let query = db("CajaMovimientos as cm")
      .leftJoin("ModosPago as mp", "cm.IdModoPago", "mp.IdModoPago")
      .leftJoin("Facturas as f", "cm.IdFactura", "f.IdFactura")
      .select(
        "cm.IdMovimiento as id",
        "cm.Fecha as fecha",
        "cm.Tipo as tipo",
        "cm.IdModoPago as idModoPago",
        "mp.Descripcion as modoPago",
        "cm.Concepto as concepto",
        "cm.Importe as importe",
        "cm.IdFactura as idFactura",
        db.raw(`CASE WHEN f."IdFactura" IS NOT NULL THEN CONCAT(f."Serie", '-', f."Numero") ELSE NULL END as "numeroFactura"`),
        "cm.IdDocumento as idDocumento",
        "cm.IdCliente as idCliente",
        "cm.Referencia as referencia",
        "cm.Observaciones as observaciones"
      );

    // Aplicar filtros
    if (fecha) {
      query = query.whereRaw(`"cm"."Fecha"::date = ?`, [fecha]);
    }
    if (desdeFecha) {
      query = query.whereRaw(`"cm"."Fecha"::date >= ?`, [desdeFecha]);
    }
    if (hastaFecha) {
      query = query.whereRaw(`"cm"."Fecha"::date <= ?`, [hastaFecha]);
    }
    if (tipo) {
      query = query.where("cm.Tipo", tipo);
    }
    if (idModoPago) {
      query = query.where("cm.IdModoPago", idModoPago);
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("* as total").first();
    const countResult = await countQuery;
    const totalRegistros = Number((countResult as any)?.total ?? 0);
    const totalPaginas = Math.ceil(totalRegistros / porPagina);

    // Obtener movimientos
    const movimientos = await query
      .orderBy("cm.Fecha", "desc")
      .orderBy("cm.IdMovimiento", "desc")
      .limit(porPagina)
      .offset(offset);

    res.json({
      movimientos,
      totalRegistros,
      totalPaginas,
      paginaActual: pagina
    });
  } catch (err) {
    console.error("Error en getMovimientosCaja:", err);
    next(err);
  }
}

/**
 * GET /caja/resumen
 * Resumen de caja para un día o rango
 */
export async function getResumenCaja(req: Request, res: Response, next: NextFunction) {
  try {
    const fecha = req.query.fecha ? String(req.query.fecha) : new Date().toISOString().split("T")[0];
    const desdeFecha = req.query.desdeFecha ? String(req.query.desdeFecha) : fecha;
    const hastaFecha = req.query.hastaFecha ? String(req.query.hastaFecha) : fecha;

    // Totales por tipo
    const totalesPorTipo = await db("CajaMovimientos")
      .whereRaw(`"Fecha"::date >= ?`, [desdeFecha])
      .whereRaw(`"Fecha"::date <= ?`, [hastaFecha])
      .groupBy("Tipo")
      .select("Tipo as tipo")
      .sum("Importe as total")
      .count("* as operaciones");

    // Totales por modo de pago (solo cobros)
    const totalesPorModoPago = await db("CajaMovimientos as cm")
      .leftJoin("ModosPago as mp", "cm.IdModoPago", "mp.IdModoPago")
      .whereRaw(`"cm"."Fecha"::date >= ?`, [desdeFecha])
      .whereRaw(`"cm"."Fecha"::date <= ?`, [hastaFecha])
      .where("cm.Tipo", "COBRO")
      .groupBy("cm.IdModoPago", "mp.Descripcion")
      .select(
        "cm.IdModoPago as idModoPago",
        "mp.Descripcion as modoPago"
      )
      .sum("cm.Importe as total")
      .count("* as operaciones");

    // Calcular totales generales
    let totalCobros = 0;
    let totalPagos = 0;
    let totalAjustes = 0;

    for (const t of totalesPorTipo) {
      const total = Number(t.total) || 0;
      if (t.tipo === "COBRO" || t.tipo === "APERTURA") {
        totalCobros += total;
      } else if (t.tipo === "PAGO") {
        totalPagos += Math.abs(total);
      } else if (t.tipo === "AJUSTE") {
        totalAjustes += total;
      }
    }

    const saldoCaja = totalCobros - totalPagos + totalAjustes;

    res.json({
      periodo: { desde: desdeFecha, hasta: hastaFecha },
      totalesPorTipo,
      totalesPorModoPago,
      resumen: {
        totalCobros,
        totalPagos,
        totalAjustes,
        saldoCaja
      }
    });
  } catch (err) {
    console.error("Error en getResumenCaja:", err);
    next(err);
  }
}

/**
 * POST /caja/movimientos
 * Registra un nuevo movimiento de caja
 */
export async function createMovimientoCaja(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      tipo,
      idModoPago,
      concepto,
      importe,
      idFactura,
      idDocumento,
      idCliente,
      referencia,
      observaciones
    } = req.body;

    // Validaciones
    if (!tipo || !["COBRO", "PAGO", "APERTURA", "CIERRE", "AJUSTE"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo de movimiento inválido" });
    }
    if (!concepto?.trim()) {
      return res.status(400).json({ error: "El concepto es obligatorio" });
    }
    if (importe === undefined || importe === null || !Number.isFinite(Number(importe))) {
      return res.status(400).json({ error: "El importe es obligatorio" });
    }
    if (tipo === "COBRO" && !idModoPago) {
      return res.status(400).json({ error: "El modo de pago es obligatorio para cobros" });
    }

    const idUsuario = getUserId(req);
    const [result] = await db("CajaMovimientos")
      .insert({
        Fecha: new Date(),
        Tipo: tipo,
        IdModoPago: idModoPago || null,
        Concepto: concepto.trim(),
        Importe: Number(importe),
        IdFactura: idFactura || null,
        IdDocumento: idDocumento || null,
        IdCliente: idCliente || null,
        Referencia: referencia?.trim() || null,
        Observaciones: observaciones?.trim() || null,
        IdUsuario: idUsuario,
      })
      .returning("*");

    res.status(201).json({
      id: result.IdMovimiento,
      fecha: result.Fecha,
      tipo: result.Tipo,
      idModoPago: result.IdModoPago,
      concepto: result.Concepto,
      importe: result.Importe,
      idFactura: result.IdFactura,
      idDocumento: result.IdDocumento,
      idCliente: result.IdCliente,
      referencia: result.Referencia,
      observaciones: result.Observaciones
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /caja/cobro-factura
 * Registra el cobro de una factura (usado al entregar)
 */
export async function registrarCobroFactura(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      idFactura,
      idModoPago,
      importe,
      referencia,
      observaciones
    } = req.body;

    if (!idFactura) {
      return res.status(400).json({ error: "El id de factura es obligatorio" });
    }
    if (!idModoPago) {
      return res.status(400).json({ error: "El modo de pago es obligatorio" });
    }
    if (!importe || Number(importe) <= 0) {
      return res.status(400).json({ error: "El importe debe ser mayor que 0" });
    }

    const trx = await db.transaction();

    try {
      // Obtener datos de la factura
      const factura = await trx("Facturas")
        .where("IdFactura", idFactura)
        .select("*")
        .first();

      if (!factura) {
        await trx.rollback();
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      // Obtener modo de pago
      const modoPago = await trx("ModosPago")
        .where("IdModoPago", idModoPago)
        .select("Descripcion")
        .first();

      // Crear movimiento de caja
      const concepto = `Cobro factura ${factura.Serie}-${factura.Numero}`;
      const idUsuario = getUserId(req);

      const [movimiento] = await trx("CajaMovimientos")
        .insert({
          Fecha: new Date(),
          Tipo: "COBRO",
          IdModoPago: idModoPago,
          Concepto: concepto,
          Importe: Number(importe),
          IdFactura: idFactura,
          IdDocumento: factura.IdDocumento || null,
          IdCliente: factura.IdCliente,
          Referencia: referencia?.trim() || null,
          Observaciones: observaciones?.trim() || null,
          IdUsuario: idUsuario,
        })
        .returning("*");

      // Actualizar estado de cobro de la factura
      const totalCobrado = await trx("CajaMovimientos")
        .where("IdFactura", idFactura)
        .where("Tipo", "COBRO")
        .sum("Importe as total")
        .first();

      const cobrado = Number(totalCobrado?.total) || 0;
      const estadoCobro = cobrado >= factura.TotalFactura ? "COBRADA" : "COBRADA_PARCIAL";

      await trx("Facturas")
        .where("IdFactura", idFactura)
        .update({
          EstadoCobro: estadoCobro,
          FechaModificacion: new Date()
        });

      await trx.commit();

      res.status(201).json({
        id: movimiento.IdMovimiento,
        fecha: movimiento.Fecha,
        tipo: movimiento.Tipo,
        idModoPago: movimiento.IdModoPago,
        modoPago: modoPago?.Descripcion,
        concepto: movimiento.Concepto,
        importe: movimiento.Importe,
        idFactura: movimiento.IdFactura,
        estadoCobroFactura: estadoCobro
      });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /caja/movimientos/:id
 * Obtiene un movimiento de caja por ID
 */
export async function getMovimientoCaja(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de movimiento inválido" });
    }

    const movimiento = await db("CajaMovimientos as cm")
      .leftJoin("ModosPago as mp", "cm.IdModoPago", "mp.IdModoPago")
      .where("cm.IdMovimiento", id)
      .select(
        "cm.IdMovimiento as id",
        "cm.Fecha as fecha",
        "cm.Tipo as tipo",
        "cm.IdModoPago as idModoPago",
        "mp.Descripcion as modoPago",
        "cm.Concepto as concepto",
        "cm.Importe as importe",
        "cm.IdFactura as idFactura",
        "cm.IdDocumento as idDocumento",
        "cm.IdCliente as idCliente",
        "cm.Referencia as referencia",
        "cm.Observaciones as observaciones"
      )
      .first();

    if (!movimiento) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    res.json(movimiento);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /caja/movimientos/:id
 * Elimina un movimiento de caja (solo si es reciente y no es de factura)
 */
export async function deleteMovimientoCaja(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de movimiento inválido" });
    }

    const movimiento = await db("CajaMovimientos")
      .where("IdMovimiento", id)
      .first();

    if (!movimiento) {
      return res.status(404).json({ error: "Movimiento no encontrado" });
    }

    // No permitir eliminar cobros de facturas
    if (movimiento.IdFactura) {
      return res.status(400).json({ error: "No se pueden eliminar cobros de facturas. Use una rectificación." });
    }

    await db("CajaMovimientos").where("IdMovimiento", id).delete();

    res.json({ success: true, message: "Movimiento eliminado" });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /caja/ticket
 * Crea un ticket de venta (factura + cobro en una operación)
 */
export async function createTicketVenta(req: Request, res: Response, next: NextFunction) {
  try {
    const { idCliente, lineas, idModoPago, observaciones } = req.body;

    // Validaciones
    if (!lineas || !Array.isArray(lineas) || lineas.length === 0) {
      return res.status(400).json({ error: "El ticket debe tener al menos una línea" });
    }
    if (!idModoPago) {
      return res.status(400).json({ error: "El modo de pago es obligatorio" });
    }

    // Verificar modo de pago existe
    const modoPago = await db("ModosPago")
      .where("IdModoPago", idModoPago)
      .first();
    if (!modoPago) {
      return res.status(400).json({ error: "Modo de pago no encontrado" });
    }

    const trx = await db.transaction();

    try {
      // Procesar líneas y calcular totales
      const lineasProcesadas: any[] = [];
      let totalBase = 0;
      let totalIva = 0;

      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        let itemData: any = null;
        let pcIva = 21;

        if (linea.tipo === "PRODUCTO") {
          itemData = await trx("Productos")
            .where("IdProducto", linea.idItem)
            .select("IdProducto", "Codigo", "Nombre", "PVP", "Stock")
            .first();
          if (!itemData) {
            await trx.rollback();
            return res.status(400).json({ error: `Producto no encontrado: ${linea.idItem}` });
          }
        } else if (linea.tipo === "SERVICIO") {
          itemData = await trx("Servicios")
            .where("IdServicio", linea.idItem)
            .select("IdServicio", "Codigo", "Nombre", "PVP", "PorcentajeIva")
            .first();
          if (!itemData) {
            await trx.rollback();
            return res.status(400).json({ error: `Servicio no encontrado: ${linea.idItem}` });
          }
          pcIva = itemData.PorcentajeIva ?? 21;
        } else {
          await trx.rollback();
          return res.status(400).json({ error: `Tipo de línea inválido: ${linea.tipo}` });
        }

        const cantidad = Number(linea.cantidad) || 1;
        const precioConIva = linea.precioUnitario ?? itemData.PVP ?? 0;
        const descripcion = linea.descripcion || itemData.Nombre;

        // Calcular base e IVA (el PVP incluye IVA)
        const baseLinea = (precioConIva * cantidad) / (1 + pcIva / 100);
        const ivaLinea = (precioConIva * cantidad) - baseLinea;

        totalBase += baseLinea;
        totalIva += ivaLinea;

        lineasProcesadas.push({
          NumeroLinea: i + 1,
          CodigoItem: itemData.Codigo || "",
          DescripcionItem: descripcion,
          Cantidad: cantidad,
          PrecioUnitario: precioConIva / (1 + pcIva / 100), // Precio sin IVA
          BaseImporte: baseLinea,
          PcIva: pcIva,
          ImporteIva: ivaLinea,
          PcDescuento: 0,
          ImporteDescuento: 0,
          ImporteLinea: precioConIva * cantidad,
          // Para descuento de stock
          _tipo: linea.tipo,
          _idProducto: linea.tipo === "PRODUCTO" ? linea.idItem : null,
          _stockActual: itemData.Stock,
          _cantidad: cantidad
        });
      }

      const totalFactura = totalBase + totalIva;

      // Generar número de factura (Serie T para tickets)
      const year = new Date().getFullYear();
      const lastFactura = await trx("Facturas")
        .where("Serie", "T")
        .whereRaw(`EXTRACT(YEAR FROM "FechaFactura") = ?`, [year])
        .orderBy("Numero", "desc")
        .select("Numero")
        .first();
      const numero = (lastFactura?.Numero || 0) + 1;

      // Obtener nombre del cliente si existe
      let nombreCliente = "Factura Simplificada";
      if (idCliente) {
        const cliente = await trx("clientes as c")
          .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
          .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
          .where("c.id", idCliente)
          .select(
            db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as nombre`)
          )
          .first();
        nombreCliente = cliente?.nombre || nombreCliente;
      }

      const idUsuario = getUserId(req);

      // Crear factura
      const [facturaCreada] = await trx("Facturas")
        .insert({
          Serie: "T",
          Numero: numero,
          FechaFactura: new Date(),
          IdCliente: idCliente || null,
          TipoFactura: "NORMAL",
          TotalBaseImponible: totalBase,
          TotalCuotaIva: totalIva,
          TotalFactura: totalFactura,
          EstadoFiscal: "EMITIDA",
          EstadoCobro: "COBRADA",
          Estado: "ACTIVA",
          Observaciones: observaciones || `Ticket de venta`,
          IdUsuario: idUsuario,
        })
        .returning("*");

      // Crear líneas de factura
      for (const linea of lineasProcesadas) {
        const { _tipo, _idProducto, _stockActual, _cantidad, ...lineaData } = linea;
        await trx("FacturasLineas").insert({
          IdFactura: facturaCreada.IdFactura,
          ...lineaData
        });

        // Descontar stock si es producto
        if (_tipo === "PRODUCTO" && _idProducto) {
          const stockAnterior = _stockActual || 0;
          const stockPosterior = stockAnterior - _cantidad;

          await trx("Productos")
            .where("IdProducto", _idProducto)
            .update({ Stock: stockPosterior });

          // Registrar movimiento de stock
          await trx("MovimientosStock").insert({
            IdProducto: _idProducto,
            TipoMovimiento: "SALIDA_VENTA",
            Cantidad: _cantidad,
            StockAnterior: stockAnterior,
            StockPosterior: stockPosterior,
            IdDocumentoRef: facturaCreada.IdFactura,
            TipoDocumentoRef: "FACTURA",
            Observaciones: `Ticket T-${numero}`,
            FechaMovimiento: new Date()
          });
        }
      }

      // Crear movimiento de caja
      const [movimiento] = await trx("CajaMovimientos")
        .insert({
          Fecha: new Date(),
          Tipo: "COBRO",
          IdModoPago: idModoPago,
          Concepto: `Ticket T-${numero}${idCliente ? '' : ' (Factura Simplificada)'}`,
          Importe: totalFactura,
          IdFactura: facturaCreada.IdFactura,
          IdCliente: idCliente || null,
          IdUsuario: idUsuario,
        })
        .returning("*");

      await trx.commit();

      // VeriFactu: envío automático si está configurado
      getVeriFactuConfig()
        .then((config) => {
          if (config?.ModoActivo && config?.EnvioAutomatico) {
            enviarFacturaVenta(facturaCreada.IdFactura).catch((err) =>
              console.error("VeriFactu auto-envio error:", err.message)
            );
          }
        })
        .catch((err) => console.error("VeriFactu config error:", err.message));

      res.status(201).json({
        factura: {
          id: facturaCreada.IdFactura,
          serie: "T",
          numero: numero,
          fechaFactura: facturaCreada.FechaFactura,
          nombreCliente,
          totalBaseImponible: totalBase,
          totalCuotaIva: totalIva,
          totalFactura: totalFactura,
          estadoCobro: "COBRADA"
        },
        movimientoCaja: {
          id: movimiento.IdMovimiento,
          fecha: movimiento.Fecha,
          tipo: "COBRO",
          importe: totalFactura
        }
      });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error en createTicketVenta:", err);
    next(err);
  }
}

/**
 * GET /clientes/default-factura-simplificada
 * Obtiene el cliente por defecto para facturas simplificadas
 */
export async function getClienteFacturaSimplificada(req: Request, res: Response, next: NextFunction) {
  try {
    const cliente = await db("clientes as c")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
      .where("c.es_cliente_factura_simplificada", true)
      .where("c.activo", true)
      .select(
        "c.id",
        db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, 'Factura Simplificada') as nombre`),
        "c.documento_fiscal as documentoFiscal",
        "c.es_cliente_factura_simplificada as esFacturaSimplificada"
      )
      .first();

    res.json(cliente || null);
  } catch (err) {
    next(err);
  }
}
