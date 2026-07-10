// src/controllers/controllersPersonalizados/escola.controllers.ts
// Gestión de la escuela de música: clases recurrentes y matrículas de alumnos.
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

// =========================================================
// CLASES RECURRENTES
// =========================================================

/** GET /clases-recurrentes — lista con instrumento, profesor y ocupación */
export async function getClasesRecurrentes(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivas = String(req.query.soloActivas ?? "1") === "1";
    const idProfesional = req.query.idProfesional ? Number(req.query.idProfesional) : null;

    let query = db("ClasesRecurrentes as cr")
      .leftJoin("Servicios as s", "cr.IdServicio", "s.IdServicio")
      .leftJoin("Profesionales as p", "cr.IdProfesional", "p.IdProfesional")
      .select(
        "cr.IdClaseRecurrente as id",
        "cr.Nombre",
        "cr.IdServicio",
        "s.Nombre as NombreInstrumento",
        "s.PVP as CuotaSugerida",
        "s.ImporteMatricula as ImporteMatricula",
        "cr.IdProfesional",
        "p.NombreCompleto as NombreProfesor",
        "cr.Tipo",
        "cr.CapacidadMax",
        "cr.DiaSemana",
        "cr.HoraInicio",
        "cr.DuracionMinutos",
        "cr.Aula",
        "cr.FechaInicio",
        "cr.FechaFin",
        "cr.Observaciones",
        "cr.Activo"
      )
      .select(
        db.raw(
          '(SELECT COUNT(*) FROM "Matriculas" m WHERE m."IdClaseRecurrente" = cr."IdClaseRecurrente" AND m."Activo" = 1)::int as "Ocupacion"'
        )
      )
      .orderBy("cr.DiaSemana", "asc")
      .orderBy("cr.HoraInicio", "asc");

    if (soloActivas) query = query.where("cr.Activo", 1);
    if (idProfesional) query = query.where("cr.IdProfesional", idProfesional);

    const rows = await query;

    // Sesiones (día/hora/aula) de cada clase
    const ids = rows.map((r: any) => r.id);
    const sesiones = ids.length
      ? await db("ClaseHorarios as ch")
          .leftJoin("Aulas as a", "ch.IdAula", "a.IdAula")
          .whereIn("ch.IdClaseRecurrente", ids)
          .andWhere("ch.Activo", 1)
          .select("ch.IdClaseRecurrente", "ch.IdHorario as id", "ch.DiaSemana as dia", "ch.HoraInicio as hora", "ch.DuracionMinutos as duracion", "ch.IdAula as idAula", "a.Nombre as aula")
          .orderBy("ch.DiaSemana", "asc")
          .orderBy("ch.HoraInicio", "asc")
      : [];
    for (const r of rows as any[]) {
      r.sesiones = sesiones.filter((s: any) => s.IdClaseRecurrente === r.id);
    }

    res.json({ data: rows, totalCount: rows.length });
  } catch (e) {
    next(e);
  }
}

/** GET /clases-recurrentes/:id — una clase con sus alumnos matriculados */
export async function getClaseRecurrente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const clase = await db("ClasesRecurrentes as cr")
      .leftJoin("Servicios as s", "cr.IdServicio", "s.IdServicio")
      .leftJoin("Profesionales as p", "cr.IdProfesional", "p.IdProfesional")
      .select(
        "cr.IdClaseRecurrente as id",
        "cr.Nombre",
        "cr.IdServicio",
        "s.Nombre as NombreInstrumento",
        "s.PVP as CuotaSugerida",
        "s.ImporteMatricula as ImporteMatricula",
        "cr.IdProfesional",
        "p.NombreCompleto as NombreProfesor",
        "cr.Tipo",
        "cr.CapacidadMax",
        "cr.DiaSemana",
        "cr.HoraInicio",
        "cr.DuracionMinutos",
        "cr.Aula",
        "cr.FechaInicio",
        "cr.FechaFin",
        "cr.Observaciones",
        "cr.Activo"
      )
      .where("cr.IdClaseRecurrente", id)
      .first();

    if (!clase) {
      res.status(404).json({ error: "Clase no encontrada" });
      return;
    }

    const matriculas = await db("Matriculas as m")
      .join("clientes as c", "m.IdCliente", "c.id")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .select(
        "m.IdMatricula as id",
        "m.IdCliente",
        "cp.nombre",
        "cp.apellido1",
        "cp.apellido2",
        "m.CuotaMensual",
        "m.Estado",
        "m.FechaAlta",
        "m.Activo"
      )
      .where("m.IdClaseRecurrente", id)
      .andWhere("m.Activo", 1)
      .orderBy("m.FechaAlta", "desc");

    const sesiones = await db("ClaseHorarios as ch")
      .leftJoin("Aulas as a", "ch.IdAula", "a.IdAula")
      .where("ch.IdClaseRecurrente", id)
      .andWhere("ch.Activo", 1)
      .select("ch.IdHorario as id", "ch.DiaSemana as dia", "ch.HoraInicio as hora", "ch.DuracionMinutos as duracion", "ch.IdAula as idAula", "a.Nombre as aula")
      .orderBy("ch.DiaSemana", "asc")
      .orderBy("ch.HoraInicio", "asc");

    res.json({ ...clase, sesiones, matriculas });
  } catch (e) {
    next(e);
  }
}

