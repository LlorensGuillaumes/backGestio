// src/controllers/controllersPersonalizados/profesionales.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * GET /profesionales
 * Lista todos los profesionales (por defecto solo activos)
 */
export async function getProfesionales(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = db("Profesionales").orderBy("NombreCompleto", "asc");

    if (soloActivos) {
      query = query.where("Activo", 1);
    }

    const rows = await query;

    // Mapear a camelCase
    const profesionales = rows.map((p: any) => ({
      id: p.IdProfesional,
      nombreCompleto: p.NombreCompleto,
      especialidad: p.Especialidad,
      numColegiado: p.NumColegiado,
      activo: p.Activo === 1,
    }));

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

    res.json({
      id: row.IdProfesional,
      nombreCompleto: row.NombreCompleto,
      especialidad: row.Especialidad,
      numColegiado: row.NumColegiado,
      activo: row.Activo === 1,
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
    const { nombreCompleto, especialidad, numColegiado, activo } = req.body;

    if (!nombreCompleto?.trim()) {
      return res.status(400).json({ error: "El nombre completo es obligatorio" });
    }

    const [id] = await db("Profesionales")
      .insert({
        NombreCompleto: nombreCompleto.trim(),
        Especialidad: especialidad?.trim() || null,
        NumColegiado: numColegiado?.trim() || null,
        Activo: activo !== false ? 1 : 0,
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

    const { nombreCompleto, especialidad, numColegiado, activo } = req.body;

    const updateData: Record<string, any> = {
      FechaModificacion: new Date(),
    };

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
      activo: row.Activo === 1,
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
      .update({ Activo: 0, FechaModificacion: new Date() });

    if (updated === 0) {
      return res.status(404).json({ error: "Profesional no encontrado" });
    }

    res.json({ success: true, message: "Profesional desactivado correctamente" });
  } catch (err) {
    next(err);
  }
}
