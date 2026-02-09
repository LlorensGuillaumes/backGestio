// src/controllers/controllersPersonalizados/stock.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * Registra un movimiento de stock para un producto
 */
export async function registrarMovimientoStock(
  idProducto: number,
  tipo: string,
  cantidad: number,
  stockAnterior: number,
  stockPosterior: number,
  idDocumentoOrigen?: number | null,
  tipoDocumentoOrigen?: string | null,
  observaciones?: string | null,
  idUsuario?: number | null,
  trx?: any
): Promise<void> {
  const query = trx || db;
  await query("MovimientosStock").insert({
    IdProducto: idProducto,
    TipoMovimiento: tipo,
    Cantidad: cantidad,
    StockAnterior: stockAnterior,
    StockPosterior: stockPosterior,
    IdDocumentoOrigen: idDocumentoOrigen ?? null,
    TipoDocumentoOrigen: tipoDocumentoOrigen ?? null,
    Observaciones: observaciones ?? null,
    IdUsuario: idUsuario ?? null,
  });
}

/**
 * GET /productos-stock
 * Lista productos con stock actual y filtros
 */
export async function getProductosStock(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;

    const q = (req.query.q as string)?.trim().toLowerCase() || "";
    const idFamilia = Number(req.query.idFamilia) || null;
    const idSubfamilia = Number(req.query.idSubfamilia) || null;
    const stockBajo = req.query.stockBajo === "1" || req.query.stockBajo === "true";

    let query = db("Productos as p")
      .leftJoin("Marcas as m", "m.IdMarca", "p.IdMarca")
      .where("p.Activo", 1)
      .select(
        "p.IdProducto as id",
        "p.Codigo",
        "p.Nombre",
        "p.Stock",
        "p.StockMinimo",
        "p.IdMarca",
        "m.Descripcion as NombreMarca",
        db.raw(`
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', ps."IdProducto",
              'id_subfamilia', ps."IdSubFamiliaProducto",
              'descripcion', sf."Descripcion",
              'id_familia', sf."IdFamiliaProducto"
            )) FROM "ProductosSubFamilias" ps
            JOIN "SubFamiliasProductos" sf ON sf."IdSubFamiliaProducto" = ps."IdSubFamiliaProducto"
            WHERE ps."IdProducto" = p."IdProducto"),
            '[]'
          ) as subfamilias
        `)
      );

    // Filtro de busqueda
    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(p."Nombre") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(p."Codigo") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(m."Descripcion") LIKE ?', [`%${q}%`]);
      });
    }

    // Filtro por familia
    if (idFamilia) {
      query = query.whereExists(function () {
        this.select(db.raw(1))
          .from("ProductosSubFamilias as ps")
          .join("SubFamiliasProductos as sf", "sf.IdSubFamiliaProducto", "ps.IdSubFamiliaProducto")
          .whereRaw('ps."IdProducto" = p."IdProducto"')
          .where("sf.IdFamiliaProducto", idFamilia);
      });
    }

    // Filtro por subfamilia
    if (idSubfamilia) {
      query = query.whereExists(function () {
        this.select(db.raw(1))
          .from("ProductosSubFamilias as ps")
          .whereRaw('ps."IdProducto" = p."IdProducto"')
          .where("ps.IdSubFamiliaProducto", idSubfamilia);
      });
    }

    // Filtro de stock bajo
    if (stockBajo) {
      query = query.whereRaw('p."Stock" <= p."StockMinimo"');
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("p.IdProducto as total").first();
    const countResult = await countQuery as { total: string };
    const total = Number(countResult?.total ?? 0);

    // Aplicar paginacion y orden
    const rows = await query
      .orderByRaw('CASE WHEN p."Stock" <= p."StockMinimo" THEN 0 ELSE 1 END') // Stock bajo primero
      .orderBy("p.Nombre", "asc")
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
 * GET /movimientos-stock/:idProducto
 * Obtiene el historial de movimientos de stock de un producto
 */
export async function getMovimientosStock(req: Request, res: Response, next: NextFunction) {
  try {
    const idProducto = Number(req.params.idProducto);
    if (!Number.isFinite(idProducto) || idProducto <= 0) {
      return res.status(400).json({ error: "Id de producto invalido" });
    }

    const take = Math.min(Number(req.query.take) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    // Verificar que el producto existe
    const producto = await db("Productos")
      .where("IdProducto", idProducto)
      .select("IdProducto", "Nombre", "Stock")
      .first();

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Obtener movimientos
    const movimientos = await db("MovimientosStock")
      .where("IdProducto", idProducto)
      .orderBy("FechaMovimiento", "desc")
      .orderBy("IdMovimiento", "desc")
      .limit(take)
      .offset(offset)
      .select(
        "IdMovimiento as id",
        "TipoMovimiento",
        "Cantidad",
        "StockAnterior",
        "StockPosterior",
        "FechaMovimiento",
        "IdDocumentoOrigen",
        "TipoDocumentoOrigen",
        "Observaciones"
      );

    // Contar total
    const countResult = await db("MovimientosStock")
      .where("IdProducto", idProducto)
      .count("IdMovimiento as total")
      .first() as { total: string };

    const total = Number(countResult?.total ?? 0);

    res.json({
      producto: {
        id: producto.IdProducto,
        nombre: producto.Nombre,
        stockActual: producto.Stock,
      },
      data: movimientos,
      total,
      take,
      offset,
    });
  } catch (err) {
    next(err);
  }
}
