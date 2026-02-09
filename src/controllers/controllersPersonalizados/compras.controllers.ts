// src/controllers/controllersPersonalizados/compras.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { registrarMovimientoStock } from "./stock.controllers.js";
import { getVeriFactuConfig, enviarFacturaCompra } from "../../services/verifactu.service.js";

// =============================================
// ORDENES DE COMPRA
// =============================================

/**
 * GET /compras/ordenes
 * Lista ordenes de compra con filtros y datos de proveedor
 */
export async function getOrdenesCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;

    const idProveedor = Number(req.query.idProveedor) || null;
    const estado = (req.query.estado as string)?.trim() || "";
    const q = (req.query.q as string)?.trim().toLowerCase() || "";

    let query = db("ComprasOrdenes as o")
      .leftJoin("Proveedores as p", "p.IdProveedor", "o.IdProveedor")
      .select(
        "o.IdOrdenCompra as id",
        "o.NumeroOrden",
        "o.IdProveedor",
        "o.FechaOrden",
        "o.FechaEntregaPrevista",
        "o.Estado",
        "o.Total",
        "o.Observaciones",
        "p.NombreComercial as NombreProveedor"
      )
      .whereNot("o.Estado", "ANULADA");

    if (idProveedor) {
      query = query.where("o.IdProveedor", idProveedor);
    }

    if (estado) {
      query = query.where("o.Estado", estado);
    }

    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(o."NumeroOrden") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(p."NombreComercial") LIKE ?', [`%${q}%`]);
      });
    }

    const countQuery = query.clone().clearSelect().count("o.IdOrdenCompra as total").first();
    const countResult = await countQuery as { total: string };
    const total = Number(countResult?.total ?? 0);

    const rows = await query
      .orderBy("o.FechaOrden", "desc")
      .limit(take)
      .offset(offset);

    res.json({ data: rows, total, take, offset });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /compras/ordenes/:id
 * Obtiene una orden con sus lineas
 */
export async function getOrdenCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de orden invalido" });
    }

    const orden = await db("ComprasOrdenes as o")
      .leftJoin("Proveedores as p", "p.IdProveedor", "o.IdProveedor")
      .where("o.IdOrdenCompra", id)
      .select("o.*", "p.NombreComercial as NombreProveedor", db.raw('"IdOrdenCompra" as id'))
      .first();

    if (!orden) {
      return res.status(404).json({ error: "Orden no encontrada" });
    }

    const lineas = await db("ComprasOrdenesLineas")
      .where("IdOrdenCompra", id)
      .whereNot("EstadoLinea", "ANULADA")
      .orderBy("Orden", "asc")
      .select("*", db.raw('"IdOrdenLinea" as id'));

    res.json({ ...orden, lineas });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /compras/ordenes
 * Crea una orden de compra con sus lineas
 */
