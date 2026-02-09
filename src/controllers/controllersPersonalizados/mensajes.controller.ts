// src/controllers/controllersPersonalizados/mensajes.controller.ts
import type { Request, Response, NextFunction } from "express";
import * as mensajesService from "../../services/mensajesFormales.service.js";

/**
 * GET /mensajes
 * Obtiene la bandeja de entrada del usuario
 */
export async function getBandejaEntrada(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    // El usuario master no tiene mensajes en la DB
    if (rawUserId === "master" || typeof rawUserId !== "number") {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      return res.json({ data: [], total: 0, limit, offset });
    }

    const idUsuario = rawUserId as number;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const filtros: mensajesService.FiltrosMensaje = {};

    if (req.query.noLeidos === "1" || req.query.noLeidos === "true") {
      filtros.soloNoLeidos = true;
    }

    if (req.query.archivados === "1" || req.query.archivados === "true") {
      filtros.soloArchivados = true;
    } else if (req.query.archivados === "0" || req.query.archivados === "false") {
      filtros.soloArchivados = false;
    }

    if (req.query.prioridad) {
      filtros.prioridad = req.query.prioridad as mensajesService.Prioridad;
    }

    if (req.query.q) {
      filtros.busqueda = req.query.q as string;
    }

    const resultado = await mensajesService.getBandejaEntrada(idUsuario, filtros, limit, offset);

    res.json({
      data: resultado.mensajes,
      total: resultado.total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /mensajes/enviados
 * Obtiene los mensajes enviados por el usuario
 */
export async function getEnviados(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      return res.json({ data: [], total: 0, limit, offset });
    }

    const idUsuario = rawUserId as number;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const resultado = await mensajesService.getEnviados(idUsuario, limit, offset);

    res.json({
      data: resultado.mensajes,
      total: resultado.total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /mensajes/:id
 * Obtiene un mensaje específico
 */
export async function getMensaje(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    const idUsuario = rawUserId as number;

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de mensaje inválido" });
    }

    // Primero intentar como destinatario
    let mensaje = await mensajesService.getMensaje(id, idUsuario);

    if (!mensaje) {
      // Si no es destinatario, intentar como autor
      const mensajeEnviado = await mensajesService.getMensajeEnviado(id, idUsuario);
      if (mensajeEnviado) {
        return res.json({ data: mensajeEnviado, tipo: "enviado" });
      }
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.json({ data: mensaje, tipo: "recibido" });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /mensajes
 * Envía un nuevo mensaje formal
 */
export async function enviarMensaje(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "El usuario master no puede enviar mensajes" });
    }

    const idUsuario = rawUserId as number;

    const { destinatarios, asunto, contenido, prioridad } = req.body;

    // Validaciones
    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      return res.status(400).json({ error: "Debe especificar al menos un destinatario" });
    }

    if (!asunto || typeof asunto !== "string" || asunto.trim().length === 0) {
      return res.status(400).json({ error: "El asunto es requerido" });
    }

    if (!contenido || typeof contenido !== "string" || contenido.trim().length === 0) {
      return res.status(400).json({ error: "El contenido es requerido" });
    }

    const prioridadesValidas = ["BAJA", "NORMAL", "ALTA", "URGENTE"];
    if (prioridad && !prioridadesValidas.includes(prioridad)) {
      return res.status(400).json({ error: "Prioridad inválida" });
    }

    const mensaje = await mensajesService.enviarMensaje(
      idUsuario,
      destinatarios,
      asunto.trim(),
      contenido.trim(),
      prioridad || "NORMAL"
    );

    res.status(201).json({ data: mensaje });
  } catch (err: any) {
    if (err.message?.includes("destinatario")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * PUT /mensajes/:id/leer
 * Marca un mensaje como leído
 */
export async function marcarLeido(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ success: true });
    }

    const idUsuario = rawUserId as number;

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de mensaje inválido" });
    }

    const actualizado = await mensajesService.marcarLeido(id, idUsuario);

    if (!actualizado) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /mensajes/:id/archivar
 * Archiva o desarchiva un mensaje
 */
export async function archivarMensaje(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ success: true });
    }

    const idUsuario = rawUserId as number;

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de mensaje inválido" });
    }

    const { archivado } = req.body;
    const archivar = archivado !== false; // Por defecto archiva

    const actualizado = await mensajesService.archivar(id, idUsuario, archivar);

    if (!actualizado) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /mensajes/destinatarios
 * Obtiene la lista de usuarios disponibles como destinatarios
 */
export async function getDestinatarios(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ data: [] });
    }

    const idUsuario = rawUserId as number;
    const destinatarios = await mensajesService.getDestinatariosDisponibles(idUsuario);

    res.json({ data: destinatarios });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /mensajes/:id
 * Elimina (archiva) un mensaje
 */
export async function eliminarMensaje(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ success: true });
    }

    const idUsuario = rawUserId as number;

    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "ID de mensaje inválido" });
    }

    const eliminado = await mensajesService.eliminarMensaje(id, idUsuario);

    if (!eliminado) {
      return res.status(404).json({ error: "Mensaje no encontrado" });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /mensajes/no-leidos
 * Cuenta los mensajes no leídos
 */
export async function contarNoLeidos(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ count: 0 });
    }

    const idUsuario = rawUserId as number;

    const count = await mensajesService.contarNoLeidos(idUsuario);

    res.json({ count });
  } catch (err) {
    next(err);
  }
}
