// src/controllers/controllersPersonalizados/rrhh.controllers.ts
// Controladores de RRHH - Usuarios como trabajadores
// Las tablas de usuarios, convenios, horarios y ausencias están en gestio_master

import type { Request, Response, NextFunction } from "express";
import { getMasterDb } from "../../db/masterDb.js";
import db from "../../db.js"; // Para FestivosEmpresa (está en gestio_db)

const masterDb = getMasterDb();

// =====================================================
// CONVENIOS
// =====================================================

/**
 * GET /rrhh/convenios
 */
export async function getConvenios(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = masterDb("convenios").orderBy("nombre", "asc");

    if (soloActivos) {
      query = query.where("activo", true);
    }

    const rows = await query;
    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rrhh/convenios
 */
export async function postConvenio(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, horas_anuales, dias_vacaciones, dias_convenio, descripcion } = req.body;

    if (!nombre?.trim()) {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    const [created] = await masterDb("convenios")
      .insert({
        nombre: nombre.trim(),
        horas_anuales: horas_anuales || 1800,
        dias_vacaciones: dias_vacaciones || 22,
        dias_convenio: dias_convenio || 0,
        descripcion: descripcion?.trim() || null,
        activo: true,
      })
      .returning("*");

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /rrhh/convenios/:id
 */
export async function putConvenio(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de convenio inválido" });
    }

    const { nombre, horas_anuales, dias_vacaciones, dias_convenio, descripcion, activo } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (nombre !== undefined) updateData.nombre = nombre?.trim() || null;
    if (horas_anuales !== undefined) updateData.horas_anuales = horas_anuales;
    if (dias_vacaciones !== undefined) updateData.dias_vacaciones = dias_vacaciones;
    if (dias_convenio !== undefined) updateData.dias_convenio = dias_convenio;
    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null;
    if (activo !== undefined) updateData.activo = activo;

    const [updated] = await masterDb("convenios")
      .where("id", id)
      .update(updateData)
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Convenio no encontrado" });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// USUARIOS (como trabajadores)
// =====================================================

/**
 * GET /rrhh/usuarios
 * Lista usuarios con información de trabajador (convenio, horarios, etc.)
 */
export async function getUsuariosTrabajadores(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Math.min(Number(req.query.take) || 50, 500);
    const offset = Number(req.query.offset) || 0;
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = masterDb("usuarios as u")
      .leftJoin("convenios as c", "u.id_convenio", "c.id")
      .select(
        "u.id",
        "u.username",
        "u.nombre",
        "u.email",
        "u.dni",
        "u.telefono",
        "u.puesto",
        "u.id_convenio",
        "c.nombre as nombre_convenio",
        "c.horas_anuales",
        "c.dias_vacaciones",
        "c.dias_convenio",
        "u.fecha_alta",
        "u.fecha_baja",
        "u.observaciones",
        "u.activo"
      )
      .orderBy("u.nombre", "asc");

    if (soloActivos) {
      query = query.where("u.activo", true);
    }

    const countQuery = masterDb("usuarios as u");
    if (soloActivos) {
      countQuery.where("u.activo", true);
    }
    const [{ count }] = await countQuery.count("* as count");

    const rows = await query.limit(take).offset(offset);

    res.json({
      rows,
      totalCount: Number(count),
      take,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /rrhh/usuarios/:id
 */
export async function getUsuarioTrabajador(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const usuario = await masterDb("usuarios as u")
      .leftJoin("convenios as c", "u.id_convenio", "c.id")
      .where("u.id", id)
      .select(
        "u.id",
        "u.username",
        "u.nombre",
        "u.email",
        "u.dni",
        "u.telefono",
        "u.puesto",
        "u.id_convenio",
        "c.nombre as nombre_convenio",
        "c.horas_anuales",
        "c.dias_vacaciones",
        "c.dias_convenio",
        "u.fecha_alta",
        "u.fecha_baja",
        "u.observaciones",
        "u.activo"
      )
      .first();

    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuario);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /rrhh/usuarios/:id
 * Actualiza datos de trabajador de un usuario (no credenciales)
 */
export async function putUsuarioTrabajador(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const {
      dni,
      telefono,
      puesto,
      id_convenio,
      fecha_alta,
      fecha_baja,
      observaciones,
    } = req.body;

    const updateData: Record<string, any> = { updated_at: new Date() };

    if (dni !== undefined) updateData.dni = dni?.trim() || null;
    if (telefono !== undefined) updateData.telefono = telefono?.trim() || null;
    if (puesto !== undefined) updateData.puesto = puesto?.trim() || null;
    if (id_convenio !== undefined) updateData.id_convenio = id_convenio || null;
    if (fecha_alta !== undefined) updateData.fecha_alta = fecha_alta || null;
    if (fecha_baja !== undefined) updateData.fecha_baja = fecha_baja || null;
    if (observaciones !== undefined) updateData.observaciones = observaciones?.trim() || null;

    const [updated] = await masterDb("usuarios")
      .where("id", id)
      .update(updateData)
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// HORARIOS DE USUARIO
// =====================================================

/**
 * GET /rrhh/usuarios/:id/horario
 */
export async function getUsuarioHorario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const horarios = await masterDb("horarios_usuario")
      .where("id_usuario", id)
      .where("activo", true)
      .orderBy("dia_semana", "asc");

    res.json({ rows: horarios });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /rrhh/usuarios/:id/horario
 */
export async function putUsuarioHorario(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const { horarios } = req.body;

    if (!Array.isArray(horarios)) {
      return res.status(400).json({ error: "Se esperaba un array de horarios" });
    }

    // Verificar que el usuario existe
    const usuario = await masterDb("usuarios").where("id", id).first();
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    await masterDb.transaction(async (trx) => {
      // Desactivar horarios anteriores
      await trx("horarios_usuario")
        .where("id_usuario", id)
        .update({ activo: false });

      // Insertar nuevos horarios
      for (const h of horarios) {
        if (h.dia_semana === undefined || h.dia_semana === null) continue;

        await trx("horarios_usuario")
          .insert({
            id_usuario: id,
            dia_semana: h.dia_semana,
            hora_inicio: h.hora_inicio || null,
            hora_fin: h.hora_fin || null,
            minutos_descanso: h.minutos_descanso || 0,
            activo: true,
          })
          .onConflict(["id_usuario", "dia_semana"])
          .merge();
      }
    });

    // Devolver horario actualizado
    const horariosActualizados = await masterDb("horarios_usuario")
      .where("id_usuario", id)
      .where("activo", true)
      .orderBy("dia_semana", "asc");

    res.json({ rows: horariosActualizados });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// AUSENCIAS DE USUARIO
// =====================================================

/**
 * GET /rrhh/usuarios/:id/ausencias
 */
export async function getUsuarioAusencias(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const anyo = req.query.anyo ? Number(req.query.anyo) : new Date().getFullYear();

    const ausencias = await masterDb("ausencias_usuario")
      .where("id_usuario", id)
      .where("activo", true)
      .whereRaw(`EXTRACT(YEAR FROM "fecha_inicio") = ?`, [anyo])
      .orderBy("fecha_inicio", "desc");

    res.json({ rows: ausencias, anyo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rrhh/usuarios/:id/ausencias
 */
export async function postUsuarioAusencia(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const { tipo, fecha_inicio, fecha_fin, computable, descripcion, estado } = req.body;

    if (!tipo || !fecha_inicio) {
      return res.status(400).json({ error: "tipo y fecha_inicio son obligatorios" });
    }

    // Verificar que el usuario existe
    const usuario = await masterDb("usuarios").where("id", id).first();
    if (!usuario) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const [created] = await masterDb("ausencias_usuario")
      .insert({
        id_usuario: id,
        tipo,
        fecha_inicio,
        fecha_fin: fecha_fin || null,
        computable: computable !== false,
        descripcion: descripcion?.trim() || null,
        estado: estado || "APROBADA",
        activo: true,
      })
      .returning("*");

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /rrhh/usuarios/:idUsuario/ausencias/:idAusencia
 */
export async function deleteUsuarioAusencia(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = Number(req.params.idUsuario);
    const idAusencia = Number(req.params.idAusencia);

    if (!Number.isFinite(idUsuario) || !Number.isFinite(idAusencia)) {
      return res.status(400).json({ error: "Ids inválidos" });
    }

    const [updated] = await masterDb("ausencias_usuario")
      .where("id", idAusencia)
      .where("id_usuario", idUsuario)
      .update({ activo: false, updated_at: new Date() })
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Ausencia no encontrada" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// =====================================================
// FESTIVOS (en gestio_db - por empresa)
// =====================================================

/**
 * GET /rrhh/festivos
 */
export async function getFestivos(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = req.query.anyo ? Number(req.query.anyo) : new Date().getFullYear();

    const festivos = await db("FestivosEmpresa")
      .where("Activo", 1)
      .andWhere(function () {
        this.where("Anyo", anyo).orWhere("Anual", true);
      })
      .orderBy("FechaInicio", "asc");

    res.json({ rows: festivos, anyo });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /rrhh/festivos
 */
export async function postFestivo(req: Request, res: Response, next: NextFunction) {
  try {
    const { Nombre, TipoFestivo, FechaInicio, FechaFin, Anual, Anyo, Observaciones } = req.body;

    if (!Nombre?.trim() || !TipoFestivo || !FechaInicio) {
      return res.status(400).json({ error: "Nombre, TipoFestivo y FechaInicio son obligatorios" });
    }

    const [created] = await db("FestivosEmpresa")
      .insert({
        Nombre: Nombre.trim(),
        TipoFestivo,
        FechaInicio,
        FechaFin: FechaFin || null,
        Anual: Anual || false,
        Anyo: Anyo || new Date().getFullYear(),
        Observaciones: Observaciones?.trim() || null,
        Activo: 1,
      })
      .returning("*");

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /rrhh/festivos/:id
 */
export async function deleteFestivo(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de festivo inválido" });
    }

    const [updated] = await db("FestivosEmpresa")
      .where("IdFestivo", id)
      .update({ Activo: 0 })
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Festivo no encontrado" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}
