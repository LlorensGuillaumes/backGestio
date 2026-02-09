// src/controllers/controllersPersonalizados/proveedores.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * GET /proveedores-full
 * Lista proveedores con paginación y filtros
 */
export async function getProveedoresFull(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;
    const soloActivos = req.query.soloActivos !== "0";

    const q = (req.query.q as string)?.trim().toLowerCase() || "";
    const nif = (req.query.nif as string)?.trim().toLowerCase() || "";
    const email = (req.query.email as string)?.trim().toLowerCase() || "";
    const telefono = (req.query.telefono as string)?.trim() || "";

    let query = db("Proveedores as p")
      .select(
        "p.IdProveedor as id",
        "p.Nombre",
        "p.NombreComercial",
        "p.NIF",
        "p.Email",
        "p.Activo",
        db.raw(`
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', t."IdTelefonoProveedor",
              'telefono', t."Telefono",
              'tipo', t."Tipo"
            )) FROM "ProveedoresTelefonos" t WHERE t."IdProveedor" = p."IdProveedor" AND t."Activo" = 1),
            '[]'
          ) as telefonos
        `),
        db.raw(`
          COALESCE(
            (SELECT json_agg(json_build_object(
              'id', ps."IdProveedor",
              'id_subfamilia', ps."IdSubFamiliaProveedor",
              'descripcion', sf."Descripcion",
              'id_familia', sf."IdFamiliaProveedor"
            )) FROM "ProveedoresSubFamilias" ps
            JOIN "SubFamiliasProveedores" sf ON sf."IdSubFamiliaProveedor" = ps."IdSubFamiliaProveedor"
            WHERE ps."IdProveedor" = p."IdProveedor"),
            '[]'
          ) as subfamilias
        `)
      );

    if (soloActivos) {
      query = query.where("p.Activo", 1);
    }

    // Filtros
    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(p."Nombre") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(p."NombreComercial") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(p."NIF") LIKE ?', [`%${q}%`]);
      });
    }

    if (nif) {
      query = query.whereRaw('LOWER(p."NIF") LIKE ?', [`%${nif}%`]);
    }

    if (email) {
      query = query.whereRaw('LOWER(p."Email") LIKE ?', [`%${email}%`]);
    }

    if (telefono) {
      query = query.whereExists(function () {
        this.select(db.raw(1))
          .from("ProveedoresTelefonos as t")
          .whereRaw('t."IdProveedor" = p."IdProveedor"')
          .whereRaw('t."Telefono" LIKE ?', [`%${telefono}%`]);
      });
    }

    // Contar total
    const countQuery = query.clone().clearSelect().count("* as total").first();
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
 * GET /proveedores/:id
 * Obtiene un proveedor con todos sus datos relacionados
 */
