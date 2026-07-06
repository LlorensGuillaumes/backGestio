// src/controllers/controllersPersonalizados/profesionales.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getMasterDb } from "../../db/masterDb.js";

// Resuelve datos del trabajador (master) para un conjunto de IdUsuario
async function trabajadoresMap(ids: number[]) {
  const limpios = [...new Set(ids.filter(Boolean))];
  if (!limpios.length) return new Map<number, any>();
  const rows = await getMasterDb()("usuarios")
    .whereIn("id", limpios)
    .select("id", "nombre", "tipo_relacion", "iban");
  return new Map(rows.map((r: any) => [Number(r.id), r]));
}

/**
 * GET /profesionales
 * Lista todos los profesionales (por defecto solo activos)
 */
export async function getProfesionales(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = db("Profesionales").orderBy("NombreCompleto", "asc");

    if (soloActivos) {
      query = query.where("Activo", true);
    }

    const rows = await query;

    // Resolver el trabajador vinculado (de la BD master)
    const trabMap = await trabajadoresMap(rows.map((p: any) => Number(p.IdUsuario)));

    // Mapear a camelCase
    const profesionales = rows.map((p: any) => {
      const t = p.IdUsuario ? trabMap.get(Number(p.IdUsuario)) : null;
      return {
        id: p.IdProfesional,
        nombreCompleto: p.NombreCompleto,
        especialidad: p.Especialidad,
        numColegiado: p.NumColegiado,
        idUsuario: p.IdUsuario ?? null,
        nombreTrabajador: t?.nombre ?? null,
        tipoRelacion: t?.tipo_relacion ?? null,
        activo: !!p.Activo,
      };
    });

    res.json({ rows: profesionales, totalCount: profesionales.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /profesionales/:id
 * Obtiene un profesional por ID
 */
export async function getProfesional(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de profesional inválido" });
    }

    const row = await db("Profesionales").where("IdProfesional", id).first();

    if (!row) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    const t = row.IdUsuario ? (await trabajadoresMap([Number(row.IdUsuario)])).get(Number(row.IdUsuario)) : null;
    res.json({
      id: row.IdProfesional,
      nombreCompleto: row.NombreCompleto,
      especialidad: row.Especialidad,
      numColegiado: row.NumColegiado,
      idUsuario: row.IdUsuario ?? null,
      nombreTrabajador: t?.nombre ?? null,
      tipoRelacion: t?.tipo_relacion ?? null,
      activo: !!row.Activo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /profesionales
 * Crea un nuevo profesional
 */
export async function createProfesional(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombreCompleto, especialidad, numColegiado, idUsuario, activo } = req.body;

    if (!nombreCompleto?.trim()) {
      return res.status(400).json({ error: "El nombre completo es obligatorio" });
    }

    const [id] = await db("Profesionales")
      .insert({
        NombreCompleto: nombreCompleto.trim(),
        Especialidad: especialidad?.trim() || null,
        NumColegiado: numColegiado?.trim() || null,
        IdUsuario: idUsuario || null,
        Activo: activo !== false,
        FechaCreacion: new Date(),
      })
      .returning("IdProfesional");

    const newId = typeof id === "object" ? id.IdProfesional : id;

    res.status(201).json({
      id: newId,
      nombreCompleto: nombreCompleto.trim(),
      especialidad: especialidad?.trim() || null,
      numColegiado: numColegiado?.trim() || null,
      activo: activo !== false,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /profesionales/:id
 * Actualiza un profesional
 */
export async function updateProfesional(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de profesional inválido" });
    }

    const { nombreCompleto, especialidad, numColegiado, idUsuario, activo } = req.body;

    const updateData: Record<string, any> = {
      FechaModificacion: new Date(),
    };

    if (idUsuario !== undefined) updateData.IdUsuario = idUsuario || null;

    if (nombreCompleto !== undefined) {
      if (!nombreCompleto?.trim()) {
        return res.status(400).json({ error: "El nombre completo es obligatorio" });
      }
      updateData.NombreCompleto = nombreCompleto.trim();
    }

    if (especialidad !== undefined) {
      updateData.Especialidad = especialidad?.trim() || null;
    }

    if (numColegiado !== undefined) {
      updateData.NumColegiado = numColegiado?.trim() || null;
    }

    if (activo !== undefined) {
      updateData.Activo = activo ? 1 : 0;
    }

    const updated = await db("Profesionales")
      .where("IdProfesional", id)
      .update(updateData);

    if (updated === 0) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    // Devolver el profesional actualizado
    const row = await db("Profesionales").where("IdProfesional", id).first();

    res.json({
      id: row.IdProfesional,
      nombreCompleto: row.NombreCompleto,
      especialidad: row.Especialidad,
      numColegiado: row.NumColegiado,
      activo: !!row.Activo,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /profesionales/:id
 * Elimina (desactiva) un profesional
 */
export async function deleteProfesional(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de profesional inválido" });
    }

    // Baja lógica (desactivar)
    const updated = await db("Profesionales")
      .where("IdProfesional", id)
      .update({ Activo: false, FechaModificacion: new Date() });

    if (updated === 0) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    res.json({ success: true, message: "Profesional desactivado correctamente" });
  } catch (err) {
    next(err);
  }
}