export async function postOrdenCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body;
    const trx = await db.transaction();

    try {
      // Generar numero de orden
      const year = new Date().getFullYear();
      const lastOrden = await trx("ComprasOrdenes")
        .whereRaw(`EXTRACT(YEAR FROM "FechaOrden") = ?`, [year])
        .orderBy("IdOrdenCompra", "desc")
        .first();

      const lastNum = lastOrden?.NumeroOrden
        ? parseInt(lastOrden.NumeroOrden.split("-")[1] || "0", 10)
        : 0;
      const nuevoNumero = `OC${year}-${String(lastNum + 1).padStart(5, "0")}`;

      // Crear orden
      const ordenData = {
        NumeroOrden: nuevoNumero,
        IdProveedor: input.idProveedor || input.IdProveedor,
        FechaOrden: input.fechaOrden || input.FechaOrden || new Date(),
        FechaEntregaPrevista: input.fechaEntregaPrevista || input.FechaEntregaPrevista || null,
        Estado: input.estado || input.Estado || "BORRADOR",
        Observaciones: input.observaciones || input.Observaciones || null,
        ObservacionesInternas: input.observacionesInternas || input.ObservacionesInternas || null,
        BaseImponible: 0,
        TotalIva: 0,
        TotalDescuento: 0,
        Total: 0,
        FechaCreacion: new Date(),
      };

      const [newOrden] = await trx("ComprasOrdenes").insert(ordenData).returning("*");
      const ordenId = newOrden.IdOrdenCompra;

      // Insertar lineas y calcular totales
      let baseImponible = 0;
      let totalIva = 0;
      let totalDescuento = 0;

      if (input.lineas?.length) {
        for (let i = 0; i < input.lineas.length; i++) {
          const l = input.lineas[i];
          const cantidad = Number(l.cantidadPedida || l.CantidadPedida || 1);
          const precioUnitario = Number(l.precioUnitario || l.PrecioUnitario || 0);
          const descuento = Number(l.descuento || l.Descuento || 0);
          const pctIva = Number(l.porcentajeIva || l.PorcentajeIva || 21);

          const subtotalBruto = cantidad * precioUnitario;
          const descuentoImporte = subtotalBruto * descuento / 100;
          const subtotalNeto = subtotalBruto - descuentoImporte;
          const ivaLinea = subtotalNeto * pctIva / 100;

          baseImponible += subtotalNeto;
          totalIva += ivaLinea;
          totalDescuento += descuentoImporte;

          await trx("ComprasOrdenesLineas").insert({
            IdOrdenCompra: ordenId,
            Orden: i + 1,
            IdProducto: l.idProducto || l.IdProducto || null,
            Codigo: l.codigo || l.Codigo || null,
            Descripcion: l.descripcion || l.Descripcion || "",
            CantidadPedida: cantidad,
            CantidadRecibida: 0,
            PrecioUnitario: precioUnitario,
            Descuento: descuento,
            PorcentajeIva: pctIva,
            Subtotal: subtotalNeto + ivaLinea,
            EstadoLinea: "PENDIENTE",
            Observaciones: l.observaciones || l.Observaciones || null,
          });
        }
      }

      // Actualizar totales
      await trx("ComprasOrdenes").where("IdOrdenCompra", ordenId).update({
        BaseImponible: baseImponible,
        TotalIva: totalIva,
        TotalDescuento: totalDescuento,
        Total: baseImponible + totalIva,
      });

      await trx.commit();

      req.params.id = String(ordenId);
      return getOrdenCompra(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /compras/ordenes/:id
 * Actualiza una orden de compra
 */
export async function putOrdenCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de orden invalido" });
    }

    const input = req.body;
    const trx = await db.transaction();

    try {
      // Actualizar orden
      const ordenData: Record<string, any> = {
        FechaModificacion: new Date(),
      };

      const campos = [
        "IdProveedor", "FechaOrden", "FechaEntregaPrevista", "Estado",
        "Observaciones", "ObservacionesInternas"
      ];

      for (const campo of campos) {
        const camelCase = campo.charAt(0).toLowerCase() + campo.slice(1);
        if (input[camelCase] !== undefined || input[campo] !== undefined) {
          ordenData[campo] = input[camelCase] ?? input[campo];
        }
      }

      if (Object.keys(ordenData).length > 1) {
        await trx("ComprasOrdenes").where("IdOrdenCompra", id).update(ordenData);
      }

      // Reemplazar lineas si vienen
      if (input.lineas !== undefined) {
        await trx("ComprasOrdenesLineas").where("IdOrdenCompra", id).del();

        let baseImponible = 0;
        let totalIva = 0;
        let totalDescuento = 0;

        for (let i = 0; i < input.lineas.length; i++) {
          const l = input.lineas[i];
          const cantidad = Number(l.cantidadPedida || l.CantidadPedida || 1);
          const precioUnitario = Number(l.precioUnitario || l.PrecioUnitario || 0);
          const descuento = Number(l.descuento || l.Descuento || 0);
          const pctIva = Number(l.porcentajeIva || l.PorcentajeIva || 21);

          const subtotalBruto = cantidad * precioUnitario;
          const descuentoImporte = subtotalBruto * descuento / 100;
          const subtotalNeto = subtotalBruto - descuentoImporte;
          const ivaLinea = subtotalNeto * pctIva / 100;

          baseImponible += subtotalNeto;
          totalIva += ivaLinea;
          totalDescuento += descuentoImporte;

          await trx("ComprasOrdenesLineas").insert({
            IdOrdenCompra: id,
            Orden: i + 1,
            IdProducto: l.idProducto || l.IdProducto || null,
            Codigo: l.codigo || l.Codigo || null,
            Descripcion: l.descripcion || l.Descripcion || "",
            CantidadPedida: cantidad,
            CantidadRecibida: l.cantidadRecibida || l.CantidadRecibida || 0,
            PrecioUnitario: precioUnitario,
            Descuento: descuento,
            PorcentajeIva: pctIva,
            Subtotal: subtotalNeto + ivaLinea,
            EstadoLinea: l.estadoLinea || l.EstadoLinea || "PENDIENTE",
            Observaciones: l.observaciones || l.Observaciones || null,
          });
        }

        await trx("ComprasOrdenes").where("IdOrdenCompra", id).update({
          BaseImponible: baseImponible,
          TotalIva: totalIva,
          TotalDescuento: totalDescuento,
          Total: baseImponible + totalIva,
        });
      }

      await trx.commit();
      return getOrdenCompra(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

// =============================================
// RECEPCIONES DE COMPRA (ALBARANES)
// =============================================

/**
 * GET /compras/recepciones
 * Lista recepciones con filtros
 */
export async function getRecepcionesCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;

    const idProveedor = Number(req.query.idProveedor) || null;
    const idOrdenCompra = Number(req.query.idOrdenCompra) || null;
    const estado = (req.query.estado as string)?.trim() || "";
    const q = (req.query.q as string)?.trim().toLowerCase() || "";

    let query = db("ComprasRecepciones as r")
      .leftJoin("Proveedores as p", "p.IdProveedor", "r.IdProveedor")
      .leftJoin("ComprasOrdenes as o", "o.IdOrdenCompra", "r.IdOrdenCompra")
      .select(
        "r.IdRecepcionCompra as id",
        "r.NumeroRecepcion",
        "r.IdOrdenCompra",
        "o.NumeroOrden",
        "r.IdProveedor",
        "r.NumeroAlbaranProveedor",
        "r.FechaRecepcion",
        "r.Estado",
        "r.Total",
        "p.NombreComercial as NombreProveedor"
      )
      .whereNot("r.Estado", "ANULADA");

    if (idProveedor) {
      query = query.where("r.IdProveedor", idProveedor);
    }

    if (idOrdenCompra) {
      query = query.where("r.IdOrdenCompra", idOrdenCompra);
    }

    if (estado) {
      query = query.where("r.Estado", estado);
    }

    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(r."NumeroRecepcion") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(r."NumeroAlbaranProveedor") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(p."NombreComercial") LIKE ?', [`%${q}%`]);
      });
    }

    const countQuery = query.clone().clearSelect().count("r.IdRecepcionCompra as total").first();
    const countResult = await countQuery as { total: string };
    const total = Number(countResult?.total ?? 0);

    const rows = await query
      .orderBy("r.FechaRecepcion", "desc")
      .limit(take)
      .offset(offset);

    res.json({ data: rows, total, take, offset });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /compras/recepciones/:id
 * Obtiene una recepcion con sus lineas
 */
