// src/controllers/controllersPersonalizados/productos.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { registrarMovimientoStock } from "./stock.controllers.js";
import { verificarStockDespuesMovimiento } from "../../services/stockAlerts.service.js";

/**
 * GET /productos-full
 * Lista productos con paginación y filtros
 */
export async function getProductosFull(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;
    const soloActivos = req.query.soloActivos !== "0";

    const q = (req.query.q as string)?.trim().toLowerCase() || "";
    const codigo = (req.query.codigo as string)?.trim().toLowerCase() || "";
    const idMarca = Number(req.query.idMarca) || null;
    const idFamilia = Number(req.query.idFamilia) || null;
    const idSubfamilia = Number(req.query.idSubfamilia) || null;

    let query = db("Productos as p")
      .leftJoin("Marcas as m", "m.IdMarca", "p.IdMarca")
      .select(
        "p.IdProducto as id",
        "p.Codigo",
        "p.Nombre",
        "p.PVP",
        "p.PrecioCoste",
        "p.Stock",
        "p.IdMarca",
        "p.Activo",
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
        `),
        db.raw(`
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', pp."IdProductoProveedor",
              'id_proveedor', pp."IdProveedor",
              'nombre_proveedor', prov."Nombre",
              'referencia', pp."ReferenciaProveedor",
              'precio', pp."PrecioProveedor"
            )) FROM "ProductosProveedores" pp
            JOIN "Proveedores" prov ON prov."IdProveedor" = pp."IdProveedor"
            WHERE pp."IdProducto" = p."IdProducto" AND pp."Activo" = 1),
            '[]'
          ) as proveedores
        `)
      );

    if (soloActivos) {
      query = query.where("p.Activo", 1);
    }

    // Filtros
    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(p."Nombre") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(p."Codigo") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(m."Descripcion") LIKE ?', [`%${q}%`]);
      });
    }

    if (codigo) {
      query = query.whereRaw('LOWER(p."Codigo") LIKE ?', [`%${codigo}%`]);
    }

    if (idMarca) {
      query = query.where("p.IdMarca", idMarca);
    }

    if (idFamilia) {
      query = query.whereExists(function () {
        this.select(db.raw(1))
          .from("ProductosSubFamilias as ps")
          .join("SubFamiliasProductos as sf", "sf.IdSubFamiliaProducto", "ps.IdSubFamiliaProducto")
          .whereRaw('ps."IdProducto" = p."IdProducto"')
          .where("sf.IdFamiliaProducto", idFamilia);
      });
    }

    if (idSubfamilia) {
      query = query.whereExists(function () {
        this.select(db.raw(1))
          .from("ProductosSubFamilias as ps")
          .whereRaw('ps."IdProducto" = p."IdProducto"')
          .where("ps.IdSubFamiliaProducto", idSubfamilia);
      });
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("p.IdProducto as total").first();
    const [{ total }] = await Promise.all([countQuery]).then(([c]) => [c as { total: string }]);

    // Aplicar paginación
    const rows = await query
      .orderBy("p.Nombre", "asc")
      .limit(take)
      .offset(offset);

    res.json({
      data: rows,
      total: Number(total),
      take,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /productos/:id
 * Obtiene un producto con todos sus datos relacionados
 */
export async function getProducto(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de producto inválido" });
    }

    const producto = await db("Productos as p")
      .leftJoin("Marcas as m", "m.IdMarca", "p.IdMarca")
      .where("p.IdProducto", id)
      .select("p.*", "m.Descripcion as NombreMarca", db.raw('p."IdProducto" as id'))
      .first();

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Cargar datos relacionados
    const [subfamilias, proveedores] = await Promise.all([
      db("ProductosSubFamilias as ps")
        .join("SubFamiliasProductos as sf", "sf.IdSubFamiliaProducto", "ps.IdSubFamiliaProducto")
        .join("FamiliasProductos as f", "f.IdFamiliaProducto", "sf.IdFamiliaProducto")
        .where("ps.IdProducto", id)
        .select(
          "ps.IdProducto",
          "ps.IdSubFamiliaProducto as IdSubFamilia",
          "sf.Descripcion",
          "sf.IdFamiliaProducto as IdFamilia",
          "f.Descripcion as NombreFamilia"
        ),
      db("ProductosProveedores as pp")
        .join("Proveedores as prov", "prov.IdProveedor", "pp.IdProveedor")
        .where("pp.IdProducto", id)
        .where("pp.Activo", 1)
        .select(
          "pp.IdProductoProveedor as id",
          "pp.IdProveedor",
          "prov.Nombre as NombreProveedor",
          "pp.ReferenciaProveedor",
          "pp.PrecioProveedor"
        )
    ]);

    res.json({
      ...producto,
      subfamilias,
      proveedores
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /productos-post
 * Crea un producto con sus datos relacionados
 */
export async function postProducto(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // 1. Crear producto base
      const productoData: Record<string, any> = {
        Codigo: input.codigo || input.Codigo || null,
        Nombre: input.nombre || input.Nombre,
        Descripcion: input.descripcion || input.Descripcion || null,
        IdMarca: input.idMarca || input.IdMarca || null,
        PVP: input.pvp || input.PVP || 0,
        PrecioCoste: input.precioCoste || input.PrecioCoste || 0,
        IdTipoIva: input.idTipoIva || input.IdTipoIva || null,
        Stock: input.stock || input.Stock || 0,
        StockMinimo: input.stockMinimo || input.StockMinimo || 0,
        Ubicacion: input.ubicacion || input.Ubicacion || null,
        Observaciones: input.observaciones || input.Observaciones || null,
        Activo: 1,
      };

      const [newProducto] = await trx("Productos").insert(productoData).returning("*");
      const productoId = newProducto.IdProducto;

      // 1b. Registrar movimiento de stock inicial si hay stock
      const stockInicial = newProducto.Stock || 0;
      if (stockInicial > 0) {
        await registrarMovimientoStock(
          productoId,
          "ENTRADA_INICIAL",
          stockInicial,
          0,
          stockInicial,
          null,
          null,
          "Stock inicial al crear producto",
          null,
          trx
        );
      }

      // 2. Insertar subfamilias
      if (input.subfamilias?.length) {
        const subfamiliasData = input.subfamilias.map((sf: any) => ({
          IdProducto: productoId,
          IdSubFamiliaProducto: sf.id_subfamilia || sf.IdSubFamiliaProducto || sf.IdSubFamilia || sf.id,
        }));
        await trx("ProductosSubFamilias").insert(subfamiliasData);
      }

      // 3. Insertar proveedores
      if (input.proveedores?.length) {
        const proveedoresData = input.proveedores.map((p: any) => ({
          IdProducto: productoId,
          IdProveedor: p.id_proveedor || p.IdProveedor || p.id,
          ReferenciaProveedor: p.referencia || p.ReferenciaProveedor || null,
          PrecioProveedor: p.precio || p.PrecioProveedor || null,
          Activo: 1,
        }));
        await trx("ProductosProveedores").insert(proveedoresData);
      }

      await trx.commit();

      // Devolver producto completo
      req.params.id = String(productoId);
      return getProducto(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /productos-put/:id
 * Actualiza un producto
 */
export async function putProducto(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de producto inválido" });
    }

    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // 1. Actualizar producto base
      const productoData: Record<string, any> = {};

      if (input.codigo !== undefined || input.Codigo !== undefined)
        productoData.Codigo = input.codigo || input.Codigo;
      if (input.nombre !== undefined || input.Nombre !== undefined)
        productoData.Nombre = input.nombre || input.Nombre;
      if (input.descripcion !== undefined || input.Descripcion !== undefined)
        productoData.Descripcion = input.descripcion || input.Descripcion;
      if (input.idMarca !== undefined || input.IdMarca !== undefined)
        productoData.IdMarca = input.idMarca || input.IdMarca;
      if (input.pvp !== undefined || input.PVP !== undefined)
        productoData.PVP = input.pvp || input.PVP;
      if (input.precioCoste !== undefined || input.PrecioCoste !== undefined)
        productoData.PrecioCoste = input.precioCoste || input.PrecioCoste;
      if (input.idTipoIva !== undefined || input.IdTipoIva !== undefined)
        productoData.IdTipoIva = input.idTipoIva || input.IdTipoIva;
      if (input.stock !== undefined || input.Stock !== undefined)
        productoData.Stock = input.stock || input.Stock;
      if (input.stockMinimo !== undefined || input.StockMinimo !== undefined)
        productoData.StockMinimo = input.stockMinimo || input.StockMinimo;
      if (input.ubicacion !== undefined || input.Ubicacion !== undefined)
        productoData.Ubicacion = input.ubicacion || input.Ubicacion;
      if (input.observaciones !== undefined || input.Observaciones !== undefined)
        productoData.Observaciones = input.observaciones || input.Observaciones;

      if (Object.keys(productoData).length > 0) {
        await trx("Productos").where("IdProducto", id).update(productoData);
      }

      // 2. Reemplazar subfamilias si vienen
      if (input.subfamilias !== undefined) {
        await trx("ProductosSubFamilias").where("IdProducto", id).del();
        if (input.subfamilias.length) {
          const subfamiliasData = input.subfamilias.map((sf: any) => ({
            IdProducto: id,
            IdSubFamiliaProducto: sf.id_subfamilia || sf.IdSubFamiliaProducto || sf.IdSubFamilia || sf.id,
          }));
          await trx("ProductosSubFamilias").insert(subfamiliasData);
        }
      }

      // 3. Reemplazar proveedores si vienen
      if (input.proveedores !== undefined) {
        await trx("ProductosProveedores").where("IdProducto", id).update({ Activo: 0 });
        if (input.proveedores.length) {
          const proveedoresData = input.proveedores.map((p: any) => ({
            IdProducto: id,
            IdProveedor: p.id_proveedor || p.IdProveedor || p.id,
            ReferenciaProveedor: p.referencia || p.ReferenciaProveedor || null,
            PrecioProveedor: p.precio || p.PrecioProveedor || null,
            Activo: 1,
          }));
          await trx("ProductosProveedores").insert(proveedoresData);
        }
      }

      await trx.commit();

      // 4. Verificar alertas de stock si el stock fue actualizado
      if (productoData.Stock !== undefined) {
        const dbName = (req as any).dbName || "default";
        // Fire and forget - no bloqueamos la respuesta
        verificarStockDespuesMovimiento(db, id, productoData.Stock, dbName).catch((err) => {
          console.error("Error verificando stock alerts:", err);
        });
      }

      // Devolver producto actualizado
      return getProducto(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /familias-productos-full
 * Lista familias de productos con sus subfamilias
 */
export async function getFamiliasProductosFull(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivas = String(req.query.soloActivas ?? "1") === "1";

    let query = db("FamiliasProductos").orderBy("Descripcion", "asc");
    if (soloActivas) {
      query = query.where("Activa", 1);
    }

    const familias = await query;

    const familiasConSubfamilias = await Promise.all(
      familias.map(async (f: any) => {
        let sfQuery = db("SubFamiliasProductos")
          .where("IdFamiliaProducto", f.IdFamiliaProducto)
          .orderBy("Descripcion", "asc");

        if (soloActivas) {
          sfQuery = sfQuery.where("Activa", 1);
        }

        const subfamilias = await sfQuery;

        return {
          IdFamiliaProducto: f.IdFamiliaProducto,
          Descripcion: f.Descripcion,
          Activa: f.Activa,
          subfamilias: subfamilias.map((sf: any) => ({
            IdSubFamiliaProducto: sf.IdSubFamiliaProducto,
            Descripcion: sf.Descripcion,
            Activa: sf.Activa,
          })),
        };
      })
    );

    res.json(familiasConSubfamilias);
  } catch (err) {
    next(err);
  }
}
