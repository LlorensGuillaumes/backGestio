// src/routes/rutasPersonalizadas/notificaciones.routes.ts
import { Router } from "express";
import {
  getNotificaciones,
  getNotificacionesCount,
  marcarLeida,
  marcarTodasLeidas,
  getPreferencias,
  actualizarPreferencias,
  eliminarNotificacion,
  getTiposNotificacion,
} from "../../controllers/controllersPersonalizados/notificaciones.controller.js";

export const notificacionesRouter = Router();

// Rutas de notificaciones
notificacionesRouter.get("/notificaciones", getNotificaciones);
notificacionesRouter.get("/notificaciones/count", getNotificacionesCount);
notificacionesRouter.get("/notificaciones/tipos", getTiposNotificacion);
notificacionesRouter.get("/notificaciones/preferencias", getPreferencias);
notificacionesRouter.put("/notificaciones/preferencias", actualizarPreferencias);
notificacionesRouter.put("/notificaciones/leer-todas", marcarTodasLeidas);
notificacionesRouter.put("/notificaciones/:id/leer", marcarLeida);
notificacionesRouter.delete("/notificaciones/:id", eliminarNotificacion);
