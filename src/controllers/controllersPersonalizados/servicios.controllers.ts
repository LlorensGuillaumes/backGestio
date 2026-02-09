// src/controllers/controllersPersonalizados/servicios.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * GET /servicios-full
 * Lista todos los servicios con sus subfamilias
 */
export async function getServiciosFull(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Number(req.query.take ?? 100);
    const offset = Number(req.query.offset ?? 0);
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";
    const idFamilia = req.query.idFamilia ? Number(req.query.idFamilia) : null;
    const idSubFamilia = req.query.idSubFamilia ? Number(req.query.idSubFamilia) : null;
    const q = (req.query.q as string)?.trim().toLowerCase() || "";

    let query = db("Servicios as s")
      .select(
        "s.IdServicio as id",
        "s.Codigo",
        "s.Nombre",
        "s.Descripcion",
        "s.PVP",
        "s.PrecioCoste",
        "s.PorcentajeIva",
        "s.DuracionMinutos",
        "s.RequiereCita",
        "s.Observaciones",
        "s.Activo"
      )
      .orderBy("s.Nombre", "asc");

    if (soloActivos) {
      query = query.where("s.Activo", 1);
    }

    // Filtro por búsqueda de texto (nombre o código)
    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER(s."Nombre") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER(s."Codigo") LIKE ?', [`%${q}%`]);
      });
    }

    // Filtro por familia
    if (idFamilia) {
      query = query
        .join("ServiciosSubFamilias as ssf", "s.IdServicio", "ssf.IdServicio")
        .join("SubFamiliasServicios as sf", "ssf.IdSubFamiliaServicio", "sf.IdSubFamiliaServicio")
        .where("sf.IdFamiliaServicio", idFamilia)
        .distinct();
    }

    // Filtro por subfamilia
    if (idSubFamilia) {
      query = query
        .join("ServiciosSubFamilias as ssf2", "s.IdServicio", "ssf2.IdServicio")
        .where("ssf2.IdSubFamiliaServicio", idSubFamilia);
    }

    const [countResult] = await db("Servicios as s")
      .where(soloActivos ? { Activo: 1 } : {})
      .count("* as total");
    const totalCount = Number(countResult?.total ?? 0);

    const rows = await query.limit(take).offset(offset);

    // Obtener subfamilias para cada servicio
    const serviciosConSubfamilias = await Promise.all(
      rows.map(async (s: any) => {
        const subfamilias = await db("ServiciosSubFamilias as ssf")
          .join("SubFamiliasServicios as sf", "ssf.IdSubFamiliaServicio", "sf.IdSubFamiliaServicio")
          .join("FamiliasServicios as f", "sf.IdFamiliaServicio", "f.IdFamiliaServicio")
          .select(
            "sf.IdSubFamiliaServicio as id",
            "sf.Descripcion as nombre",
            "f.IdFamiliaServicio as idFamilia",
            "f.Descripcion as nombreFamilia"
          )
          .where("ssf.IdServicio", s.id);

        return {
          ...s,
          subfamilias,
          NombreFamilia: subfamilias[0]?.nombreFamilia ?? null,
          NombreSubFamilia: subfamilias[0]?.nombre ?? null,
        };
      })
    );

    res.json({ data: serviciosConSubfamilias, totalCount });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /servicios/:id
 * Obtiene un servicio por ID con sus subfamilias
 */