// Reemplaza las sesiones (día/hora/aula) de una clase
async function guardarSesiones(idClase: number, sesiones: any[]) {
  await db("ClaseHorarios").where("IdClaseRecurrente", idClase).del();
  const validas = (sesiones ?? []).filter((s) => s.dia && s.hora);
  if (validas.length) {
    await db("ClaseHorarios").insert(
      validas.map((s) => ({
        IdClaseRecurrente: idClase,
        DiaSemana: Number(s.dia),
        HoraInicio: s.hora,
        DuracionMinutos: Number(s.duracion || 60),
        IdAula: s.idAula || null,
      }))
    );
  }
}

/** POST /clases-recurrentes */
export async function createClaseRecurrente(req: Request, res: Response, next: NextFunction) {
  try {
    const b = req.body ?? {};
    const sesiones: any[] = Array.isArray(b.sesiones) ? b.sesiones.filter((s: any) => s.dia && s.hora) : [];
    // Compatibilidad: si no envían sesiones pero sí día/hora sueltos, monta una sesión
    if (!sesiones.length && b.diaSemana && b.horaInicio) {
      sesiones.push({ dia: b.diaSemana, hora: b.horaInicio, duracion: b.duracionMinutos ?? 60, idAula: b.idAula ?? null });
    }
    if (!b.nombre || sesiones.length === 0) {
      res.status(400).json({ error: "Nombre y al menos una sesión (día/hora) son obligatorios" });
      return;
    }
    const primera = sesiones[0];
    const [row] = await db("ClasesRecurrentes")
      .insert({
        Nombre: String(b.nombre).trim(),
        IdServicio: b.idServicio ?? null,
        IdProfesional: b.idProfesional ?? null,
        Tipo: b.tipo === "GRUPAL" ? "GRUPAL" : "INDIVIDUAL",
        CapacidadMax: Number(b.capacidadMax ?? 1),
        DiaSemana: Number(primera.dia),
        HoraInicio: primera.hora,
        DuracionMinutos: Number(primera.duracion ?? 60),
        Aula: null,
        FechaInicio: b.fechaInicio || null,
        FechaFin: b.fechaFin || null,
        Observaciones: b.observaciones ?? null,
      })
      .returning("IdClaseRecurrente");
    const idClase = typeof row === "object" ? row.IdClaseRecurrente : row;
    await guardarSesiones(idClase, sesiones);
    res.status(201).json({ id: idClase });
  } catch (e) {
    next(e);
  }
}

