// src/controllers/controllersPersonalizados/aulas.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

function toMin(hora: any): number {
  const s = String(hora ?? "");
  const [h, m] = s.split(":");
  return Number(h) * 60 + Number(m || 0);
}

// =========================================================
// AULAS (CRUD)
// =========================================================
export async function getAulas(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db("Aulas").where("Activo", 1).select("IdAula as id", "Nombre", "Capacidad", "Observaciones").orderBy("Nombre", "asc");
    res.json({ data: rows, totalCount: rows.length });
  } catch (e) {
    next(e);
  }
}

export async function createAula(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body?.nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
    const [row] = await db("Aulas")
      .insert({ Nombre: String(req.body.nombre).trim(), Capacidad: req.body.capacidad ?? null, Observaciones: req.body.observaciones ?? null })
      .returning("IdAula");
    res.status(201).json({ id: typeof row === "object" ? row.IdAula : row });
  } catch (e) {
    next(e);
  }
}

export async function updateAula(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (b.nombre !== undefined) patch.Nombre = String(b.nombre).trim();
    if (b.capacidad !== undefined) patch.Capacidad = b.capacidad;
    if (b.observaciones !== undefined) patch.Observaciones = b.observaciones;
    await db("Aulas").where("IdAula", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

export async function deleteAula(req: Request, res: Response, next: NextFunction) {
  try {
    await db("Aulas").where("IdAula", Number(req.params.id)).update({ Activo: 0 });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// CONFLICTOS DE AULA
// =========================================================
// Dado un conjunto de sesiones {dia, hora, duracion, idAula}, devuelve los solapamientos
// con sesiones de OTRAS clases en la misma aula. Excluye idClaseRecurrente (la propia).
export async function detectarConflictosAula(sesiones: any[], idClaseExcluir?: number) {
  const conflictos: any[] = [];
  const conAula = (sesiones ?? []).filter((s) => s.idAula);
  if (!conAula.length) return conflictos;

  let q = db("ClaseHorarios as ch")
    .join("ClasesRecurrentes as cr", "ch.IdClaseRecurrente", "cr.IdClaseRecurrente")
    .leftJoin("Aulas as a", "ch.IdAula", "a.IdAula")
    .where("ch.Activo", 1)
    .andWhere("cr.Activo", 1)
    .select("ch.DiaSemana", "ch.HoraInicio", "ch.DuracionMinutos", "ch.IdAula", "cr.Nombre as NombreClase", "a.Nombre as Aula");
  if (idClaseExcluir) q = q.whereNot("cr.IdClaseRecurrente", idClaseExcluir);
  const existentes = await q;

  const DIAS = ["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  for (const s of conAula) {
    const ini = toMin(s.hora);
    const fin = ini + Number(s.duracion || 60);
    for (const e of existentes as any[]) {
      if (Number(e.IdAula) !== Number(s.idAula)) continue;
      if (Number(e.DiaSemana) !== Number(s.dia)) continue;
      const eIni = toMin(e.HoraInicio);
      const eFin = eIni + Number(e.DuracionMinutos || 60);
      if (ini < eFin && eIni < fin) {
        conflictos.push({
          dia: Number(s.dia),
          diaNombre: DIAS[Number(s.dia)] ?? "",
          hora: String(s.hora).slice(0, 5),
          aula: e.Aula,
          conClase: e.NombreClase,
          horaExistente: String(e.HoraInicio).slice(0, 5),
        });
      }
    }
  }
  return conflictos;
}

/** POST /clases-recurrentes/conflictos-aula  body: { idClaseRecurrente?, sesiones:[] } */
export async function getConflictosAula(req: Request, res: Response, next: NextFunction) {
  try {
    const sesiones = req.body?.sesiones ?? [];
    const idExcluir = req.body?.idClaseRecurrente ? Number(req.body.idClaseRecurrente) : undefined;
    const conflictos = await detectarConflictosAula(sesiones, idExcluir);
    res.json({ conflictos });
  } catch (e) {
    next(e);
  }
}
