// src/controllers/controllersPersonalizados/facturas.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getVeriFactuConfig, enviarFacturaVenta } from "../../services/verifactu.service.js";
import { getSerieFacturacion } from "../../services/databaseService.js";

// Helper para obtener IdUsuario para auditoría (null para master)
function getUserId(req: Request): number | null {
  const userId = req.user?.userId;
  return typeof userId === "number" ? userId : null;
}

/**
 * GET /facturas/venta
 * Listado de facturas de venta con filtros y paginación
 */
export async function getFacturasVenta(req: Request, res: Response, next: NextFunction) {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const porPagina = Math.min(Number(req.query.porPagina ?? 20), 100);
    const offset = (pagina - 1) * porPagina;

    // Filtros opcionales
    const serie = req.query.serie ? String(req.query.serie) : null;
    const numero = req.query.numero ? Number(req.query.numero) : null;
    const estadoFiscal = req.query.estadoFiscal ? String(req.query.estadoFiscal) : null;
    const estadoCobro = req.query.estadoCobro ? String(req.query.estadoCobro) : null;
    const desdeFecha = req.query.desdeFecha ? String(req.query.desdeFecha) : null;
    const hastaFecha = req.query.hastaFecha ? String(req.query.hastaFecha) : null;

    // Query base con datos del cliente
    let query = db("Facturas as f")
      .leftJoin("clientes as c", "c.id", "f.IdCliente")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
      .select(
        "f.IdFactura as id",
        "f.Serie as serie",
        "f.Numero as numero",
        "f.FechaFactura as fechaFactura",
        "f.IdCliente as idCliente",
        "f.TipoFactura as tipoFactura",
        "f.TotalBaseImponible as totalBaseImponible",
        "f.TotalCuotaIva as totalCuotaIva",
        "f.TotalFactura as totalFactura",
        "f.EstadoFiscal as estadoFiscal",
        "f.EstadoCobro as estadoCobro",
        "f.Estado as estado",
        "f.Observaciones as observaciones",
        "f.VeriFactuEstado as veriFactuEstado",
        "f.VeriFactuCSV as veriFactuCSV",
        db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "nombreCliente"`)
      )
      .whereNot("f.Estado", "ANULADA");

    // Aplicar filtros
    if (serie) {
      query = query.where("f.Serie", serie);
    }
    if (numero !== null && Number.isFinite(numero)) {
      query = query.where("f.Numero", numero);
    }
    if (estadoFiscal) {
      query = query.where("f.EstadoFiscal", estadoFiscal);
    }
    if (estadoCobro) {
      query = query.where("f.EstadoCobro", estadoCobro);
    }
    if (desdeFecha) {
      query = query.where("f.FechaFactura", ">=", desdeFecha);
    }
    if (hastaFecha) {
      query = query.where("f.FechaFactura", "<=", hastaFecha);
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("* as total").first();
    const countResult = await countQuery;
    const totalRegistros = Number((countResult as any)?.total ?? 0);
    const totalPaginas = Math.ceil(totalRegistros / porPagina);

    // Obtener facturas
    const facturas = await query
      .orderBy("f.FechaFactura", "desc")
      .orderBy("f.Numero", "desc")
      .limit(porPagina)
      .offset(offset);

    // Obtener líneas de las facturas
    const facturaIds = facturas.map((f: any) => f.id);
    let lineas: any[] = [];

    if (facturaIds.length > 0) {
      lineas = await db("FacturasLineas")
        .select(
          "IdLineaFactura as id",
          "IdFactura as idFactura",
          "NumeroLinea as numeroLinea",
          "CodigoItem as codigoItem",
          "DescripcionItem as descripcionItem",
          "Cantidad as cantidad",
          "PrecioUnitario as precioUnitario",
          "BaseImporte as baseImporte",
          "PcIva as pcIva",
          "ImporteIva as importeIva",
          "PcDescuento as pcDescuento",
          "ImporteDescuento as importeDescuento",
          "ImporteLinea as importeLinea"
        )
        .whereIn("IdFactura", facturaIds);
    }

    // Agrupar líneas por factura
    const lineasByFactura = new Map<number, any[]>();
    for (const linea of lineas) {
      const key = linea.idFactura;
      if (!lineasByFactura.has(key)) {
        lineasByFactura.set(key, []);
      }
      lineasByFactura.get(key)!.push(linea);
    }

    // Agregar líneas a cada factura
    const facturasConLineas = facturas.map((f: any) => ({
      ...f,
      FacturaVentaLineas: lineasByFactura.get(f.id) || []
    }));

    res.json({
      facturas: facturasConLineas,
      totalRegistros,
      totalPaginas,
      paginaActual: pagina
    });
  } catch (err) {
    console.error("Error en getFacturasVenta:", err);
    next(err);
  }
}

/**
 * GET /facturas/compra
 * Listado de facturas de compra con filtros y paginación
 */
export async function getFacturasCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const pagina = Number(req.query.pagina ?? 1);
    const porPagina = Math.min(Number(req.query.porPagina ?? 20), 100);
    const offset = (pagina - 1) * porPagina;

    // Filtros opcionales
    const serie = req.query.serie ? String(req.query.serie) : null;
    const numero = req.query.numero ? String(req.query.numero) : null;
    const proveedor = req.query.proveedor ? String(req.query.proveedor) : null;
    const desdeFecha = req.query.desdeFecha ? String(req.query.desdeFecha) : null;
    const hastaFecha = req.query.hastaFecha ? String(req.query.hastaFecha) : null;

    // Query base
    let query = db("FacturasCompra as fc")
      .leftJoin("Proveedores as p", "fc.IdProveedor", "p.IdProveedor")
      .select(
        "fc.IdFacturaCompra as id",
        "fc.SerieFactura as SerieFactura",
        "fc.NumeroFactura as NumeroFactura",
        "fc.FechaFactura as FechaFactura",
        "fc.IdProveedor as IdProveedor",
        "p.NombreComercial as NombreProveedor",
        "fc.TotalBaseImponible as TotalBaseImponible",
        "fc.TotalCuotaIva as TotalCuotaIva",
        "fc.TotalFactura as TotalFactura",
        "fc.ImportePagado as ImportePagado",
        "fc.ImportePendiente as ImportePendiente",
        "fc.Estado as Estado",
        "fc.VeriFactuEstado as VeriFactuEstado",
        "fc.VeriFactuCSV as VeriFactuCSV"
      )
      .whereNot("fc.Estado", "ANULADA");

    // Aplicar filtros
    if (serie) {
      query = query.whereILike("fc.SerieFactura", `%${serie}%`);
    }
    if (numero) {
      query = query.whereILike("fc.NumeroFactura", `%${numero}%`);
    }
    if (proveedor) {
      query = query.whereILike("p.NombreComercial", `%${proveedor}%`);
    }
    if (desdeFecha) {
      query = query.where("fc.FechaFactura", ">=", desdeFecha);
    }
    if (hastaFecha) {
      query = query.where("fc.FechaFactura", "<=", hastaFecha);
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("* as total").first();
    const countResult = await countQuery;
    const totalRegistros = Number((countResult as any)?.total ?? 0);
    const totalPaginas = Math.ceil(totalRegistros / porPagina);

    // Obtener facturas
    const facturas = await query
      .orderBy("fc.FechaFactura", "desc")
      .limit(porPagina)
      .offset(offset);

    res.json({
      data: facturas,
      total: totalRegistros,
      totalPaginas,
      paginaActual: pagina
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Genera el siguiente número de factura para una serie
 */
async function getNextNumeroFactura(serie: string, trx: any): Promise<number> {
  const year = new Date().getFullYear();
  const lastFactura = await trx("Facturas")
    .where("Serie", serie)
    .whereRaw(`EXTRACT(YEAR FROM "FechaFactura") = ?`, [year])
    .orderBy("Numero", "desc")
    .select("Numero")
    .first();

  return (lastFactura?.Numero || 0) + 1;
}

/**
 * Obtiene la serie de facturación para el usuario actual
 * Combina la serie de la BD con un sufijo de tipo (A=anticipo, F=final, R=rectificativa)
 */
async function getSerieFacturaCompleta(req: Request, tipoSufijo: string): Promise<string> {
  const currentDb = (req as any).user?.currentDatabase || process.env.DB_NAME || 'gestio_db';
  const serieBd = await getSerieFacturacion(currentDb);
  // Si la serie de la BD ya es solo una letra (ej: "F"), la usamos directamente
  // Si es más larga (ej: "OC"), la combinamos con el tipo
  if (serieBd.length <= 1) {
    return serieBd; // Serie simple: F, A, R...
  }
  // Serie compuesta: OC-F, OC-A, OC-R...
  return `${serieBd}-${tipoSufijo}`;
}

/**
 * POST /facturas/anticipo
 * Crea una factura de anticipo para un documento
 */
export async function createFacturaAnticipo(req: Request, res: Response, next: NextFunction) {
  try {
    const { idDocumento, importe, idModoPago } = req.body;

    if (!idDocumento || !importe || Number(importe) <= 0) {
      return res.status(400).json({ error: "Faltan parámetros: idDocumento e importe son requeridos" });
    }
    if (!idModoPago) {
      return res.status(400).json({ error: "El modo de pago es obligatorio" });
    }

    const trx = await db.transaction();

    try {
      // Obtener documento con datos del cliente
      const documento = await trx("Documentos as d")
        .leftJoin("clientes as c", "c.id", "d.IdCliente")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .where("d.IdDocumento", idDocumento)
        .select(
          "d.*",
          db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`)
        )
        .first();

      if (!documento) {
        await trx.rollback();
        return res.status(404).json({ error: "Documento no encontrado" });
      }

      // Verificar que no tenga ya factura de anticipo
      if (documento.IdFacturaAnticipo) {
        await trx.rollback();
        return res.status(400).json({ error: "Este documento ya tiene una factura de anticipo" });
      }

      const importeNum = Number(importe);
      const pctIva = 21; // IVA estándar
      const baseImponible = importeNum / (1 + pctIva / 100);
      const cuotaIva = importeNum - baseImponible;

      // Generar número de factura con serie de la BD
      const serie = await getSerieFacturaCompleta(req, "A"); // A para anticipos
      const numero = await getNextNumeroFactura(serie, trx);

      // Crear factura
      const idUsuario = getUserId(req);
      const [facturaCreada] = await trx("Facturas")
        .insert({
          Serie: serie,
          Numero: numero,
          FechaFactura: new Date(),
          IdCliente: documento.IdCliente,
          TipoFactura: "ANTICIPO",
          IdDocumento: idDocumento,
          TotalBaseImponible: baseImponible,
          TotalCuotaIva: cuotaIva,
          TotalFactura: importeNum,
          EstadoFiscal: "EMITIDA",
          EstadoCobro: "COBRADA",
          Estado: "ACTIVA",
          Observaciones: `Anticipo a cuenta del encargo ${documento.NumeroDocumento}`,
          IdUsuario: idUsuario,
        })
        .returning("*");

      // Crear línea de factura (sin texto redundante)
      await trx("FacturasLineas").insert({
        IdFactura: facturaCreada.IdFactura,
        NumeroLinea: 1,
        CodigoItem: documento.NumeroDocumento || "",
        DescripcionItem: `Anticipo a cuenta del encargo ${documento.NumeroDocumento}`,
        Cantidad: 1,
        PrecioUnitario: baseImponible,
        BaseImporte: baseImponible,
        PcIva: pctIva,
        ImporteIva: cuotaIva,
        PcDescuento: 0,
        ImporteDescuento: 0,
        ImporteLinea: importeNum,
      });

      // Registrar movimiento en caja
      await trx("CajaMovimientos").insert({
        Fecha: new Date(),
        Tipo: "COBRO",
        IdModoPago: idModoPago,
        Concepto: `Anticipo factura ${serie}-${numero} (${documento.NumeroDocumento})`,
        Importe: importeNum,
        IdFactura: facturaCreada.IdFactura,
        IdDocumento: idDocumento,
        IdCliente: documento.IdCliente,
        IdUsuario: idUsuario,
      });

      // Actualizar documento con referencia a factura anticipo
      await trx("Documentos")
        .where("IdDocumento", idDocumento)
        .update({
          IdFacturaAnticipo: facturaCreada.IdFactura,
          PagoACuenta: importeNum,
          FechaModificacion: new Date(),
        });

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

      // Devolver factura creada con datos completos incluyendo cliente
      const factura = await db("Facturas as f")
        .leftJoin("clientes as c", "c.id", "f.IdCliente")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .where("f.IdFactura", facturaCreada.IdFactura)
        .select(
          "f.*",
          db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`),
          "c.documento_fiscal as CifCliente"
        )
        .first();

      const lineas = await db("FacturasLineas")
        .where("IdFactura", facturaCreada.IdFactura)
        .orderBy("NumeroLinea")
        .select(
          "IdLineaFactura as id",
          "NumeroLinea as numeroLinea",
          "CodigoItem as codigoItem",
          "DescripcionItem as descripcionItem",
          "Cantidad as cantidad",
          "PrecioUnitario as precioUnitario",
          "BaseImporte as baseImporte",
          "PcIva as pcIva",
          "ImporteIva as importeIva",
          "PcDescuento as pcDescuento",
          "ImporteDescuento as importeDescuento",
          "ImporteLinea as importeLinea"
        );

      res.json({ ...factura, lineas });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /facturas/final/:idDocumento
 * Crea la factura final al entregar un encargo
 */
export async function createFacturaFinal(req: Request, res: Response, next: NextFunction) {
  try {
    const idDocumento = Number(req.params.idDocumento);

    if (!Number.isFinite(idDocumento) || idDocumento <= 0) {
      return res.status(400).json({ error: "Id de documento inválido" });
    }

    const trx = await db.transaction();

    try {
      // Obtener documento con sus líneas
      const documento = await trx("Documentos")
        .where("IdDocumento", idDocumento)
        .first();

      if (!documento) {
        await trx.rollback();
        return res.status(404).json({ error: "Documento no encontrado" });
      }

      if (documento.Estado !== "CONFIRMADO") {
        await trx.rollback();
        return res.status(400).json({ error: "El documento debe estar confirmado para generar factura final" });
      }

      if (documento.IdFacturaFinal) {
        await trx.rollback();
        return res.status(400).json({ error: "Este documento ya tiene una factura final" });
      }

      // Obtener líneas del documento
      const lineasDoc = await trx("DocumentosLineas")
        .where("IdDocumento", idDocumento)
        .orderBy("Orden");

      if (!lineasDoc.length) {
        await trx.rollback();
        return res.status(400).json({ error: "El documento no tiene líneas" });
      }

      // Calcular totales
      let totalBase = 0;
      let totalIva = 0;

      const lineasFactura = lineasDoc.map((l: any, idx: number) => {
        const cantidad = Number(l.Cantidad) || 1;
        const precio = Number(l.PrecioUnitario) || 0;
        const descuentoPct = Number(l.Descuento) || 0;
        const pctIva = Number(l.PorcentajeIva) || 21;

        const bruto = cantidad * precio;
        const descuentoImporte = bruto * (descuentoPct / 100);
        const base = bruto - descuentoImporte;
        const iva = base * (pctIva / 100);

        totalBase += base;
        totalIva += iva;

        return {
          NumeroLinea: idx + 1,
          CodigoItem: l.Codigo || "",
          DescripcionItem: l.Descripcion || "",
          Cantidad: cantidad,
          PrecioUnitario: precio,
          BaseImporte: base,
          PcIva: pctIva,
          ImporteIva: iva,
          PcDescuento: descuentoPct,
          ImporteDescuento: descuentoImporte,
          ImporteLinea: base + iva,
        };
      });

      const totalFactura = totalBase + totalIva;
      const anticipo = Number(documento.PagoACuenta) || 0;
      const pendiente = totalFactura - anticipo;

      // Generar número de factura con serie de la BD
      const serie = await getSerieFacturaCompleta(req, "F"); // F para facturas finales
      const numero = await getNextNumeroFactura(serie, trx);
      const idUsuario = getUserId(req);

      // Crear factura
      const [facturaCreada] = await trx("Facturas")
        .insert({
          Serie: serie,
          Numero: numero,
          FechaFactura: new Date(),
          IdCliente: documento.IdCliente,
          TipoFactura: "FINAL",
          IdDocumento: idDocumento,
          IdFacturaAnticipo: documento.IdFacturaAnticipo || null,
          TotalBaseImponible: totalBase,
          TotalCuotaIva: totalIva,
          TotalFactura: totalFactura,
          EstadoFiscal: "EMITIDA",
          EstadoCobro: pendiente <= 0 ? "COBRADA" : "PENDIENTE",
          Estado: "ACTIVA",
          Observaciones: anticipo > 0
            ? `Factura final del encargo ${documento.NumeroDocumento}. Anticipo previo: ${anticipo.toFixed(2)}€. Pendiente: ${pendiente.toFixed(2)}€`
            : `Factura final del encargo ${documento.NumeroDocumento}`,
          IdUsuario: idUsuario,
        })
        .returning("*");

      // Crear líneas de factura
      for (const linea of lineasFactura) {
        await trx("FacturasLineas").insert({
          IdFactura: facturaCreada.IdFactura,
          ...linea,
        });
      }

      // Actualizar documento
      await trx("Documentos")
        .where("IdDocumento", idDocumento)
        .update({
          IdFacturaFinal: facturaCreada.IdFactura,
          Estado: "ENTREGADO",
          FechaModificacion: new Date(),
        });

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

      // Devolver factura creada con datos completos incluyendo cliente
      const factura = await db("Facturas as f")
        .leftJoin("clientes as c", "c.id", "f.IdCliente")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .leftJoin("Documentos as d", "f.IdDocumento", "d.IdDocumento")
        .where("f.IdFactura", facturaCreada.IdFactura)
        .select(
          "f.*",
          db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`),
          "c.documento_fiscal as CifCliente",
          "d.NumeroDocumento as NumeroDocumentoOrigen"
        )
        .first();

      const lineas = await db("FacturasLineas")
        .where("IdFactura", facturaCreada.IdFactura)
        .orderBy("NumeroLinea")
        .select(
          "IdLineaFactura as id",
          "NumeroLinea as numeroLinea",
          "CodigoItem as codigoItem",
          "DescripcionItem as descripcionItem",
          "Cantidad as cantidad",
          "PrecioUnitario as precioUnitario",
          "BaseImporte as baseImporte",
          "PcIva as pcIva",
          "ImporteIva as importeIva",
          "PcDescuento as pcDescuento",
          "ImporteDescuento as importeDescuento",
          "ImporteLinea as importeLinea"
        );

      res.json({
        ...factura,
        lineas,
        anticipo,
        pendiente,
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
 * GET /facturas/documento/:idDocumento
 * Obtiene las facturas vinculadas a un documento
 */
export async function getFacturasDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const idDocumento = Number(req.params.idDocumento);

    if (!Number.isFinite(idDocumento) || idDocumento <= 0) {
      return res.status(400).json({ error: "Id de documento inválido" });
    }

    const facturas = await db("Facturas as f")
      .where("f.IdDocumento", idDocumento)
      .orderBy("f.FechaFactura", "asc")
      .select(
        "f.IdFactura as id",
        "f.Serie as serie",
        "f.Numero as numero",
        "f.FechaFactura as fechaFactura",
        "f.TipoFactura as tipoFactura",
        "f.TotalFactura as totalFactura",
        "f.EstadoCobro as estadoCobro"
      );

    res.json(facturas);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /facturas/:id
 * Obtiene una factura por ID con sus líneas
 */
export async function getFactura(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de factura inválido" });
    }

    const factura = await db("Facturas as f")
      .leftJoin("clientes as c", "c.id", "f.IdCliente")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
      .leftJoin("Documentos as d", "f.IdDocumento", "d.IdDocumento")
      .where("f.IdFactura", id)
      .select(
        "f.*",
        db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`),
        db.raw(`COALESCE(cp.primer_apellido, '') as "ApellidosCliente"`),
        "c.documento_fiscal as CifCliente",
        "c.direccion_fiscal as DireccionCliente",
        "d.NumeroDocumento as NumeroDocumentoOrigen"
      )
      .first();

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    const lineas = await db("FacturasLineas")
      .where("IdFactura", id)
      .orderBy("NumeroLinea")
      .select(
        "IdLineaFactura as id",
        "NumeroLinea as numeroLinea",
        "CodigoItem as codigoItem",
        "DescripcionItem as descripcionItem",
        "Cantidad as cantidad",
        "PrecioUnitario as precioUnitario",
        "BaseImporte as baseImporte",
        "PcIva as pcIva",
        "ImporteIva as importeIva",
        "PcDescuento as pcDescuento",
        "ImporteDescuento as importeDescuento",
        "ImporteLinea as importeLinea"
      );

    // Si tiene factura de anticipo, obtener sus datos
    let facturaAnticipo = null;
    if (factura.IdFacturaAnticipo) {
      facturaAnticipo = await db("Facturas")
        .where("IdFactura", factura.IdFacturaAnticipo)
        .select("IdFactura as id", "Serie as serie", "Numero as numero", "TotalFactura as total")
        .first();
    }

    res.json({ ...factura, lineas, facturaAnticipo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /facturas/abono
 * Crea una factura de abono (rectificativa) para una factura existente
 */
export async function createFacturaAbono(req: Request, res: Response, next: NextFunction) {
  try {
    const { idFacturaOriginal, idModoPago, lineasAbono, motivo } = req.body;

    if (!idFacturaOriginal) {
      return res.status(400).json({ error: "El id de factura original es obligatorio" });
    }
    if (!idModoPago) {
      return res.status(400).json({ error: "El modo de pago es obligatorio" });
    }

    const trx = await db.transaction();

    try {
      // Obtener factura original con datos del cliente
      const facturaOriginal = await trx("Facturas as f")
        .leftJoin("clientes as c", "c.id", "f.IdCliente")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .where("f.IdFactura", idFacturaOriginal)
        .select(
          "f.*",
          db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`)
        )
        .first();

      if (!facturaOriginal) {
        await trx.rollback();
        return res.status(404).json({ error: "Factura original no encontrada" });
      }

      if (facturaOriginal.Estado === "ANULADA") {
        await trx.rollback();
        return res.status(400).json({ error: "No se puede abonar una factura anulada" });
      }

      // Obtener líneas de la factura original
      const lineasOriginal = await trx("FacturasLineas")
        .where("IdFactura", idFacturaOriginal)
        .orderBy("NumeroLinea");

      if (!lineasOriginal.length) {
        await trx.rollback();
        return res.status(400).json({ error: "La factura original no tiene líneas" });
      }

      // Determinar qué líneas abonar (total o parcial)
      let lineasParaAbonar: any[] = [];
      let esAbonoParcial = false;

      if (lineasAbono && Array.isArray(lineasAbono) && lineasAbono.length > 0) {
        // Abono parcial: solo las líneas especificadas con las cantidades indicadas
        esAbonoParcial = true;
        for (const lineaAbono of lineasAbono) {
          const lineaOrig = lineasOriginal.find((l: any) => l.IdLineaFactura === lineaAbono.idLinea);
          if (lineaOrig) {
            const cantidadAbono = Math.min(Number(lineaAbono.cantidad) || 0, Number(lineaOrig.Cantidad));
            if (cantidadAbono > 0) {
              lineasParaAbonar.push({
                ...lineaOrig,
                CantidadAbono: cantidadAbono
              });
            }
          }
        }
      } else {
        // Abono total: todas las líneas con cantidad completa
        lineasParaAbonar = lineasOriginal.map((l: any) => ({
          ...l,
          CantidadAbono: Number(l.Cantidad)
        }));
      }

      if (lineasParaAbonar.length === 0) {
        await trx.rollback();
        return res.status(400).json({ error: "No hay líneas válidas para abonar" });
      }

      // Calcular totales del abono (en negativo)
      let totalBase = 0;
      let totalIva = 0;

      const lineasFacturaAbono = lineasParaAbonar.map((l: any, idx: number) => {
        const cantidad = -Math.abs(l.CantidadAbono); // Negativo
        const precio = Number(l.PrecioUnitario) || 0;
        const descuentoPct = Number(l.PcDescuento) || 0;
        const pctIva = Number(l.PcIva) || 21;

        const bruto = cantidad * precio;
        const descuentoImporte = bruto * (descuentoPct / 100);
        const base = bruto - descuentoImporte;
        const iva = base * (pctIva / 100);

        totalBase += base;
        totalIva += iva;

        return {
          NumeroLinea: idx + 1,
          CodigoItem: l.CodigoItem || "",
          DescripcionItem: l.DescripcionItem || "",
          Cantidad: cantidad,
          PrecioUnitario: precio,
          BaseImporte: base,
          PcIva: pctIva,
          ImporteIva: iva,
          PcDescuento: descuentoPct,
          ImporteDescuento: descuentoImporte,
          ImporteLinea: base + iva,
        };
      });

      const totalFactura = totalBase + totalIva;

      // Generar número de factura con serie de la BD (R para rectificativas)
      const serie = await getSerieFacturaCompleta(req, "R");
      const numero = await getNextNumeroFactura(serie, trx);
      const idUsuario = getUserId(req);

      // Crear factura de abono
      const observacionesAbono = motivo
        ? `Abono de factura ${facturaOriginal.Serie}-${facturaOriginal.Numero}. Motivo: ${motivo}`
        : `Abono ${esAbonoParcial ? "parcial" : "total"} de factura ${facturaOriginal.Serie}-${facturaOriginal.Numero}`;

      const [facturaCreada] = await trx("Facturas")
        .insert({
          Serie: serie,
          Numero: numero,
          FechaFactura: new Date(),
          IdCliente: facturaOriginal.IdCliente,
          TipoFactura: "RECTIFICATIVA",
          IdDocumento: facturaOriginal.IdDocumento || null,
          TotalBaseImponible: totalBase,
          TotalCuotaIva: totalIva,
          TotalFactura: totalFactura,
          EstadoFiscal: "EMITIDA",
          EstadoCobro: "COBRADA",
          Estado: "ACTIVA",
          Observaciones: observacionesAbono,
          IdUsuario: idUsuario,
        })
        .returning("*");

      // Crear líneas de factura
      for (const linea of lineasFacturaAbono) {
        await trx("FacturasLineas").insert({
          IdFactura: facturaCreada.IdFactura,
          ...linea,
        });
      }

      // Registrar movimiento en caja (devolución = importe negativo)
      await trx("CajaMovimientos").insert({
        Fecha: new Date(),
        Tipo: "PAGO",
        IdModoPago: idModoPago,
        Concepto: `Abono factura ${serie}-${numero} (ref: ${facturaOriginal.Serie}-${facturaOriginal.Numero})`,
        Importe: totalFactura, // Ya es negativo
        IdFactura: facturaCreada.IdFactura,
        IdDocumento: facturaOriginal.IdDocumento || null,
        IdCliente: facturaOriginal.IdCliente,
        IdUsuario: idUsuario,
      });

      // Actualizar estado de la factura original si es abono total
      if (!esAbonoParcial) {
        await trx("Facturas")
          .where("IdFactura", idFacturaOriginal)
          .update({
            EstadoFiscal: "RECTIFICATIVA",
            FechaModificacion: new Date()
          });
      }

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

      // Devolver factura creada con datos completos
      const factura = await db("Facturas as f")
        .leftJoin("clientes as c", "c.id", "f.IdCliente")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .where("f.IdFactura", facturaCreada.IdFactura)
        .select(
          "f.*",
          db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`),
          "c.documento_fiscal as CifCliente"
        )
        .first();

      const lineas = await db("FacturasLineas")
        .where("IdFactura", facturaCreada.IdFactura)
        .orderBy("NumeroLinea")
        .select(
          "IdLineaFactura as id",
          "NumeroLinea as numeroLinea",
          "CodigoItem as codigoItem",
          "DescripcionItem as descripcionItem",
          "Cantidad as cantidad",
          "PrecioUnitario as precioUnitario",
          "BaseImporte as baseImporte",
          "PcIva as pcIva",
          "ImporteIva as importeIva",
          "PcDescuento as pcDescuento",
          "ImporteDescuento as importeDescuento",
          "ImporteLinea as importeLinea"
        );

      res.json({
        ...factura,
        lineas,
        facturaOriginal: {
          id: facturaOriginal.IdFactura,
          serie: facturaOriginal.Serie,
          numero: facturaOriginal.Numero,
          total: facturaOriginal.TotalFactura
        }
      });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}