/** PUT /clases-recurrentes/:id */
export async function updateClaseRecurrente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (b.nombre !== undefined) patch.Nombre = String(b.nombre).trim();
    if (b.idServicio !== undefined) patch.IdServicio = b.idServicio;
    if (b.idProfesional !== undefined) patch.IdProfesional = b.idProfesional;
    if (b.tipo !== undefined) patch.Tipo = b.tipo === "GRUPAL" ? "GRUPAL" : "INDIVIDUAL";
    if (b.capacidadMax !== undefined) patch.CapacidadMax = Number(b.capacidadMax);
    if (b.diaSemana !== undefined) patch.DiaSemana = Number(b.diaSemana);
    if (b.horaInicio !== undefined) patch.HoraInicio = b.horaInicio;
    if (b.duracionMinutos !== undefined) patch.DuracionMinutos = Number(b.duracionMinutos);
    if (b.aula !== undefined) patch.Aula = b.aula;
    if (b.fechaInicio !== undefined) patch.FechaInicio = b.fechaInicio || null;
    if (b.fechaFin !== undefined) patch.FechaFin = b.fechaFin || null;
    if (b.observaciones !== undefined) patch.Observaciones = b.observaciones;
    if (b.activo !== undefined) patch.Activo = b.activo ? 1 : 0;

    // Sesiones (día/hora/aula): si vienen, reemplazan y la primera actualiza los campos legacy
    if (Array.isArray(b.sesiones)) {
      const sesiones = b.sesiones.filter((s: any) => s.dia && s.hora);
      if (sesiones.length) {
        const primera = sesiones[0];
        patch.DiaSemana = Number(primera.dia);
        patch.HoraInicio = primera.hora;
        patch.DuracionMinutos = Number(primera.duracion ?? 60);
      }
      await guardarSesiones(id, sesiones);
    }

    if (Object.keys(patch).length) await db("ClasesRecurrentes").where("IdClaseRecurrente", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

/** POST /clases-recurrentes/regenerar-citas — genera las citas de agenda desde las sesiones (próximas 8 semanas) */
export async function regenerarCitasClases(_req: Request, res: Response, next: NextFunction) {
  try {
    // Borrar las citas de clase futuras (no tocar las pasadas ni las manuales)
    await db("Citas").where("TipoCita", "CLASE").andWhereRaw(`"FechaHoraInicio" >= CURRENT_DATE`).del();

    // Generar una cita por sesión y semana (8 semanas), con su aula y profesor
    const result = await db.raw(`
      INSERT INTO "Citas"
        ("NombreContacto","FechaHoraInicio","FechaHoraFin","MotivoVisita","TipoCita","Estado","IdProfesional","Observaciones","Activo")
      SELECT
        cr."Nombre",
        (f.fecha + ch."HoraInicio")::timestamp,
        (f.fecha + ch."HoraInicio")::timestamp + (ch."DuracionMinutos" * interval '1 minute'),
        cr."Nombre" || COALESCE(' · ' || a."Nombre", ''),
        'CLASE', 'PROGRAMADA',
        cr."IdProfesional",
        'Generada desde la clase recurrente',
        1
      FROM "ClaseHorarios" ch
      JOIN "ClasesRecurrentes" cr ON cr."IdClaseRecurrente" = ch."IdClaseRecurrente"
      LEFT JOIN "Aulas" a ON a."IdAula" = ch."IdAula"
      CROSS JOIN generate_series(0,7) AS semana
      CROSS JOIN LATERAL (
        SELECT (date_trunc('week', CURRENT_DATE)::date + (ch."DiaSemana" - 1) + 7*semana) AS fecha
      ) f
      WHERE ch."Activo" = 1 AND cr."Activo" = 1
        AND (f.fecha + ch."HoraInicio")::timestamp >= CURRENT_DATE
    `);
    res.json({ success: true, generadas: result.rowCount ?? null });
  } catch (e) {
    next(e);
  }
}

/** DELETE /clases-recurrentes/:id — baja lógica */
export async function deleteClaseRecurrente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await db("ClasesRecurrentes").where("IdClaseRecurrente", id).update({ Activo: 0 });
    res.json({ success: true, message: "Clase desactivada" });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// MATRÍCULAS
// =========================================================

/** GET /matriculas — lista con clase, alumno y profesor. Filtros ?idClase= ?idCliente= */
export async function getMatriculas(req: Request, res: Response, next: NextFunction) {
  try {
    const idClase = req.query.idClase ? Number(req.query.idClase) : null;
    const idCliente = req.query.idCliente ? Number(req.query.idCliente) : null;
    const soloActivas = String(req.query.soloActivas ?? "1") === "1";

    let query = db("Matriculas as m")
      .join("clientes as c", "m.IdCliente", "c.id")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .join("ClasesRecurrentes as cr", "m.IdClaseRecurrente", "cr.IdClaseRecurrente")
      .leftJoin("Profesionales as p", "cr.IdProfesional", "p.IdProfesional")
      .select(
        "m.IdMatricula as id",
        "m.IdClaseRecurrente",
        "cr.Nombre as NombreClase",
        "cr.Tipo",
        "cr.DiaSemana",
        "cr.HoraInicio",
        "p.NombreCompleto as NombreProfesor",
        "m.IdCliente",
        "cp.nombre",
        "cp.apellido1",
        "cp.apellido2",
        "m.CuotaMensual",
        "m.Estado",
        "m.FechaAlta",
        "m.FechaBaja",
        "m.Activo"
      )
      .orderBy("m.FechaAlta", "desc");

    if (idClase) query = query.where("m.IdClaseRecurrente", idClase);
    if (idCliente) query = query.where("m.IdCliente", idCliente);
    if (soloActivas) query = query.where("m.Activo", 1);

    const rows = await query;
    res.json({ data: rows, totalCount: rows.length });
  } catch (e) {
    next(e);
  }
}

/** POST /matriculas — matricula un alumno validando capacidad y duplicados */
export async function createMatricula(req: Request, res: Response, next: NextFunction) {
  try {
    const idClaseRecurrente = Number(req.body?.idClaseRecurrente);
    const idCliente = Number(req.body?.idCliente);
    const cuotaMensual = Number(req.body?.cuotaMensual ?? 0);

    if (!idClaseRecurrente || !idCliente) {
      res.status(400).json({ error: "Clase y alumno son obligatorios" });
      return;
    }

    const clase = await db("ClasesRecurrentes")
      .where("IdClaseRecurrente", idClaseRecurrente)
      .andWhere("Activo", 1)
      .first();
    if (!clase) {
      res.status(404).json({ error: "La clase no existe o está inactiva" });
      return;
    }

    const dup = await db("Matriculas")
      .where({ IdClaseRecurrente: idClaseRecurrente, IdCliente: idCliente, Activo: 1 })
      .first();
    if (dup) {
      res.status(409).json({ error: "El alumno ya está matriculado en esta clase" });
      return;
    }

    const [{ count }] = await db("Matriculas")
      .where({ IdClaseRecurrente: idClaseRecurrente, Activo: 1 })
      .count("* as count");
    if (Number(count) >= Number(clase.CapacidadMax)) {
      res.status(409).json({ error: "La clase está completa (sin plazas libres)" });
      return;
    }

    const [row] = await db("Matriculas")
      .insert({
        IdClaseRecurrente: idClaseRecurrente,
        IdCliente: idCliente,
        CuotaMensual: cuotaMensual,
        Estado: "ACTIVA",
      })
      .returning("IdMatricula");
    res.status(201).json({ id: typeof row === "object" ? row.IdMatricula : row });
  } catch (e) {
    next(e);
  }
}

/** PUT /matriculas/:id — actualiza cuota / estado */
export async function updateMatricula(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (b.cuotaMensual !== undefined) patch.CuotaMensual = Number(b.cuotaMensual);
    if (b.estado !== undefined) patch.Estado = b.estado;
    if (b.observaciones !== undefined) patch.Observaciones = b.observaciones;
    await db("Matriculas").where("IdMatricula", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

/** DELETE /matriculas/:id — da de baja al alumno (baja lógica) */
export async function deleteMatricula(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    await db("Matriculas")
      .where("IdMatricula", id)
      .update({ Activo: 0, Estado: "BAJA", FechaBaja: db.raw("CURRENT_DATE") });
    res.json({ success: true, message: "Alumno dado de baja de la clase" });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// ASIGNATURAS (Servicios de tipo asignatura)
// =========================================================

/** GET /asignaturas — lista de asignaturas/servicios activos */
export async function getAsignaturas(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await db("Servicios")
      .select("IdServicio as id", "Nombre", "Descripcion")
      .where("Activo", 1)
      .orderBy("Nombre", "asc");
    res.json({ data: rows, totalCount: rows.length });
  } catch (e) {
    next(e);
  }
}

/** POST /asignaturas — crear nueva asignatura */
export async function createAsignatura(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body?.nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }
    const [row] = await db("Servicios")
      .insert({
        Nombre: String(req.body.nombre).trim(),
        Descripcion: req.body.descripcion ?? null,
        Activo: 1,
      })
      .returning("IdServicio");
    res.status(201).json({ id: typeof row === "object" ? row.IdServicio : row });
  } catch (e) {
    next(e);
  }
}

/** PUT /asignaturas/:id — actualizar asignatura */
export async function updateAsignatura(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const b = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (b.nombre !== undefined) patch.Nombre = String(b.nombre).trim();
    if (b.descripcion !== undefined) patch.Descripcion = b.descripcion;
    if (Object.keys(patch).length) {
      await db("Servicios").where("IdServicio", id).update(patch);
    }
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

/** DELETE /asignaturas/:id — baja lógica de asignatura */
export async function deleteAsignatura(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    // Verificar que no esté en uso en clases
    const enUso = await db("ClasesRecurrentes").where("IdServicio", id).andWhere("Activo", 1).first();
    if (enUso) {
      return res.status(409).json({ error: "La asignatura está en uso en clases activas" });
    }
    await db("Servicios").where("IdServicio", id).update({ Activo: 0 });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// OPCIONES (para selects del formulario)
// =========================================================

/** GET /escola/opciones — instrumentos, profesores y alumnos activos */
export async function getOpcionesEscola(_req: Request, res: Response, next: NextFunction) {
  try {
    const instrumentos = await db("Servicios")
      .select("IdServicio as id", "Nombre")
      .where("Activo", 1)
      .orderBy("Nombre", "asc");

    const profesores = await db("Profesionales")
      .select("IdProfesional as id", "NombreCompleto", "Especialidad")
      .where("Activo", true)
      .orderBy("NombreCompleto", "asc");

    const alumnos = await db("clientes as c")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .select(
        "c.id",
        db.raw(
          `TRIM(CONCAT(COALESCE(cp.nombre, ''), ' ', COALESCE(cp.apellido1, ''), ' ', COALESCE(cp.apellido2, ''))) as "NombreCompleto"`
        )
      )
      .where("c.activo", 1)
      .orderBy("c.id", "asc");

    res.json({ instrumentos, profesores, alumnos });
  } catch (e) {
    next(e);
  }
}