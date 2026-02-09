// src/controllers/controllersPersonalizados/modosPago.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * GET /modos-pago
 * Lista todos los modos de pago
 */
export async function getModosPago(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = db("ModosPago")
      .select(
        "IdModoPago as id",
        "Descripcion as descripcion",
        "UsaDatafono as usaDatafono",
        "Activo as activo",
        "Orden as orden"
      )
      .orderBy("Orden", "asc")
      .orderBy("Descripcion", "asc");

    if (soloActivos) {
      query = query.where("Activo", true);
    }

    const rows = await query;

    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /modos-pago/:id
 * Obtiene un modo de pago por ID
 */
export async function getModoPago(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de modo de pago inválido" });
    }

    const modoPago = await db("ModosPago")
      .select(
        "IdModoPago as id",
        "Descripcion as descripcion",
        "UsaDatafono as usaDatafono",
        "Activo as activo",
        "Orden as orden"
      )
      .where("IdModoPago", id)
      .first();

    if (!modoPago) {
      return res.status(404).json({ error: "Modo de pago no encontrado" });
    }

    res.json(modoPago);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /modos-pago
 * Crea un nuevo modo de pago
 */
export async function createModoPago(req: Request, res: Response, next: NextFunction) {
  try {
    const { descripcion, usaDatafono, orden } = req.body;

    if (!descripcion?.trim()) {
      return res.status(400).json({ error: "La descripción es obligatoria" });
    }

    // Si no se especifica orden, poner al final
    let ordenFinal = orden;
    if (ordenFinal === undefined || ordenFinal === null) {
      const [maxOrden] = await db("ModosPago").max("Orden as max");
      ordenFinal = (maxOrden?.max ?? 0) + 1;
    }

    const [result] = await db("ModosPago")
      .insert({
        Descripcion: descripcion.trim(),
        UsaDatafono: usaDatafono ?? false,
        Activo: true,
        Orden: ordenFinal,
      })
      .returning("IdModoPago");

    const newId = typeof result === "object" ? result.IdModoPago : result;

    res.status(201).json({
      id: newId,
      descripcion: descripcion.trim(),
      usaDatafono: usaDatafono ?? false,
      activo: true,
      orden: ordenFinal,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /modos-pago/:id
 * Actualiza un modo de pago
 */
export async function updateModoPago(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de modo de pago inválido" });
    }

    const { descripcion, usaDatafono, activo, orden } = req.body;

    const updateData: Record<string, any> = {
      FechaModificacion: new Date(),
    };

    if (descripcion !== undefined) {
      if (!descripcion?.trim()) {
        return res.status(400).json({ error: "La descripción es obligatoria" });
      }
      updateData.Descripcion = descripcion.trim();
    }
    if (usaDatafono !== undefined) updateData.UsaDatafono = usaDatafono;
    if (activo !== undefined) updateData.Activo = activo;
    if (orden !== undefined) updateData.Orden = orden;

    await db("ModosPago").where("IdModoPago", id).update(updateData);

    res.json({ success: true, id });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /modos-pago/:id
 * Desactiva un modo de pago (soft delete)
 */
export async function deleteModoPago(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de modo de pago inválido" });
    }

    await db("ModosPago").where("IdModoPago", id).update({
      Activo: false,
      FechaModificacion: new Date(),
    });

    res.json({ success: true, message: "Modo de pago desactivado" });
  } catch (err) {
    next(err);
  }
}
