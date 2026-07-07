// src/controllers/controllersPersonalizados/notificaciones.controller.ts
import type { Request, Response, NextFunction } from "express";
import * as notificacionesService from "../../services/notificaciones.service.js";

/**
 * GET /notificaciones
 * Obtiene las notificaciones del usuario autenticado
 */
export async function getNotificaciones(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;

    // Master user doesn't have notifications - return empty
    if (idUsuario === "master") {
      return res.json({ data: [], total: 0, limit: 50, offset: 0 });
    }

    if (!idUsuario) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const soloNoLeidas = req.query.noLeidas === "1" || req.query.noLeidas === "true";
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const resultado = await notificacionesService.getNotificacionesUsuario(
      idUsuario,
      soloNoLeidas,
      limit,
      offset
    );

    res.json({
      data: resultado.notificaciones,
      total: resultado.total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /notificaciones/count
 * Cuenta las notificaciones no leídas
 */
export async function getNotificacionesCount(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;

    // Master user doesn't have notifications - return 0
    if (idUsuario === "master") {
      return res.json({ count: 0 });
    }

    if (!idUsuario) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const count = await notificacionesService.contarNoLeidas(idUsuario);

    res.json({ count });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notificaciones/:id/leer
 * Marca una notificación como leída
 */
export async function marcarLeida(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario || idUsuario === "master") {
      return res.status(401).json({ error: "No autenticado" });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    const actualizada = await notificacionesService.marcarLeida(id, idUsuario);

    if (!actualizada) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notificaciones/leer-todas
 * Marca todas las notificaciones como leídas
 */
export async function marcarTodasLeidas(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario || idUsuario === "master") {
      return res.status(401).json({ error: "No autenticado" });
    }

    const cantidad = await notificacionesService.marcarTodasLeidas(idUsuario);

    res.json({ success: true, cantidad });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /notificaciones/preferencias
 * Obtiene las preferencias de notificación del usuario
 */
export async function getPreferencias(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;

    // Master user doesn't have notification preferences - return empty
    if (idUsuario === "master") {
      return res.json({ data: [] });
    }

    if (!idUsuario) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const preferencias = await notificacionesService.getPreferenciasUsuario(idUsuario);

    res.json({ data: preferencias });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /notificaciones/preferencias
 * Actualiza las preferencias de notificación del usuario
 */
export async function actualizarPreferencias(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario || idUsuario === "master") {
      return res.status(401).json({ error: "No autenticado" });
    }

    const { preferencias } = req.body;

    if (!Array.isArray(preferencias)) {
      return res.status(400).json({ error: "Preferencias inválidas" });
    }

    await notificacionesService.actualizarPreferenciasUsuario(idUsuario, preferencias);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /notificaciones/:id
 * Elimina una notificación
 */
export async function eliminarNotificacion(req: Request, res: Response, next: NextFunction) {
  try {
    const idUsuario = req.user?.userId;
    if (!idUsuario || idUsuario === "master") {
      return res.status(401).json({ error: "No autenticado" });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de notificación inválido" });
    }

    const eliminada = await notificacionesService.eliminarNotificacion(id, idUsuario);

    if (!eliminada) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /notificaciones/tipos
 * Obtiene los tipos de notificación disponibles
 */
export async function getTiposNotificacion(req: Request, res: Response, next: NextFunction) {
  try {
    const tipos = await notificacionesService.getTiposNotificacion();
    res.json({ data: tipos });
  } catch (err) {
    next(err);
  }
}
