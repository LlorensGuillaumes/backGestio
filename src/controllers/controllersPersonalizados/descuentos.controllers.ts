// src/controllers/controllersPersonalizados/descuentos.controllers.ts
// Descuentos en 2 niveles: familias de cliente (con aplicabilidad cuota/matrícula)
// y sus subfamilias (cada una con su % de descuento).
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

// GET /descuentos → familias de descuento con sus subfamilias
export async function getDescuentos(_req: Request, res: Response, next: NextFunction) {
  try {
    const familias = await db("familias_clientes")
      .where(function () {
        this.where("aplica_cuota", true).orWhere("aplica_matricula", true);
      })
      .andWhere("activa", true)
      .select("id", "nombre", "descripcion", "aplica_cuota", "aplica_matricula")
      .orderBy("nombre", "asc");

    const ids = familias.map((f: any) => f.id);
    const subs = ids.length
      ? await db("subfamilias_clientes")
          .whereIn("id_familia", ids)
          .andWhere("activa", true)
          .select("id", "id_familia", "nombre", "descripcion", "descuento_porcentaje")
          .orderBy("nombre", "asc")
      : [];

    const data = familias.map((f: any) => ({
      ...f,
      subfamilias: subs.filter((s: any) => s.id_familia === f.id),
    }));
    res.json({ data });
  } catch (e) {
    next(e);
  }
}

// ---- Familias ----
export async function createFamiliaDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    const b = req.body ?? {};
    if (!b.nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
    const [row] = await db("familias_clientes")
      .insert({
        nombre: String(b.nombre).trim(),
        descripcion: b.descripcion ?? null,
        aplica_cuota: !!b.aplicaCuota,
        aplica_matricula: !!b.aplicaMatricula,
      })
      .returning("id");
    res.status(201).json({ id: typeof row === "object" ? row.id : row });
  } catch (e) {
    next(e);
  }
}

export async function updateFamiliaDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (b.nombre !== undefined) patch.nombre = String(b.nombre).trim();
    if (b.descripcion !== undefined) patch.descripcion = b.descripcion;
    if (b.aplicaCuota !== undefined) patch.aplica_cuota = !!b.aplicaCuota;
    if (b.aplicaMatricula !== undefined) patch.aplica_matricula = !!b.aplicaMatricula;
    await db("familias_clientes").where("id", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

export async function deleteFamiliaDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    await db("familias_clientes").where("id", Number(req.params.id)).update({ activa: false });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// ---- Subfamilias (descuentos concretos) ----
export async function createSubDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    const b = req.body ?? {};
    if (!b.nombre?.trim() || !b.idFamilia) return res.status(400).json({ error: "Familia y nombre son obligatorios" });
    const [row] = await db("subfamilias_clientes")
      .insert({
        id_familia: Number(b.idFamilia),
        nombre: String(b.nombre).trim(),
        descripcion: b.descripcion ?? null,
        descuento_porcentaje: Number(b.descuentoPorcentaje ?? 0),
      })
      .returning("id");
    res.status(201).json({ id: typeof row === "object" ? row.id : row });
  } catch (e) {
    next(e);
  }
}

export async function updateSubDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (b.nombre !== undefined) patch.nombre = String(b.nombre).trim();
    if (b.descripcion !== undefined) patch.descripcion = b.descripcion;
    if (b.descuentoPorcentaje !== undefined) patch.descuento_porcentaje = Number(b.descuentoPorcentaje);
    if (b.idFamilia !== undefined) patch.id_familia = Number(b.idFamilia);
    await db("subfamilias_clientes").where("id", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

export async function deleteSubDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    await db("subfamilias_clientes").where("id", Number(req.params.id)).update({ activa: false });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}