export async function getServicio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de servicio inválido" });
    }

    const servicio = await db("Servicios").where("IdServicio", id).first();
    if (!servicio) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const subfamilias = await db("ServiciosSubFamilias as ssf")
      .join("SubFamiliasServicios as sf", "ssf.IdSubFamiliaServicio", "sf.IdSubFamiliaServicio")
      .join("FamiliasServicios as f", "sf.IdFamiliaServicio", "f.IdFamiliaServicio")
      .select(
        "sf.IdSubFamiliaServicio as id",
        "sf.Descripcion as nombre",
        "f.IdFamiliaServicio as idFamilia",
        "f.Descripcion as nombreFamilia"
      )
      .where("ssf.IdServicio", id);

    res.json({
      id: servicio.IdServicio,
      Codigo: servicio.Codigo,
      Nombre: servicio.Nombre,
      Descripcion: servicio.Descripcion,
      PVP: servicio.PVP,
      PrecioCoste: servicio.PrecioCoste,
      PorcentajeIva: servicio.PorcentajeIva,
      DuracionMinutos: servicio.DuracionMinutos,
      RequiereCita: servicio.RequiereCita,
      Observaciones: servicio.Observaciones,
      Activo: servicio.Activo,
      subfamilias,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /servicios
 * Crea un nuevo servicio
 */
export async function createServicio(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      codigo,
      nombre,
      descripcion,
      pvp,
      precioCoste,
      porcentajeIva,
      duracionMinutos,
      requiereCita,
      observaciones,
      subfamilias,
    } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const trx = await db.transaction();

    try {
      const [result] = await trx("Servicios")
        .insert({
          Codigo: codigo?.trim() || null,
          Nombre: nombre.trim(),
          Descripcion: descripcion?.trim() || null,
          PVP: pvp ?? 0,
          PrecioCoste: precioCoste ?? 0,
          PorcentajeIva: porcentajeIva ?? 21,
          DuracionMinutos: duracionMinutos ?? 0,
          RequiereCita: requiereCita ?? false,
          Observaciones: observaciones?.trim() || null,
          Activo: 1,
        })
        .returning("IdServicio");

      const newId = typeof result === "object" ? result.IdServicio : result;

      // Insertar subfamilias
      if (subfamilias?.length > 0) {
        const sfInserts = subfamilias.map((idSf: number) => ({
          IdServicio: newId,
          IdSubFamiliaServicio: idSf,
        }));
        await trx("ServiciosSubFamilias").insert(sfInserts);
      }

      await trx.commit();

      res.status(201).json({ id: newId, nombre: nombre.trim() });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /servicios/:id
 * Actualiza un servicio
 */
export async function updateServicio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de servicio inválido" });
    }

    const {
      codigo,
      nombre,
      descripcion,
      pvp,
      precioCoste,
      porcentajeIva,
      duracionMinutos,
      requiereCita,
      observaciones,
      activo,
      subfamilias,
    } = req.body;

    const trx = await db.transaction();

    try {
      const updateData: Record<string, any> = {};

      if (codigo !== undefined) updateData.Codigo = codigo?.trim() || null;
      if (nombre !== undefined) {
        if (!nombre?.trim()) {
          await trx.rollback();
          return res.status(400).json({ error: "El nombre es obligatorio" });
        }
        updateData.Nombre = nombre.trim();
      }
      if (descripcion !== undefined) updateData.Descripcion = descripcion?.trim() || null;
      if (pvp !== undefined) updateData.PVP = pvp;
      if (precioCoste !== undefined) updateData.PrecioCoste = precioCoste;
      if (porcentajeIva !== undefined) updateData.PorcentajeIva = porcentajeIva;
      if (duracionMinutos !== undefined) updateData.DuracionMinutos = duracionMinutos;
      if (requiereCita !== undefined) updateData.RequiereCita = requiereCita;
      if (observaciones !== undefined) updateData.Observaciones = observaciones?.trim() || null;
      if (activo !== undefined) updateData.Activo = activo ? 1 : 0;

      if (Object.keys(updateData).length > 0) {
        await trx("Servicios").where("IdServicio", id).update(updateData);
      }

      // Actualizar subfamilias si se proporcionan
      if (subfamilias !== undefined) {
        await trx("ServiciosSubFamilias").where("IdServicio", id).del();
        if (subfamilias.length > 0) {
          const sfInserts = subfamilias.map((idSf: number) => ({
            IdServicio: id,
            IdSubFamiliaServicio: idSf,
          }));
          await trx("ServiciosSubFamilias").insert(sfInserts);
        }
      }

      await trx.commit();

      res.json({ success: true, id });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /servicios/:id
 * Desactiva un servicio (soft delete)
 */
export async function deleteServicio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de servicio inválido" });
    }

    await db("Servicios").where("IdServicio", id).update({ Activo: 0 });

    res.json({ success: true, message: "Servicio desactivado" });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /familias-servicios-full
 * Lista familias de servicios con sus subfamilias
 */
export async function getFamiliasServiciosFull(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivas = String(req.query.soloActivas ?? "1") === "1";

    let query = db("FamiliasServicios").orderBy("Descripcion", "asc");
    if (soloActivas) {
      query = query.where("Activa", 1);
    }

    const familias = await query;

    const familiasConSubfamilias = await Promise.all(
      familias.map(async (f: any) => {
        let sfQuery = db("SubFamiliasServicios")
          .where("IdFamiliaServicio", f.IdFamiliaServicio)
          .orderBy("Descripcion", "asc");

        if (soloActivas) {
          sfQuery = sfQuery.where("Activa", 1);
        }

        const subfamilias = await sfQuery;

        return {
          id: f.IdFamiliaServicio,
          descripcion: f.Descripcion,
          activa: f.Activa === 1,
          subfamilias: subfamilias.map((sf: any) => ({
            id: sf.IdSubFamiliaServicio,
            descripcion: sf.Descripcion,
            activa: sf.Activa === 1,
          })),
        };
      })
    );

    res.json(familiasConSubfamilias);
  } catch (err) {
    next(err);
  }
}
