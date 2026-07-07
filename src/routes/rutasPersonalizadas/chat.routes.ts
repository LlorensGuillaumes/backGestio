// src/routes/rutasPersonalizadas/chat.routes.ts
import { Router } from "express";
import {
  getConversaciones,
  getConversacion,
  iniciarConversacionDirecta,
  getMensajes,
  enviarMensaje,
  marcarLeidos,
  getUsuariosDisponibles,
  toggleSilenciar,
  contarNoLeidos,
  crearGrupo,
  addParticipante,
  salirDeGrupo,
  renombrarGrupo,
} from "../../controllers/controllersPersonalizados/chat.controller.js";

export const chatRouter = Router();

// Rutas de chat
chatRouter.get("/chat/conversaciones", getConversaciones);
chatRouter.get("/chat/no-leidos", contarNoLeidos);
chatRouter.get("/chat/usuarios-disponibles", getUsuariosDisponibles);
chatRouter.get("/chat/conversacion/:id", getConversacion);
chatRouter.post("/chat/conversacion/directa/:idUsuario", iniciarConversacionDirecta);
chatRouter.get("/chat/conversacion/:id/mensajes", getMensajes);
chatRouter.post("/chat/conversacion/:id/mensajes", enviarMensaje);
chatRouter.put("/chat/conversacion/:id/leer", marcarLeidos);
chatRouter.put("/chat/conversacion/:id/silenciar", toggleSilenciar);

// Rutas de grupos
chatRouter.post("/chat/grupo", crearGrupo);
chatRouter.post("/chat/grupo/:id/participantes", addParticipante);
chatRouter.delete("/chat/grupo/:id/salir", salirDeGrupo);
chatRouter.put("/chat/grupo/:id/nombre", renombrarGrupo);
