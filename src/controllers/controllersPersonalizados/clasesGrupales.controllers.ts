// src/controllers/controllersPersonalizados/clasesGrupales.controllers.ts
// Gestión de clases grupales de la escuela de música
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

// =========================================================
// CLASES GRUPALES
// =========================================================

/** GET /clases-grupales — lista de clases grupales */
export async function getClasesGrupales(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivas = String(req.query.soloActivas ?? "1") === "1";
    const idProfesor = req.query.idProfesor ? Number(req.query.idProfesor) : null;

    let query = db("ClasesGrupales as cg")
      .leftJoin("Profesionales as p", "cg.IdProfesor", "p.IdProfesional")
      .leftJoin("Servicios as s", "cg.IdInstrumento", "s.IdServicio")
      .select(
        "cg.IdClaseGrupal as id",
        "cg.Nombre",
        "cg.IdProfesor",
        "p.NombreCompleto as NombreProfesor",
        "cg.IdInstrumento",
        "s.Nombre as NombreInstrumento",
        "cg.CapacidadMaxima",
        "cg.DiaDeLaSemana",
        "cg.HoraInicio",
        "cg.HoraFin",
        "cg.Aula",
        "cg.FechaInicio",
        "cg.FechaFin",
        "cg.Activa"
      )
      .orderBy("cg.DiaDeLaSemana", "asc")
      .orderBy("cg.HoraInicio", "asc");

    if (soloActivas) query = query.where("cg.Activa", true);
    if (idProfesor) query = query.where("cg.IdProfesor", idProfesor);

    const rows = await query;
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** GET /clases-grupales/:id — una clase grupal */
export async function getClaseGrupal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const clase = await db("ClasesGrupales as cg")
      .leftJoin("Profesionales as p", "cg.IdProfesor", "p.IdProfesional")
      .leftJoin("Servicios as s", "cg.IdInstrumento", "s.IdServicio")
      .select(
        "cg.IdClaseGrupal as id",
        "cg.Nombre",
        "cg.IdProfesor",
        "p.NombreCompleto as NombreProfesor",
        "cg.IdInstrumento",
        "s.Nombre as NombreInstrumento",
        "cg.CapacidadMaxima",
        "cg.DiaDeLaSemana",
        "cg.HoraInicio",
        "cg.HoraFin",
        "cg.Aula",
        "cg.FechaInicio",
        "cg.FechaFin",
        "cg.Activa"
      )
      .where("cg.IdClaseGrupal", id)
      .first();

    if (!clase) {
      res.status(404).json({ error: "Clase grupal no encontrada" });
      return;
    }

    res.json(clase);
  } catch (e) {
    next(e);
  }
}

/** POST /clases-grupales — crear nueva clase grupal */
export async function createClaseGrupal(req: Request, res: Response, next: NextFunction) {
  try {
    const b = req.body ?? {};
    
    if (!b.nombre || !b.idProfesor || !b.idInstrumento || !b.diaDeLaSemana || !b.horaInicio || !b.horaFin) {
      res.status(400).json({ error: "Nombre, profesor, instrumento, día y horas son obligatorios" });
      return;
    }

    const [row] = await db("ClasesGrupales")
      .insert({
        Nombre: String(b.nombre).trim(),
        IdProfesor: Number(b.idProfesor),
        IdInstrumento: Number(b.idInstrumento),
        CapacidadMaxima: Number(b.capacidadMaxima ?? 1),
        DiaDeLaSemana: Number(b.diaDeLaSemana),
        HoraInicio: b.horaInicio,
        HoraFin: b.horaFin,
        Aula: b.aula ?? null,
        FechaInicio: b.fechaInicio || null,
        FechaFin: b.fechaFin || null,
        Activa: b.activa !== undefined ? b.activa : true,
      })
      .returning("IdClaseGrupal");
    
    res.status(201).json({ id: typeof row === "object" ? row.IdClaseGrupal : row });
  } catch (e) {
    next(e);
  }
}

/** PUT /clases-grupales/:id — actualizar clase grupal */
export async function updateClaseGrupal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    
    if (b.nombre !== undefined) patch.Nombre = String(b.nombre).trim();
    if (b.idProfesor !== undefined) patch.IdProfesor = Number(b.idProfesor);
    if (b.idInstrumento !== undefined) patch.IdInstrumento = Number(b.idInstrumento);
    if (b.capacidadMaxima !== undefined) patch.CapacidadMaxima = Number(b.capacidadMaxima);
    if (b.diaDeLaSemana !== undefined) patch.DiaDeLaSemana = Number(b.diaDeLaSemana);
    if (b.horaInicio !== undefined) patch.HoraInicio = b.horaInicio;
    if (b.horaFin !== undefined) patch.HoraFin = b.horaFin;
    if (b.aula !== undefined) patch.Aula = b.aula;
    if (b.fechaInicio !== undefined) patch.FechaInicio = b.fechaInicio || null;
    if (b.fechaFin !== undefined) patch.FechaFin = b.fechaFin || null;
    if (b.activa !== undefined) patch.Activa = b.activa;

    if (Object.keys(patch).length) {
      await db("ClasesGrupales").where("IdClaseGrupal", id).update(patch);
    }
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

/** DELETE /clases-grupales/:id — eliminar clase grupal */
export async function deleteClaseGrupal(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await db("ClasesGrupales").where("IdClaseGrupal", id).del();
    res.json({ success: true, message: "Clase grupal eliminada" });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// MATRÍCULA DE ALUMNOS EN CLASES GRUPALES
// =========================================================

/** POST /clases-grupales/matricular — matricular alumno en clase grupal */
export async function matricularAlumnoClaseGrupal(req: Request, res: Response, next: NextFunction) {
  try {
    const b = req.body ?? {};
    
    if (!b.idClaseGrupal || !b.idCliente) {
      res.status(400).json({ error: "IdClaseGrupal e IdCliente son obligatorios" });
      return;
    }

    // Verificar que la clase existe y está activa
    const clase = await db("ClasesGrupales")
      .where("IdClaseGrupal", Number(b.idClaseGrupal))
      .where("Activa", true)
      .first();

    if (!clase) {
      res.status(404).json({ error: "Clase grupal no encontrada o no activa" });
      return;
    }

    // Verificar que el cliente existe
    const cliente = await db("clientes")
      .where("id", Number(b.idCliente))
      .first();

    if (!cliente) {
      res.status(404).json({ error: "Cliente no encontrado" });
      return;
    }

    // Crear la matrícula
    const [row] = await db("Matriculas")
      .insert({
        IdClaseRecurrente: null, // No está asociada a una clase recurrente
        IdCliente: Number(b.idCliente),
        CuotaMensual: Number(b.cuotaMensual ?? 0),
        Estado: "ACTIVA",
        Activo: true,
      })
      .returning("IdMatricula");

    res.status(201).json({ id: typeof row === "object" ? row.IdMatricula : row, success: true });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// OPCIONES (para selects del formulario)
// =========================================================

/** GET /clases-grupales/opciones — profesores e instrumentos para el formulario */
export async function getOpcionesClasesGrupales(_req: Request, res: Response, next: NextFunction) {
  try {
    const profesores = await db("Profesionales")
      .select("IdProfesional as id", "NombreCompleto as nombre")
      .where("Activo", true)
      .orderBy("NombreCompleto", "asc");

    const instrumentos = await db("Servicios")
      .select("IdServicio as id", "Nombre")
      .where("Activo", 1)
      .orderBy("Nombre", "asc");

    res.json({ profesores, instrumentos });
  } catch (e) {
    next(e);
  }
}
