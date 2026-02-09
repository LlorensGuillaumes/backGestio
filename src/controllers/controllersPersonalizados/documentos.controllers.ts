// src/controllers/controllersPersonalizados/documentos.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { registrarMovimientoStock } from "./stock.controllers.js";

// Helper para obtener IdUsuario para auditoría (null para master)
function getUserId(req: Request): number | null {
  const userId = req.user?.userId;
  return typeof userId === "number" ? userId : null;
}

/**
 * GET /documentos-full
 * Lista documentos con paginación y filtros
 */
export async function getDocumentosFull(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;

    const idCliente = Number(req.query.idCliente) || null;
    const tipo = (req.query.tipo as string)?.trim() || "";
    const estado = (req.query.estado as string)?.trim() || "";
    const q = (req.query.q as string)?.trim().toLowerCase() || "";

    let query = db("Documentos as d")
      .leftJoin("clientes as c", "c.id", "d.IdCliente")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
      .select(
        "d.IdDocumento as id",
        "d.IdCliente",
        "d.Tipo",
        "d.NumeroDocumento",
        "d.Fecha",
        "d.FechaEntrega",
        "d.Estado",
        "d.Total",
        "d.Observaciones",
        db.raw(`COALESCE(cp.nombre, ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`),
        db.raw(`COALESCE(cp.primer_apellido, '') as "ApellidosCliente"`)
      )
      .whereNot("d.Estado", "ANULADO");

    if (idCliente) {
      query = query.where("d.IdCliente", idCliente);
    }

    if (tipo) {
      query = query.where("d.Tipo", tipo);
    }

    if (estado) {
      query = query.where("d.Estado", estado);
    }

    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(d."NumeroDocumento") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(cp.nombre) LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(cp.primer_apellido) LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(ce.razon_social) LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(c.nombre_comercial) LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(d."Observaciones") LIKE ?', [`%${q}%`]);
      });
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("d.IdDocumento as total").first();
    const countResult = await countQuery as { total: string };
    const total = Number(countResult?.total ?? 0);

    // Aplicar paginación
    const rows = await query
      .orderBy("d.Fecha", "desc")
      .limit(take)
      .offset(offset);

    res.json({
      data: rows,
      total,
      take,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /documentos/:id
 * Obtiene un documento con todos sus datos
 */
export async function getDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de documento inválido" });
    }

    const documento = await db("Documentos as d")
      .leftJoin("clientes as c", "c.id", "d.IdCliente")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
      .where("d.IdDocumento", id)
      .select(
        "d.*",
        db.raw(`COALESCE(cp.nombre, ce.razon_social, c.nombre_comercial, '') as "NombreCliente"`),
        db.raw(`COALESCE(cp.primer_apellido, '') as "ApellidosCliente"`),
        db.raw('"IdDocumento" as id')
      )
      .first();

    if (!documento) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    // Cargar líneas y pagos
    const [lineas, pagos] = await Promise.all([
      db("DocumentosLineas")
        .where("IdDocumento", id)
        .orderBy("Orden", "asc")
        .select("*", db.raw('"IdLinea" as id')),
      db("DocumentosPagos")
        .where("IdDocumento", id)
        .where("Activo", 1)
        .orderBy("Fecha", "asc")
        .select("*", db.raw('"IdPago" as id'))
    ]);

    res.json({
      ...documento,
      lineas,
      pagos
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /documentos-post
 * Crea un documento con sus líneas
 */
export async function postDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // Generar número de documento
      const year = new Date().getFullYear();
      const lastDoc = await trx("Documentos")
        .whereRaw(`EXTRACT(YEAR FROM "Fecha") = ?`, [year])
        .orderBy("IdDocumento", "desc")
        .first();

      const lastNum = lastDoc?.NumeroDocumento
        ? parseInt(lastDoc.NumeroDocumento.split("-")[1] || "0", 10)
        : 0;
      const nuevoNumero = `${year}-${String(lastNum + 1).padStart(5, "0")}`;

      // 1. Crear documento base
      const idUsuario = getUserId(req);
      const documentoData: Record<string, any> = {
        IdCliente: input.idCliente || input.IdCliente,
        Tipo: input.tipo || input.Tipo || "PRESUPUESTO",
        NumeroDocumento: nuevoNumero,
        Fecha: input.fecha || input.Fecha || new Date(),
        FechaEntrega: input.fechaEntrega || input.FechaEntrega || null,
        Estado: input.estado || input.Estado || "PENDIENTE",
        Observaciones: input.observaciones || input.Observaciones || null,
        ObservacionesInternas: input.observacionesInternas || input.ObservacionesInternas || null,
        IdUsuario: idUsuario,

        // Graduación OD
        OD_Esfera: input.od_esfera ?? input.OD_Esfera ?? null,
        OD_Cilindro: input.od_cilindro ?? input.OD_Cilindro ?? null,
        OD_Eje: input.od_eje ?? input.OD_Eje ?? null,
        OD_Adicion: input.od_adicion ?? input.OD_Adicion ?? null,
        OD_Prisma: input.od_prisma ?? input.OD_Prisma ?? null,
        OD_BasePrisma: input.od_basePrisma ?? input.OD_BasePrisma ?? null,
        OD_AV: input.od_av ?? input.OD_AV ?? null,
        OD_DNP: input.od_dnp ?? input.OD_DNP ?? null,
        OD_Altura: input.od_altura ?? input.OD_Altura ?? null,

        // Graduación OI
        OI_Esfera: input.oi_esfera ?? input.OI_Esfera ?? null,
        OI_Cilindro: input.oi_cilindro ?? input.OI_Cilindro ?? null,
        OI_Eje: input.oi_eje ?? input.OI_Eje ?? null,
        OI_Adicion: input.oi_adicion ?? input.OI_Adicion ?? null,
        OI_Prisma: input.oi_prisma ?? input.OI_Prisma ?? null,
        OI_BasePrisma: input.oi_basePrisma ?? input.OI_BasePrisma ?? null,
        OI_AV: input.oi_av ?? input.OI_AV ?? null,
        OI_DNP: input.oi_dnp ?? input.OI_DNP ?? null,
        OI_Altura: input.oi_altura ?? input.OI_Altura ?? null,

        DIP_Lejos: input.dip_lejos ?? input.DIP_Lejos ?? null,
        DIP_Cerca: input.dip_cerca ?? input.DIP_Cerca ?? null,

        // Montura
        MonturaModelo: input.monturaModelo ?? input.MonturaModelo ?? null,
        MonturaMarca: input.monturaMarca ?? input.MonturaMarca ?? null,
        MonturaColor: input.monturaColor ?? input.MonturaColor ?? null,
        MonturaTalla: input.monturaTalla ?? input.MonturaTalla ?? null,
        MonturaPrecio: input.monturaPrecio ?? input.MonturaPrecio ?? null,

        // Lentes
        LenteTipo: input.lenteTipo ?? input.LenteTipo ?? null,
        LenteMaterial: input.lenteMaterial ?? input.LenteMaterial ?? null,
        LenteTratamiento: input.lenteTratamiento ?? input.LenteTratamiento ?? null,
        LenteColoracion: input.lenteColoracion ?? input.LenteColoracion ?? null,

        // Validez presupuesto
        ValidezDias: input.validezDias ?? input.ValidezDias ?? null,

        // Totales
        BaseImponible: 0,
        TotalIva: 0,
        TotalDescuento: 0,
        Total: 0,

        FechaCreacion: new Date(),
      };

      const [newDoc] = await trx("Documentos").insert(documentoData).returning("*");
      const docId = newDoc.IdDocumento;

      // 2. Insertar líneas y calcular totales
      let baseImponible = 0;
      let totalIva = 0;
      let totalDescuento = 0;

      if (input.lineas?.length) {
        for (let i = 0; i < input.lineas.length; i++) {
          const l = input.lineas[i];
          const cantidad = Number(l.cantidad || l.Cantidad || 1);
          const precioUnitario = Number(l.precioUnitario || l.PrecioUnitario || 0);
          const descuento = Number(l.descuento || l.Descuento || 0);
          const descuentoImporte = Number(l.descuentoImporte || l.DescuentoImporte || 0);
          const pctIva = Number(l.porcentajeIva || l.PorcentajeIva || 21);

          const subtotalBruto = cantidad * precioUnitario;
          const descuentoTotal = descuentoImporte + (subtotalBruto * descuento / 100);
          const subtotalNeto = subtotalBruto - descuentoTotal;
          const ivaLinea = subtotalNeto * pctIva / 100;

          baseImponible += subtotalNeto;
          totalIva += ivaLinea;
          totalDescuento += descuentoTotal;

          await trx("DocumentosLineas").insert({
            IdDocumento: docId,
            Orden: i + 1,
            Tipo: l.tipo || l.Tipo || "PRODUCTO",
            IdProducto: l.idProducto || l.IdProducto || null,
            Codigo: l.codigo || l.Codigo || null,
            Descripcion: l.descripcion || l.Descripcion || "",
            Cantidad: cantidad,
            PrecioUnitario: precioUnitario,
            Descuento: descuento,
            DescuentoImporte: descuentoImporte,
            IdTipoIva: l.idTipoIva || l.IdTipoIva || 1,
            PorcentajeIva: pctIva,
            Subtotal: subtotalNeto + ivaLinea,
            Observaciones: l.observaciones || l.Observaciones || null,
          });
        }
      }

      // Actualizar totales
      await trx("Documentos").where("IdDocumento", docId).update({
        BaseImponible: baseImponible,
        TotalIva: totalIva,
        TotalDescuento: totalDescuento,
        Total: baseImponible + totalIva,
      });

      await trx.commit();

      // Devolver documento completo
      req.params.id = String(docId);
      return getDocumento(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /documentos-put/:id
 * Actualiza un documento
 */
export async function putDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de documento inválido" });
    }

    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // 1. Actualizar documento base
      const documentoData: Record<string, any> = {
        FechaModificacion: new Date(),
      };

      // Campos actualizables
      const camposSimples = [
        "Tipo", "FechaEntrega", "Estado", "Observaciones", "ObservacionesInternas",
        "PagoACuenta", "ValidezDias",
        "OD_Esfera", "OD_Cilindro", "OD_Eje", "OD_Adicion", "OD_Prisma", "OD_BasePrisma", "OD_AV", "OD_DNP", "OD_Altura",
        "OI_Esfera", "OI_Cilindro", "OI_Eje", "OI_Adicion", "OI_Prisma", "OI_BasePrisma", "OI_AV", "OI_DNP", "OI_Altura",
        "DIP_Lejos", "DIP_Cerca",
        "MonturaModelo", "MonturaMarca", "MonturaColor", "MonturaTalla", "MonturaPrecio",
        "LenteTipo", "LenteMaterial", "LenteTratamiento", "LenteColoracion"
      ];

      for (const campo of camposSimples) {
        const camelCase = campo.charAt(0).toLowerCase() + campo.slice(1);
        if (input[camelCase] !== undefined || input[campo] !== undefined) {
          documentoData[campo] = input[camelCase] ?? input[campo];
        }
      }

      if (Object.keys(documentoData).length > 1) {
        await trx("Documentos").where("IdDocumento", id).update(documentoData);
      }

      // 2. Reemplazar líneas si vienen
      if (input.lineas !== undefined) {
        await trx("DocumentosLineas").where("IdDocumento", id).del();

        let baseImponible = 0;
        let totalIva = 0;
        let totalDescuento = 0;

        if (input.lineas.length) {
          for (let i = 0; i < input.lineas.length; i++) {
            const l = input.lineas[i];
            const cantidad = Number(l.cantidad || l.Cantidad || 1);
            const precioUnitario = Number(l.precioUnitario || l.PrecioUnitario || 0);
            const descuento = Number(l.descuento || l.Descuento || 0);
            const descuentoImporte = Number(l.descuentoImporte || l.DescuentoImporte || 0);
            const pctIva = Number(l.porcentajeIva || l.PorcentajeIva || 21);

            const subtotalBruto = cantidad * precioUnitario;
            const descuentoTotal = descuentoImporte + (subtotalBruto * descuento / 100);
            const subtotalNeto = subtotalBruto - descuentoTotal;
            const ivaLinea = subtotalNeto * pctIva / 100;

            baseImponible += subtotalNeto;
            totalIva += ivaLinea;
            totalDescuento += descuentoTotal;

            await trx("DocumentosLineas").insert({
              IdDocumento: id,
              Orden: i + 1,
              Tipo: l.tipo || l.Tipo || "PRODUCTO",
              IdProducto: l.idProducto || l.IdProducto || null,
              Codigo: l.codigo || l.Codigo || null,
              Descripcion: l.descripcion || l.Descripcion || "",
              Cantidad: cantidad,
              PrecioUnitario: precioUnitario,
              Descuento: descuento,
              DescuentoImporte: descuentoImporte,
              IdTipoIva: l.idTipoIva || l.IdTipoIva || 1,
              PorcentajeIva: pctIva,
              Subtotal: subtotalNeto + ivaLinea,
              Observaciones: l.observaciones || l.Observaciones || null,
            });
          }
        }

        // Actualizar totales
        await trx("Documentos").where("IdDocumento", id).update({
          BaseImponible: baseImponible,
          TotalIva: totalIva,
          TotalDescuento: totalDescuento,
          Total: baseImponible + totalIva,
        });
      }

      await trx.commit();

      return getDocumento(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Descuenta stock de los productos de un documento
 * Solo procesa líneas de tipo PRODUCTO, LENTE o MONTURA con IdProducto
 */
async function descontarStockDocumento(
  idDocumento: number,
  trx: any
): Promise<{ idProducto: number; cantidad: number; stockAnterior: number; stockPosterior: number }[]> {
  // Cargar líneas con productos (solo tipos que manejan stock)
  const lineas = await trx("DocumentosLineas")
    .where("IdDocumento", idDocumento)
    .whereNotNull("IdProducto")
    .whereIn("Tipo", ["PRODUCTO", "LENTE", "MONTURA"])
    .select("IdLinea", "IdProducto", "Cantidad", "Descripcion");

  const resultados: { idProducto: number; cantidad: number; stockAnterior: number; stockPosterior: number }[] = [];

  for (const linea of lineas) {
    const cantidad = Math.floor(Number(linea.Cantidad) || 0);
    if (cantidad <= 0) continue;

    // Obtener stock actual del producto
    const producto = await trx("Productos")
      .where("IdProducto", linea.IdProducto)
      .select("Stock")
      .first();

    const stockAnterior = producto?.Stock ?? 0;
    const stockPosterior = stockAnterior - cantidad;

    // Actualizar stock del producto (permite negativo)
    await trx("Productos")
      .where("IdProducto", linea.IdProducto)
      .update({ Stock: stockPosterior });

    // Registrar movimiento de stock
    await registrarMovimientoStock(
      linea.IdProducto,
      "SALIDA_VENTA",
      cantidad,
      stockAnterior,
      stockPosterior,
      idDocumento,
      "DOCUMENTO",
      `Venta - ${linea.Descripcion || "Sin descripción"}`,
      null,
      trx
    );

    resultados.push({
      idProducto: linea.IdProducto,
      cantidad,
      stockAnterior,
      stockPosterior,
    });
  }

  return resultados;
}

/**
 * PUT /documentos/:id/estado
 * Cambia el estado de un documento
 * Si pasa de PENDIENTE a CONFIRMADO, descuenta stock de los productos
 */
export async function cambiarEstadoDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de documento inválido" });
    }

    const { estado } = req.body;
    const estadosValidos = ["PENDIENTE", "CONFIRMADO", "EN_PROCESO", "LISTO", "ENTREGADO", "ANULADO"];

    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado no válido" });
    }

    // Obtener estado actual del documento
    const docActual = await db("Documentos")
      .where("IdDocumento", id)
      .select("Estado")
      .first();

    if (!docActual) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    const estadoAnterior = docActual.Estado;

    // Si pasa de PENDIENTE a CONFIRMADO, descontar stock
    if (estadoAnterior === "PENDIENTE" && estado === "CONFIRMADO") {
      const trx = await db.transaction();
      try {
        // Descontar stock de productos
        await descontarStockDocumento(id, trx);

        // Actualizar estado del documento
        await trx("Documentos")
          .where("IdDocumento", id)
          .update({
            Estado: estado,
            FechaModificacion: new Date(),
          });

        await trx.commit();

        // Devolver documento actualizado
        return getDocumento(req, res, next);
      } catch (err) {
        await trx.rollback();
        throw err;
      }
    } else {
      // Cambio de estado normal sin afectar stock
      await db("Documentos").where("IdDocumento", id).update({
        Estado: estado,
        FechaModificacion: new Date(),
      });

      return getDocumento(req, res, next);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * POST /documentos/:id/pagos
 * Añade un pago a un documento
 */
export async function addPagoDocumento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de documento inválido" });
    }

    const input = req.body;

    await db("DocumentosPagos").insert({
      IdDocumento: id,
      Fecha: input.fecha || input.Fecha || new Date(),
      Importe: Number(input.importe || input.Importe || 0),
      FormaPago: input.formaPago || input.FormaPago || "EFECTIVO",
      Referencia: input.referencia || input.Referencia || null,
      Observaciones: input.observaciones || input.Observaciones || null,
      Activo: 1,
    });

    return getDocumento(req, res, next);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /clientes/:id/documentos
 * Obtiene los documentos de un cliente
 */
export async function getClienteDocumentos(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.params.id);
    if (!Number.isFinite(idCliente) || idCliente <= 0) {
      return res.status(400).json({ error: "Id de cliente inválido" });
    }

    const rows = await db("Documentos")
      .where("IdCliente", idCliente)
      .whereNot("Estado", "ANULADO")
      .select(
        db.raw('"IdDocumento" as id'),
        "Tipo",
        "NumeroDocumento",
        "Fecha",
        "FechaEntrega",
        "Estado",
        "Total",
        "Observaciones"
      )
      .orderBy("Fecha", "desc");

    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}
