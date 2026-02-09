// src/routes/rutasPersonalizadas/mensajes.routes.ts
import { Router } from "express";
import {
  getBandejaEntrada,
  getEnviados,
  getMensaje,
  enviarMensaje,
  marcarLeido,
  archivarMensaje,
  getDestinatarios,
  eliminarMensaje,
  contarNoLeidos,
} from "../../controllers/controllersPersonalizados/mensajes.controller.js";

export const mensajesRouter = Router();

// Rutas de mensajes formales
mensajesRouter.get("/mensajes", getBandejaEntrada);
mensajesRouter.get("/mensajes/enviados", getEnviados);
mensajesRouter.get("/mensajes/destinatarios", getDestinatarios);
mensajesRouter.get("/mensajes/no-leidos", contarNoLeidos);
mensajesRouter.get("/mensajes/:id", getMensaje);
mensajesRouter.post("/mensajes", enviarMensaje);
mensajesRouter.put("/mensajes/:id/leer", marcarLeido);
mensajesRouter.put("/mensajes/:id/archivar", archivarMensaje);
mensajesRouter.delete("/mensajes/:id", eliminarMensaje);
