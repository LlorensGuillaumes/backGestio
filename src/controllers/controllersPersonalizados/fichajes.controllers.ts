// src/controllers/controllersPersonalizados/fichajes.controllers.ts
// Controlador de fichajes de entrada/salida

import type { Request, Response, NextFunction } from "express";
import * as fichajesService from "../../services/fichajes.service.js";
import { getMasterDb } from "../../db/masterDb.js";

const masterDb = getMasterDb();

/**
 * POST /fichajes/fichar
 * Registrar fichaje (validación de credenciales en body, no requiere sesión)
 */
export async function fichar(req: Request, res: Response, next: NextFunction) {
  try {
    const { username, password, tipo, observaciones } = req.body;

    if (!username?.trim() || !password) {
      return res.status(400).json({
        error: "Credenciales requeridas",
        message: "Debe proporcionar usuario y contraseña",
      });
    }

    // Validar credenciales
    const validacion = await fichajesService.validarCredencialesFichaje(
      username.trim(),
      password
    );

    if (!validacion.valido || !validacion.usuario) {
      return res.status(401).json({
        error: "Credenciales inválidas",
        message: "Usuario o contraseña incorrectos",
      });
    }

    // Detectar tipo si no se especifica
    let tipoFichaje: "ENTRADA" | "SALIDA" = tipo;
    if (!tipoFichaje) {
      const estado = await fichajesService.detectarTipoFichaje(validacion.usuario.id);
      tipoFichaje = estado.tipoSugerido;
    }

    // Validar que el tipo sea correcto
    if (!["ENTRADA", "SALIDA"].includes(tipoFichaje)) {
      return res.status(400).json({
        error: "Tipo inválido",
        message: "El tipo debe ser ENTRADA o SALIDA",
      });
    }

    // Obtener IP del cliente
    const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || null;

    // Registrar fichaje (el usuario se registra a sí mismo)
    const resultado = await fichajesService.registrarFichaje(
      validacion.usuario.id,
      validacion.usuario.id,
      tipoFichaje,
      ipAddress ?? undefined,
      observaciones
    );

    res.status(201).json({
      success: true,
      fichaje: resultado.fichaje,
      advertencias: resultado.advertencias,
      mensaje: resultado.mensaje,
      usuario: {
        id: validacion.usuario.id,
        nombre: validacion.usuario.nombre,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /fichajes/estado/:idUsuario
 * Obtener estado actual del fichaje de un usuario
 */
export async function getEstadoUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID de usuario debe ser un número válido",
      });
    }

    const estado = await fichajesService.detectarTipoFichaje(idUsuario);

    res.json(estado);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /fichajes/estado-por-username/:username
 * Obtener estado actual del fichaje por username (para el modal)
 */
export async function getEstadoPorUsername(req: Request, res: Response, next: NextFunction) {
  try {
    const { username } = req.params;

    if (!username?.trim()) {
      return res.status(400).json({
        error: "Username requerido",
        message: "Debe proporcionar un nombre de usuario",
      });
    }

    // Buscar usuario
    const columns = await masterDb.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'usuarios' AND table_schema = 'public'
    `);
    const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());
    const hasNombreUsuario = columnNames.includes('nombreusuario');
    const usernameColumn = hasNombreUsuario ? 'nombreUsuario' : 'username';

    const usuario = await masterDb("usuarios")
      .where(usernameColumn, username.trim())
      .where("activo", true)
      .first();

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado",
        message: "No existe un usuario activo con ese nombre",
      });
    }

    const estado = await fichajesService.detectarTipoFichaje(usuario.id);

    res.json({
      ...estado,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /fichajes
 * Listar fichajes con filtros
 */
export async function getFichajes(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      idUsuario,
      fechaDesde,
      fechaHasta,
      tipo,
      soloConAdvertencias,
    } = req.query;

    const fichajes = await fichajesService.getFichajes({
      idUsuario: idUsuario ? Number(idUsuario) : undefined,
      fechaDesde: fechaDesde as string,
      fechaHasta: fechaHasta as string,
      tipo: tipo as "ENTRADA" | "SALIDA" | undefined,
      soloConAdvertencias: soloConAdvertencias === "true",
    });

    res.json({
      rows: fichajes,
      totalCount: fichajes.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /fichajes/usuario/:id
 * Obtener fichajes de un usuario específico
 */
export async function getFichajesUsuario(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = Number(req.params.id);

    if (!Number.isFinite(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID de usuario debe ser un número válido",
      });
    }

    const { fechaDesde, fechaHasta } = req.query;

    const fichajes = await fichajesService.getFichajes({
      idUsuario,
      fechaDesde: fechaDesde as string,
      fechaHasta: fechaHasta as string,
    });

    res.json({
      rows: fichajes,
      totalCount: fichajes.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /fichajes/:id
 * Corregir un fichaje existente
 */
export async function updateFichaje(req: Request, res: Response, next: NextFunction) {
  try {
    const idFichaje = Number(req.params.id);

    if (!Number.isFinite(idFichaje) || idFichaje <= 0) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID de fichaje debe ser un número válido",
      });
    }

    const { hora, tipo, motivo } = req.body;

    if (!hora || !tipo || !motivo?.trim()) {
      return res.status(400).json({
        error: "Datos incompletos",
        message: "Debe proporcionar hora, tipo y motivo de la corrección",
      });
    }

    if (!["ENTRADA", "SALIDA"].includes(tipo)) {
      return res.status(400).json({
        error: "Tipo inválido",
        message: "El tipo debe ser ENTRADA o SALIDA",
      });
    }

    // Obtener ID del usuario que hace la corrección
    const idUsuarioRegistro = req.user?.userId as number;

    const resultado = await fichajesService.corregirFichaje(
      idFichaje,
      idUsuarioRegistro,
      hora,
      tipo,
      motivo.trim()
    );

    if (!resultado.success) {
      return res.status(404).json({
        error: "Error",
        message: resultado.mensaje,
      });
    }

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /fichajes/:id
 * Eliminar (soft delete) un fichaje
 */
export async function deleteFichaje(req: Request, res: Response, next: NextFunction) {
  try {
    const idFichaje = Number(req.params.id);

    if (!Number.isFinite(idFichaje) || idFichaje <= 0) {
      return res.status(400).json({
        error: "ID inválido",
        message: "El ID de fichaje debe ser un número válido",
      });
    }

    const eliminado = await fichajesService.eliminarFichaje(idFichaje);

    if (!eliminado) {
      return res.status(404).json({
        error: "No encontrado",
        message: "Fichaje no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Fichaje eliminado correctamente",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /fichajes/manual
 * Crear fichaje manual (admin)
 */
export async function crearFichajeManual(req: Request, res: Response, next: NextFunction) {
  try {
    const { idUsuario, fecha, hora, tipo, motivo } = req.body;

    if (!idUsuario || !fecha || !hora || !tipo || !motivo?.trim()) {
      return res.status(400).json({
        error: "Datos incompletos",
        message: "Debe proporcionar idUsuario, fecha, hora, tipo y motivo",
      });
    }

    if (!["ENTRADA", "SALIDA"].includes(tipo)) {
      return res.status(400).json({
        error: "Tipo inválido",
        message: "El tipo debe ser ENTRADA o SALIDA",
      });
    }

    // Verificar que el usuario existe
    const usuario = await masterDb("usuarios")
      .where("id", idUsuario)
      .first();

    if (!usuario) {
      return res.status(404).json({
        error: "Usuario no encontrado",
        message: "El usuario especificado no existe",
      });
    }

    // Obtener ID del usuario que crea el fichaje
    const idUsuarioRegistro = req.user?.userId as number;
    const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString() || null;

    const resultado = await fichajesService.crearFichajeManual(
      idUsuario,
      idUsuarioRegistro,
      fecha,
      hora,
      tipo,
      motivo.trim(),
      ipAddress ?? undefined
    );

    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /fichajes/resumen/:anyo/:mes
 * Obtener resumen mensual de fichajes
 */
export async function getResumenMensual(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = Number(req.params.anyo);
    const mes = Number(req.params.mes);

    if (!Number.isFinite(anyo) || anyo < 2000 || anyo > 2100) {
      return res.status(400).json({
        error: "Año inválido",
        message: "El año debe estar entre 2000 y 2100",
      });
    }

    if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({
        error: "Mes inválido",
        message: "El mes debe estar entre 1 y 12",
      });
    }

    const resumen = await fichajesService.getResumenMensual(anyo, mes);

    res.json({
      anyo,
      mes,
      usuarios: resumen,
      totalCount: resumen.length,
    });
  } catch (err) {
    next(err);
  }
}