export async function getProveedor(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de proveedor inválido" });
    }

    const proveedor = await db("Proveedores")
      .where("IdProveedor", id)
      .select("*", db.raw('"IdProveedor" as id'))
      .first();

    if (!proveedor) {
      return res.status(404).json({ error: "Proveedor no encontrado" });
    }

    // Cargar datos relacionados
    const [telefonos, contactos, subfamilias, productos] = await Promise.all([
      db("ProveedoresTelefonos")
        .where("IdProveedor", id)
        .where("Activo", 1)
        .select("*", db.raw('"IdTelefonoProveedor" as id')),
      db("ProveedoresContactos")
        .where("IdProveedor", id)
        .where("Activo", 1)
        .select("*", db.raw('"IdContactoProveedor" as id')),
      db("ProveedoresSubFamilias as ps")
        .join("SubFamiliasProveedores as sf", "sf.IdSubFamiliaProveedor", "ps.IdSubFamiliaProveedor")
        .where("ps.IdProveedor", id)
        .select(
          "ps.IdProveedor",
          "ps.IdSubFamiliaProveedor as IdSubFamilia",
          "sf.Descripcion",
          "sf.IdFamiliaProveedor as IdFamilia"
        ),
      db("ProductosProveedores as pp")
        .join("Productos as prod", "prod.IdProducto", "pp.IdProducto")
        .where("pp.IdProveedor", id)
        .where("pp.Activo", 1)
        .where("prod.Activo", 1)
        .select(
          "prod.IdProducto as id",
          "prod.Nombre",
          "prod.Codigo",
          "prod.PVP",
          "pp.ReferenciaProveedor",
          "pp.PrecioProveedor"
        )
    ]);

    res.json({
      ...proveedor,
      telefonos,
      contactos,
      subfamilias,
      productos
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /proveedores/:id/productos
 * Obtiene los productos de un proveedor
 */
export async function getProveedorProductos(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de proveedor inválido" });
    }

    const productos = await db("ProductosProveedores as pp")
      .join("Productos as p", "p.IdProducto", "pp.IdProducto")
      .leftJoin("Marcas as m", "m.IdMarca", "p.IdMarca")
      .where("pp.IdProveedor", id)
      .where("pp.Activo", 1)
      .where("p.Activo", 1)
      .select(
        "p.IdProducto as id",
        "p.Codigo",
        "p.Nombre",
        "p.PVP",
        "p.PrecioCoste",
        "m.Descripcion as Marca",
        "pp.ReferenciaProveedor",
        "pp.PrecioProveedor"
      )
      .orderBy("p.Nombre", "asc");

    res.json(productos);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /proveedores-post
 * Crea un proveedor con sus datos relacionados
 */
export async function postProveedor(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // 1. Crear proveedor base
      const proveedorData: Record<string, any> = {
        Nombre: input.nombre || input.Nombre,
        NombreComercial: input.nombreComercial || input.NombreComercial || null,
        NIF: input.nif || input.NIF || null,
        Direccion: input.direccion || input.Direccion || null,
        CodigoPostal: input.codigoPostal || input.CodigoPostal || null,
        Poblacion: input.poblacion || input.Poblacion || null,
        Provincia: input.provincia || input.Provincia || null,
        Pais: input.pais || input.Pais || null,
        Email: input.email || input.Email || null,
        Web: input.web || input.Web || null,
        Observaciones: input.observaciones || input.Observaciones || null,
        Activo: 1,
      };

      const [newProveedor] = await trx("Proveedores").insert(proveedorData).returning("*");
      const proveedorId = newProveedor.IdProveedor;

      // 2. Insertar teléfonos
      if (input.telefonos?.length) {
        const telefonosData = input.telefonos.map((t: any) => ({
          IdProveedor: proveedorId,
          Telefono: t.telefono || t.Telefono,
          Tipo: t.tipo || t.Tipo || "Principal",
          Activo: 1,
        }));
        await trx("ProveedoresTelefonos").insert(telefonosData);
      }

      // 3. Insertar contactos
      if (input.contactos?.length) {
        const contactosData = input.contactos.map((c: any) => ({
          IdProveedor: proveedorId,
          Nombre: c.nombre || c.Nombre,
          Cargo: c.cargo || c.Cargo || null,
          Telefono: c.telefono || c.Telefono || null,
          Email: c.email || c.Email || null,
          Activo: 1,
        }));
        await trx("ProveedoresContactos").insert(contactosData);
      }

      // 4. Insertar subfamilias
      if (input.subfamilias?.length) {
        const subfamiliasData = input.subfamilias.map((sf: any) => ({
          IdProveedor: proveedorId,
          IdSubFamiliaProveedor: sf.id_subfamilia || sf.IdSubFamiliaProveedor || sf.IdSubFamilia || sf.id,
        }));
        await trx("ProveedoresSubFamilias").insert(subfamiliasData);
      }

      await trx.commit();

      // Devolver proveedor completo
      req.params.id = String(proveedorId);
      return getProveedor(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /proveedores-put/:id
 * Actualiza un proveedor
 */
export async function putProveedor(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de proveedor inválido" });
    }

    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // 1. Actualizar proveedor base
      const proveedorData: Record<string, any> = {};

      if (input.nombre !== undefined || input.Nombre !== undefined)
        proveedorData.Nombre = input.nombre || input.Nombre;
      if (input.nombreComercial !== undefined || input.NombreComercial !== undefined)
        proveedorData.NombreComercial = input.nombreComercial || input.NombreComercial;
      if (input.nif !== undefined || input.NIF !== undefined)
        proveedorData.NIF = input.nif || input.NIF;
      if (input.direccion !== undefined || input.Direccion !== undefined)
        proveedorData.Direccion = input.direccion || input.Direccion;
      if (input.codigoPostal !== undefined || input.CodigoPostal !== undefined)
        proveedorData.CodigoPostal = input.codigoPostal || input.CodigoPostal;
      if (input.poblacion !== undefined || input.Poblacion !== undefined)
        proveedorData.Poblacion = input.poblacion || input.Poblacion;
      if (input.provincia !== undefined || input.Provincia !== undefined)
        proveedorData.Provincia = input.provincia || input.Provincia;
      if (input.pais !== undefined || input.Pais !== undefined)
        proveedorData.Pais = input.pais || input.Pais;
      if (input.email !== undefined || input.Email !== undefined)
        proveedorData.Email = input.email || input.Email;
      if (input.web !== undefined || input.Web !== undefined)
        proveedorData.Web = input.web || input.Web;
      if (input.observaciones !== undefined || input.Observaciones !== undefined)
        proveedorData.Observaciones = input.observaciones || input.Observaciones;

      if (Object.keys(proveedorData).length > 0) {
        await trx("Proveedores").where("IdProveedor", id).update(proveedorData);
      }

      // 2. Reemplazar teléfonos si vienen
      if (input.telefonos !== undefined) {
        // Soft delete existing
        await trx("ProveedoresTelefonos").where("IdProveedor", id).update({ Activo: 0 });
        if (input.telefonos.length) {
          const telefonosData = input.telefonos.map((t: any) => ({
            IdProveedor: id,
            Telefono: t.telefono || t.Telefono,
            Tipo: t.tipo || t.Tipo || "Principal",
            Activo: 1,
          }));
          await trx("ProveedoresTelefonos").insert(telefonosData);
        }
      }

      // 3. Reemplazar contactos si vienen
      if (input.contactos !== undefined) {
        await trx("ProveedoresContactos").where("IdProveedor", id).update({ Activo: 0 });
        if (input.contactos.length) {
          const contactosData = input.contactos.map((c: any) => ({
            IdProveedor: id,
            Nombre: c.nombre || c.Nombre,
            Cargo: c.cargo || c.Cargo || null,
            Telefono: c.telefono || c.Telefono || null,
            Email: c.email || c.Email || null,
            Activo: 1,
          }));
          await trx("ProveedoresContactos").insert(contactosData);
        }
      }

      // 4. Reemplazar subfamilias si vienen
      if (input.subfamilias !== undefined) {
        await trx("ProveedoresSubFamilias").where("IdProveedor", id).del();
        if (input.subfamilias.length) {
          const subfamiliasData = input.subfamilias.map((sf: any) => ({
            IdProveedor: id,
            IdSubFamiliaProveedor: sf.id_subfamilia || sf.IdSubFamiliaProveedor || sf.IdSubFamilia || sf.id,
          }));
          await trx("ProveedoresSubFamilias").insert(subfamiliasData);
        }
      }

      await trx.commit();

      // Devolver proveedor actualizado
      return getProveedor(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}
