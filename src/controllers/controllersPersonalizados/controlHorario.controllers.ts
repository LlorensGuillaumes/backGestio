// src/controllers/controllersPersonalizados/controlHorario.controllers.ts
// Controlador de control horario
// Convenios, horarios y ausencias están en gestio_master
// Festivos están en gestio_db (por empresa)

import type { Request, Response, NextFunction } from "express";
import db from "../../db.js"; // gestio_db para festivos
import { getMasterDb } from "../../db/masterDb.js"; // gestio_master para convenios
import * as controlHorarioService from "../../services/controlHorario.service.js";

const masterDb = getMasterDb();

// =====================================================
// FESTIVOS (en gestio_db - por empresa)
// =====================================================

/**
 * GET /festivos-empresa-full
 */
export async function getFestivosEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = req.query.anyo ? Number(req.query.anyo) : undefined;
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = db("FestivosEmpresa")
      .select("*")
      .orderBy("FechaInicio", "asc");

    if (soloActivos) {
      query = query.where("Activo", 1);
    }

    if (anyo) {
      query = query.where(function () {
        this.where("Anyo", anyo).orWhere("Anual", true);
      });
    }

    const rows = await query;
    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /festivos-empresa-post
 */
export async function postFestivoEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    const { Nombre, TipoFestivo, FechaInicio, FechaFin, Anual, Anyo, Observaciones } = req.body;

    if (!Nombre?.trim() || !TipoFestivo || !FechaInicio) {
      return res.status(400).json({ error: "Nombre, TipoFestivo y FechaInicio son obligatorios" });
    }

    const tiposValidos = ["NACIONAL", "AUTONOMICO", "LOCAL", "OTRO"];
    if (!tiposValidos.includes(TipoFestivo)) {
      return res.status(400).json({ error: `TipoFestivo debe ser uno de: ${tiposValidos.join(", ")}` });
    }

    const [created] = await db("FestivosEmpresa")
      .insert({
        Nombre: Nombre.trim(),
        TipoFestivo,
        FechaInicio,
        FechaFin: FechaFin || null,
        Anual: Boolean(Anual),
        Anyo: Anyo || new Date(FechaInicio).getFullYear(),
        Observaciones: Observaciones?.trim() || null,
        Activo: 1,
        FechaCreacion: new Date(),
      })
      .returning("*");

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /festivos-empresa-put/:id
 */
export async function putFestivoEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de festivo inválido" });
    }

    const { Nombre, TipoFestivo, FechaInicio, FechaFin, Anual, Anyo, Observaciones, Activo } = req.body;

    const updateData: Record<string, any> = {};

    if (Nombre !== undefined) updateData.Nombre = Nombre?.trim() || null;
    if (TipoFestivo !== undefined) {
      const tiposValidos = ["NACIONAL", "AUTONOMICO", "LOCAL", "OTRO"];
      if (!tiposValidos.includes(TipoFestivo)) {
        return res.status(400).json({ error: `TipoFestivo debe ser uno de: ${tiposValidos.join(", ")}` });
      }
      updateData.TipoFestivo = TipoFestivo;
    }
    if (FechaInicio !== undefined) updateData.FechaInicio = FechaInicio;
    if (FechaFin !== undefined) updateData.FechaFin = FechaFin || null;
    if (Anual !== undefined) updateData.Anual = Boolean(Anual);
    if (Anyo !== undefined) updateData.Anyo = Anyo;
    if (Observaciones !== undefined) updateData.Observaciones = Observaciones?.trim() || null;
    if (Activo !== undefined) updateData.Activo = Activo;

    const [updated] = await db("FestivosEmpresa")
      .where("IdFestivo", id)
      .update(updateData)
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Festivo no encontrado" });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// =====================================================
// CONVENIOS (en gestio_master - compartidos)
// =====================================================

/**
 * GET /convenios-full
 */
export async function getConveniosFull(req: Request, res: Response, next: NextFunction) {
  try {
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    let query = masterDb("convenios")
      .select("*")
      .orderBy("nombre", "asc");

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
 * POST /convenios-post
 */
export async function postConvenio(req: Request, res: Response, next: NextFunction) {
  try {
    const { nombre, horas_anuales, dias_vacaciones, dias_convenio, descripcion } = req.body;

    if (!nombre?.trim() || !horas_anuales) {
      return res.status(400).json({ error: "nombre y horas_anuales son obligatorios" });
    }

    const [created] = await masterDb("convenios")
      .insert({
        nombre: nombre.trim(),
        horas_anuales: Number(horas_anuales),
        dias_vacaciones: dias_vacaciones ?? 22,
        dias_convenio: dias_convenio ?? 0,
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
 * PUT /convenios-put/:id
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
    if (horas_anuales !== undefined) updateData.horas_anuales = Number(horas_anuales);
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
// CÁLCULOS DE HORAS Y CALENDARIO
// =====================================================

/**
 * GET /control-horario/calculo-horas/:anyo
 * Calcula las horas anuales de todos los usuarios
 */
export async function getCalculoHorasAnuales(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = Number(req.params.anyo);
    if (!Number.isFinite(anyo) || anyo < 2000 || anyo > 2100) {
      return res.status(400).json({ error: "Año inválido" });
    }

    const resultados = await controlHorarioService.calcularHorasAnuales(anyo);

    res.json({
      anyo,
      usuarios: resultados,
      totalCount: resultados.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /control-horario/calculo-horas/:anyo/:idUsuario
 * Calcula las horas anuales de un usuario específico
 */
export async function getCalculoHorasUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = Number(req.params.anyo);
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isFinite(anyo) || anyo < 2000 || anyo > 2100) {
      return res.status(400).json({ error: "Año inválido" });
    }
    if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({ error: "Id de usuario inválido" });
    }

    const resultado = await controlHorarioService.getResumenUsuario(idUsuario, anyo);

    if (!resultado) {
      return res.status(404).json({ error: "Usuario no encontrado o sin datos" });
    }

    res.json({
      anyo,
      usuario: resultado,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /control-horario/calendario/:anyo/:mes
 * Genera el calendario de un mes
 */
export async function getCalendarioMes(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = Number(req.params.anyo);
    const mes = Number(req.params.mes);
    const idUsuario = req.query.idUsuario ? Number(req.query.idUsuario) : undefined;

    if (!Number.isFinite(anyo) || anyo < 2000 || anyo > 2100) {
      return res.status(400).json({ error: "Año inválido" });
    }
    if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({ error: "Mes inválido (1-12)" });
    }

    const calendario = await controlHorarioService.generarCalendarioMes(anyo, mes, idUsuario);

    res.json({
      anyo,
      mes,
      ...calendario,
    });
  } catch (err) {
    next(err);
  }
}
