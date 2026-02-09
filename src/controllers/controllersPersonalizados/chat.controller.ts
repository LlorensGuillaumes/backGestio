// src/controllers/controllersPersonalizados/chat.controller.ts
import type { Request, Response, NextFunction } from "express";
import * as chatService from "../../services/chat.service.js";

/**
 * GET /chat/conversaciones
 * Lista las conversaciones del usuario
 */
export async function getConversaciones(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    // El usuario master no tiene conversaciones en la DB
    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ data: [] });
    }

    const idUsuario = rawUserId as number;
    const conversaciones = await chatService.getConversaciones(idUsuario);

    res.json({ data: conversaciones });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /chat/conversacion/:id
 * Obtiene los detalles de una conversación
 */
export async function getConversacion(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(404).json({ error: "Conversación no encontrada" });
    }

    const idUsuario = rawUserId as number;

    const idConversacion = Number(req.params.id);
    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de conversación inválido" });
    }

    const conversacion = await chatService.getConversacion(idConversacion, idUsuario);

    res.json({ data: conversacion });
  } catch (err: any) {
    if (err.message?.includes("no encontrada") || err.message?.includes("sin acceso")) {
      return res.status(404).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * POST /chat/conversacion/directa/:idUsuario
 * Inicia o recupera una conversación directa con otro usuario
 */
export async function iniciarConversacionDirecta(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "El usuario master no puede usar el chat" });
    }

    const idUsuarioActual = rawUserId as number;

    const idUsuarioDestino = Number(req.params.idUsuario);
    if (!Number.isFinite(idUsuarioDestino) || idUsuarioDestino <= 0) {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    if (idUsuarioActual === idUsuarioDestino) {
      return res.status(400).json({ error: "No puedes iniciar una conversación contigo mismo" });
    }

    // Verificar permisos de comunicación
    const puedenChatear = await chatService.puedenComunicarse(idUsuarioActual, idUsuarioDestino);
    if (!puedenChatear) {
      return res.status(403).json({ error: "No tienes permiso para comunicarte con este usuario" });
    }

    const conversacion = await chatService.getConversacionDirecta(idUsuarioActual, idUsuarioDestino);

    res.json({ data: conversacion });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /chat/grupo
 * Crea un nuevo grupo de chat
 */
export async function crearGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "El usuario master no puede crear grupos" });
    }

    const idUsuario = rawUserId as number;
    const { nombre, participantes } = req.body;

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return res.status(400).json({ error: "El nombre del grupo es requerido" });
    }

    if (!Array.isArray(participantes) || participantes.length === 0) {
      return res.status(400).json({ error: "Debe seleccionar al menos un participante" });
    }

    const conversacion = await chatService.crearGrupo(idUsuario, nombre.trim(), participantes);

    res.status(201).json({ data: conversacion });
  } catch (err: any) {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * POST /chat/grupo/:id/participantes
 * Añade un participante a un grupo
 */
export async function addParticipante(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "Operación no permitida" });
    }

    const idUsuario = rawUserId as number;
    const idConversacion = Number(req.params.id);
    const { idNuevoUsuario } = req.body;

    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de grupo inválido" });
    }

    if (!idNuevoUsuario || typeof idNuevoUsuario !== "number") {
      return res.status(400).json({ error: "ID de usuario inválido" });
    }

    await chatService.addParticipanteGrupo(idConversacion, idUsuario, idNuevoUsuario);

    res.json({ success: true });
  } catch (err: any) {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * DELETE /chat/grupo/:id/salir
 * Sale de un grupo
 */
export async function salirDeGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "Operación no permitida" });
    }

    const idUsuario = rawUserId as number;
    const idConversacion = Number(req.params.id);

    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de grupo inválido" });
    }

    await chatService.salirDeGrupo(idConversacion, idUsuario);

    res.json({ success: true });
  } catch (err: any) {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * PUT /chat/grupo/:id/nombre
 * Renombra un grupo
 */
export async function renombrarGrupo(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "Operación no permitida" });
    }

    const idUsuario = rawUserId as number;
    const idConversacion = Number(req.params.id);
    const { nombre } = req.body;

    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de grupo inválido" });
    }

    if (!nombre || typeof nombre !== "string" || nombre.trim().length === 0) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    await chatService.renombrarGrupo(idConversacion, idUsuario, nombre.trim());

    res.json({ success: true });
  } catch (err: any) {
    if (err.message) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * GET /chat/conversacion/:id/mensajes
 * Obtiene los mensajes de una conversación
 */
export async function getMensajes(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ data: [] });
    }

    const idUsuario = rawUserId as number;

    const idConversacion = Number(req.params.id);
    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de conversación inválido" });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const before = req.query.before ? Number(req.query.before) : undefined;

    const mensajes = await chatService.getMensajes(idConversacion, idUsuario, limit, before);

    res.json({ data: mensajes });
  } catch (err: any) {
    if (err.message?.includes("No tienes acceso")) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * POST /chat/conversacion/:id/mensajes
 * Envía un mensaje en una conversación
 */
export async function enviarMensaje(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.status(403).json({ error: "El usuario master no puede usar el chat" });
    }

    const idUsuario = rawUserId as number;

    const idConversacion = Number(req.params.id);
    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de conversación inválido" });
    }

    const { contenido, tipo, archivoUrl } = req.body;

    if (!contenido || typeof contenido !== "string" || contenido.trim().length === 0) {
      return res.status(400).json({ error: "El contenido del mensaje es requerido" });
    }

    const mensaje = await chatService.enviarMensaje(
      idConversacion,
      idUsuario,
      contenido.trim(),
      tipo || "TEXTO",
      archivoUrl
    );

    res.status(201).json({ data: mensaje });
  } catch (err: any) {
    if (err.message?.includes("No tienes acceso")) {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
}

/**
 * PUT /chat/conversacion/:id/leer
 * Marca los mensajes de la conversación como leídos
 */
export async function marcarLeidos(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ success: true });
    }

    const idUsuario = rawUserId as number;

    const idConversacion = Number(req.params.id);
    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de conversación inválido" });
    }

    await chatService.marcarLeidos(idConversacion, idUsuario);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /chat/usuarios-disponibles
 * Obtiene los usuarios con los que se puede chatear
 */
export async function getUsuariosDisponibles(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ data: [] });
    }

    const idUsuario = rawUserId as number;
    const usuarios = await chatService.getUsuariosDisponiblesChat(idUsuario);

    res.json({ data: usuarios });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /chat/conversacion/:id/silenciar
 * Silencia o reactiva notificaciones de una conversación
 */
export async function toggleSilenciar(req: Request, res: Response, next: NextFunction) {
  try {
    const rawUserId = req.user?.userId;
    if (!rawUserId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    if (rawUserId === "master" || typeof rawUserId !== "number") {
      return res.json({ success: true });
    }

    const idUsuario = rawUserId as number;

    const idConversacion = Number(req.params.id);
    if (!Number.isFinite(idConversacion) || idConversacion <= 0) {
      return res.status(400).json({ error: "ID de conversación inválido" });
    }

    const { silenciada } = req.body;
    if (typeof silenciada !== "boolean") {
      return res.status(400).json({ error: "El campo silenciada debe ser un booleano" });
    }

    await chatService.toggleSilenciar(idConversacion, idUsuario, silenciada);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /chat/no-leidos
 * Cuenta el total de mensajes no leídos en todas las conversaciones
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

    const count = await chatService.contarTotalNoLeidos(idUsuario);

    res.json({ count });
  } catch (err) {
    next(err);
  }
}