export async function getRecepcionCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de recepcion invalido" });
    }

    const recepcion = await db("ComprasRecepciones as r")
      .leftJoin("Proveedores as p", "p.IdProveedor", "r.IdProveedor")
      .leftJoin("ComprasOrdenes as o", "o.IdOrdenCompra", "r.IdOrdenCompra")
      .where("r.IdRecepcionCompra", id)
      .select("r.*", "p.NombreComercial as NombreProveedor", "o.NumeroOrden", db.raw('"IdRecepcionCompra" as id'))
      .first();

    if (!recepcion) {
      return res.status(404).json({ error: "Recepcion no encontrada" });
    }

    const lineas = await db("ComprasRecepcionesLineas")
      .where("IdRecepcionCompra", id)
      .orderBy("Orden", "asc")
      .select("*", db.raw('"IdRecepcionLinea" as id'));

    res.json({ ...recepcion, lineas });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /compras/recepciones
 * Crea una recepcion y aumenta el stock de los productos
 */
export async function postRecepcionCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body;
    const trx = await db.transaction();

    try {
      // Generar numero de recepcion
      const year = new Date().getFullYear();
      const lastRec = await trx("ComprasRecepciones")
        .whereRaw(`EXTRACT(YEAR FROM "FechaRecepcion") = ?`, [year])
        .orderBy("IdRecepcionCompra", "desc")
        .first();

      const lastNum = lastRec?.NumeroRecepcion
        ? parseInt(lastRec.NumeroRecepcion.split("-")[1] || "0", 10)
        : 0;
      const nuevoNumero = `REC${year}-${String(lastNum + 1).padStart(5, "0")}`;

      // Crear recepcion
      const recepcionData = {
        NumeroRecepcion: nuevoNumero,
        IdOrdenCompra: input.idOrdenCompra || input.IdOrdenCompra || null,
        IdProveedor: input.idProveedor || input.IdProveedor,
        NumeroAlbaranProveedor: input.numeroAlbaranProveedor || input.NumeroAlbaranProveedor || null,
        FechaRecepcion: input.fechaRecepcion || input.FechaRecepcion || new Date(),
        Estado: "PENDIENTE",
        Observaciones: input.observaciones || input.Observaciones || null,
        BaseImponible: 0,
        TotalIva: 0,
        Total: 0,
        FechaCreacion: new Date(),
      };

      const [newRec] = await trx("ComprasRecepciones").insert(recepcionData).returning("*");
      const recepcionId = newRec.IdRecepcionCompra;

      // Insertar lineas y aumentar stock
      let baseImponible = 0;
      let totalIva = 0;

      if (input.lineas?.length) {
        for (let i = 0; i < input.lineas.length; i++) {
          const l = input.lineas[i];
          const cantidad = Number(l.cantidadRecibida || l.CantidadRecibida || 1);
          const precioUnitario = Number(l.precioUnitario || l.PrecioUnitario || 0);
          const descuento = Number(l.descuento || l.Descuento || 0);
          const pctIva = Number(l.porcentajeIva || l.PorcentajeIva || 21);
          const idProducto = l.idProducto || l.IdProducto || null;

          const subtotalBruto = cantidad * precioUnitario;
          const descuentoImporte = subtotalBruto * descuento / 100;
          const subtotalNeto = subtotalBruto - descuentoImporte;
          const ivaLinea = subtotalNeto * pctIva / 100;

          baseImponible += subtotalNeto;
          totalIva += ivaLinea;

          await trx("ComprasRecepcionesLineas").insert({
            IdRecepcionCompra: recepcionId,
            IdOrdenLinea: l.idOrdenLinea || l.IdOrdenLinea || null,
            Orden: i + 1,
            IdProducto: idProducto,
            Codigo: l.codigo || l.Codigo || null,
            Descripcion: l.descripcion || l.Descripcion || "",
            CantidadRecibida: cantidad,
            CantidadFacturada: 0,
            PrecioUnitario: precioUnitario,
            Descuento: descuento,
            PorcentajeIva: pctIva,
            Subtotal: subtotalNeto + ivaLinea,
            Observaciones: l.observaciones || l.Observaciones || null,
          });

          // AUMENTAR STOCK si tiene producto asociado
          if (idProducto && cantidad > 0) {
            const producto = await trx("Productos")
              .where("IdProducto", idProducto)
              .select("Stock")
              .first();

            const stockAnterior = producto?.Stock ?? 0;
            const stockPosterior = stockAnterior + Math.floor(cantidad);

            await trx("Productos")
              .where("IdProducto", idProducto)
              .update({ Stock: stockPosterior });

            // Registrar movimiento de stock
            await registrarMovimientoStock(
              idProducto,
              "ENTRADA_COMPRA",
              Math.floor(cantidad),
              stockAnterior,
              stockPosterior,
              recepcionId,
              "RECEPCION",
              `Recepcion ${nuevoNumero} - ${l.descripcion || l.Descripcion || ""}`,
              null,
              trx
            );
          }

          // Actualizar cantidad recibida en la linea de orden si viene de una orden
          if (l.idOrdenLinea || l.IdOrdenLinea) {
            const idOrdenLinea = l.idOrdenLinea || l.IdOrdenLinea;
            await trx("ComprasOrdenesLineas")
              .where("IdOrdenLinea", idOrdenLinea)
              .increment("CantidadRecibida", cantidad);

            // Actualizar estado de la linea de orden
            const lineaOrden = await trx("ComprasOrdenesLineas")
              .where("IdOrdenLinea", idOrdenLinea)
              .select("CantidadPedida", "CantidadRecibida")
              .first();

            if (lineaOrden) {
              const nuevoEstado = lineaOrden.CantidadRecibida >= lineaOrden.CantidadPedida
                ? "RECIBIDA"
                : "PARCIAL";
              await trx("ComprasOrdenesLineas")
                .where("IdOrdenLinea", idOrdenLinea)
                .update({ EstadoLinea: nuevoEstado });
            }
          }
        }
      }

      // Actualizar totales de recepcion
      await trx("ComprasRecepciones").where("IdRecepcionCompra", recepcionId).update({
        BaseImponible: baseImponible,
        TotalIva: totalIva,
        Total: baseImponible + totalIva,
      });

      // Si viene de una orden, actualizar estado de la orden
      if (input.idOrdenCompra || input.IdOrdenCompra) {
        const idOrden = input.idOrdenCompra || input.IdOrdenCompra;
        const lineasOrden = await trx("ComprasOrdenesLineas")
          .where("IdOrdenCompra", idOrden)
          .whereNot("EstadoLinea", "ANULADA")
          .select("EstadoLinea");

        const todasRecibidas = lineasOrden.every((l: any) => l.EstadoLinea === "RECIBIDA");
        const algunaParcial = lineasOrden.some((l: any) =>
          l.EstadoLinea === "PARCIAL" || l.EstadoLinea === "RECIBIDA"
        );

        const nuevoEstadoOrden = todasRecibidas ? "RECIBIDA" : algunaParcial ? "PARCIAL" : "ENVIADA";
        await trx("ComprasOrdenes")
          .where("IdOrdenCompra", idOrden)
          .update({ Estado: nuevoEstadoOrden, FechaModificacion: new Date() });
      }

      await trx.commit();

      req.params.id = String(recepcionId);
      return getRecepcionCompra(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

// =============================================
// FACTURAS DE COMPRA
// =============================================

/**
 * GET /compras/facturas/:id
 * Obtiene una factura de compra con sus lineas
 */
export async function getFacturaCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de factura invalido" });
    }

    const factura = await db("FacturasCompra as f")
      .leftJoin("Proveedores as p", "p.IdProveedor", "f.IdProveedor")
      .where("f.IdFacturaCompra", id)
      .select("f.*", "p.NombreComercial as NombreProveedor", db.raw('"IdFacturaCompra" as id'))
      .first();

    if (!factura) {
      return res.status(404).json({ error: "Factura no encontrada" });
    }

    const lineas = await db("FacturasCompraLineas")
      .where("IdFacturaCompra", id)
      .orderBy("Orden", "asc")
      .select("*", db.raw('"IdFacturaCompraLinea" as id'));

    const resumenIva = await db("FacturasCompraResumenIva")
      .where("IdFacturaCompra", id)
      .select("*");

    const pagos = await db("PagosProveedor")
      .where("IdFacturaCompra", id)
      .where("Activo", 1)
      .orderBy("FechaPago", "desc")
      .select("*", db.raw('"IdPagoProveedor" as id'));

    res.json({ ...factura, lineas, resumenIva, pagos });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /compras/facturas
 * Crea una factura de compra
 */
export async function postFacturaCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body;
    const trx = await db.transaction();

    try {
      // Crear factura
      const facturaData = {
        SerieFactura: input.serieFactura || input.SerieFactura || null,
        NumeroFactura: input.numeroFactura || input.NumeroFactura,
        IdProveedor: input.idProveedor || input.IdProveedor,
        FechaFactura: input.fechaFactura || input.FechaFactura,
        FechaRecepcion: input.fechaRecepcion || input.FechaRecepcion || new Date(),
        FechaVencimiento: input.fechaVencimiento || input.FechaVencimiento || null,
        Estado: "PENDIENTE",
        Observaciones: input.observaciones || input.Observaciones || null,
        IdFamiliaGasto: input.idFamiliaGasto || input.IdFamiliaGasto || null,
        IdSubFamiliaGasto: input.idSubFamiliaGasto || input.IdSubFamiliaGasto || null,
        TotalBaseImponible: 0,
        TotalDescuento: 0,
        TotalCuotaIva: 0,
        TotalRetencion: input.totalRetencion || input.TotalRetencion || 0,
        TotalFactura: 0,
        ImportePagado: 0,
        ImportePendiente: 0,
        FechaCreacion: new Date(),
      };

      const [newFact] = await trx("FacturasCompra").insert(facturaData).returning("*");
      const facturaId = newFact.IdFacturaCompra;

      // Insertar lineas y calcular totales
      let totalBase = 0;
      let totalDescuento = 0;
      let totalIva = 0;
      const resumenIvaPorTipo: Record<number, { base: number; cuota: number }> = {};

      if (input.lineas?.length) {
        for (let i = 0; i < input.lineas.length; i++) {
          const l = input.lineas[i];
          const cantidad = Number(l.cantidad || l.Cantidad || 1);
          const precioUnitario = Number(l.precioUnitario || l.PrecioUnitario || 0);
          const pcDescuento = Number(l.pcDescuento || l.PcDescuento || 0);
          const pcIva = Number(l.pcIva || l.PcIva || 21);

          const importeBruto = cantidad * precioUnitario;
          const importeDescuento = importeBruto * pcDescuento / 100;
          const baseImporte = importeBruto - importeDescuento;
          const importeIva = baseImporte * pcIva / 100;
          const importeLinea = baseImporte + importeIva;

          totalBase += baseImporte;
          totalDescuento += importeDescuento;
          totalIva += importeIva;

          // Acumular por tipo de IVA
          if (!resumenIvaPorTipo[pcIva]) {
            resumenIvaPorTipo[pcIva] = { base: 0, cuota: 0 };
          }
          resumenIvaPorTipo[pcIva].base += baseImporte;
          resumenIvaPorTipo[pcIva].cuota += importeIva;

          await trx("FacturasCompraLineas").insert({
            IdFacturaCompra: facturaId,
            Orden: i + 1,
            IdProducto: l.idProducto || l.IdProducto || null,
            CodigoItem: l.codigoItem || l.CodigoItem || null,
            DescripcionItem: l.descripcionItem || l.DescripcionItem || "",
            Cantidad: cantidad,
            PrecioUnitario: precioUnitario,
            PcDescuento: pcDescuento,
            ImporteDescuento: importeDescuento,
            BaseImporte: baseImporte,
            PcIva: pcIva,
            ImporteIva: importeIva,
            ImporteLinea: importeLinea,
            Observaciones: l.observaciones || l.Observaciones || null,
          });
        }
      }

      // Insertar resumen de IVA
      for (const [pcIva, datos] of Object.entries(resumenIvaPorTipo)) {
        await trx("FacturasCompraResumenIva").insert({
          IdFacturaCompra: facturaId,
          PorcentajeIva: Number(pcIva),
          BaseImponible: datos.base,
          CuotaIva: datos.cuota,
        });
      }

      // Actualizar totales
      const totalRetencion = Number(input.totalRetencion || input.TotalRetencion || 0);
      const totalFactura = totalBase + totalIva - totalRetencion;

      await trx("FacturasCompra").where("IdFacturaCompra", facturaId).update({
        TotalBaseImponible: totalBase,
        TotalDescuento: totalDescuento,
        TotalCuotaIva: totalIva,
        TotalFactura: totalFactura,
        ImportePendiente: totalFactura,
      });

      // Si vienen recepciones asociadas, marcarlas como facturadas
      const idRecepcionesAFacturar: number[] = [];

      // Soportar tanto idRecepcion (singular) como idRecepciones (array)
      const idRecepcionSingular = input.idRecepcion || input.IdRecepcion;
      if (idRecepcionSingular) {
        idRecepcionesAFacturar.push(Number(idRecepcionSingular));
      }

      if (input.idRecepciones?.length) {
        idRecepcionesAFacturar.push(...input.idRecepciones.map((id: any) => Number(id)));
      }

      if (idRecepcionesAFacturar.length > 0) {
        await trx("ComprasRecepciones")
          .whereIn("IdRecepcionCompra", idRecepcionesAFacturar)
          .update({ Estado: "FACTURADA", FechaModificacion: new Date() });
      }

      await trx.commit();

      // VeriFactu: envío automático si está configurado
      getVeriFactuConfig()
        .then((config) => {
          if (config?.ModoActivo && config?.EnvioAutomatico) {
            enviarFacturaCompra(facturaId).catch((err) =>
              console.error("VeriFactu auto-envio compra error:", err.message)
            );
          }
        })
        .catch((err) => console.error("VeriFactu config error:", err.message));

      req.params.id = String(facturaId);
      return getFacturaCompra(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /compras/facturas/:id/pagos
 * Registra un pago de factura de compra
 */
export async function addPagoFacturaCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de factura invalido" });
    }

    const input = req.body;
    const trx = await db.transaction();

    try {
      // Obtener factura
      const factura = await trx("FacturasCompra")
        .where("IdFacturaCompra", id)
        .select("IdProveedor", "TotalFactura", "ImportePagado")
        .first();

      if (!factura) {
        await trx.rollback();
        return res.status(404).json({ error: "Factura no encontrada" });
      }

      const importe = Number(input.importe || input.Importe || 0);

      // Insertar pago
      await trx("PagosProveedor").insert({
        IdFacturaCompra: id,
        IdProveedor: factura.IdProveedor,
        FechaPago: input.fechaPago || input.FechaPago || new Date(),
        Importe: importe,
        FormaPago: input.formaPago || input.FormaPago || "TRANSFERENCIA",
        Referencia: input.referencia || input.Referencia || null,
        NumeroCuenta: input.numeroCuenta || input.NumeroCuenta || null,
        Observaciones: input.observaciones || input.Observaciones || null,
        Activo: 1,
      });

      // Actualizar importes de factura
      const nuevoImportePagado = (factura.ImportePagado || 0) + importe;
      const nuevoImportePendiente = factura.TotalFactura - nuevoImportePagado;
      const nuevoEstado = nuevoImportePendiente <= 0 ? "PAGADA" : nuevoImportePagado > 0 ? "PARCIAL" : "PENDIENTE";

      await trx("FacturasCompra").where("IdFacturaCompra", id).update({
        ImportePagado: nuevoImportePagado,
        ImportePendiente: Math.max(0, nuevoImportePendiente),
        Estado: nuevoEstado,
        FechaModificacion: new Date(),
      });

      await trx.commit();

      return getFacturaCompra(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

// =============================================
// PROVEEDORES - HELPERS
// =============================================

/**
 * GET /proveedores-lookup
 * Lista proveedores para selects (simplificado)
 */
export async function getProveedoresLookup(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db("Proveedores")
      .where("Activo", 1)
      .select(
        "IdProveedor as id",
        db.raw('COALESCE("NombreComercial", "Nombre") as nombre'),
        "NIF as CIF"
      )
      .orderBy(db.raw('COALESCE("NombreComercial", "Nombre")'), "asc");

    res.json(rows);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /compras/ordenes-pendientes/:idProveedor
 * Obtiene ordenes de compra pendientes de un proveedor (BORRADOR, ENVIADA, PARCIAL)
 */
export async function getOrdenesPendientesProveedor(req: Request, res: Response, next: NextFunction) {
  try {
    const idProveedor = Number(req.params.idProveedor);
    if (!Number.isFinite(idProveedor) || idProveedor <= 0) {
      return res.status(400).json({ error: "Id de proveedor invalido" });
    }

    const ordenes = await db("ComprasOrdenes as o")
      .where("o.IdProveedor", idProveedor)
      .whereNotIn("o.Estado", ["RECIBIDA", "ANULADA"]) // Todas excepto las completadas y anuladas
      .select(
        "o.IdOrdenCompra as id",
        "o.NumeroOrden",
        "o.FechaOrden",
        "o.Estado",
        "o.Total"
      )
      .orderBy("o.FechaOrden", "desc");

    // Para cada orden, obtener las lineas pendientes de recibir
    for (const orden of ordenes) {
      const lineas = await db("ComprasOrdenesLineas")
        .where("IdOrdenCompra", orden.id)
        .whereNot("EstadoLinea", "ANULADA")
        .whereRaw('"CantidadRecibida" < "CantidadPedida"')
        .select(
          "IdOrdenLinea as id",
          "IdProducto",
          "Codigo",
          "Descripcion",
          "CantidadPedida",
          "CantidadRecibida",
          "PrecioUnitario",
          "Descuento",
          "PorcentajeIva",
          "EstadoLinea"
        );
      (orden as any).lineas = lineas;
    }

    res.json(ordenes);
  } catch (err) {
    next(err);
  }
}
