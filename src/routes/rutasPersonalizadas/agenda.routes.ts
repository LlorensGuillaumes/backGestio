// src/routes/rutasPersonalizadas/agenda.routes.ts
import { Router } from "express";
import {
  getCitas,
  getCita,
  postCita,
  putCita,
  deleteCita,
  cambiarEstadoCita,
  getCitasDia,
  buscarClientes,
} from "../../controllers/controllersPersonalizados/agenda.controllers.js";

export const agendaRouter = Router();

// Buscar clientes (para autocompletado)
agendaRouter.get("/agenda/buscar-clientes", buscarClientes);

// Citas del día
agendaRouter.get("/agenda/citas-dia/:fecha", getCitasDia);

// CRUD de citas
agendaRouter.get("/agenda/citas", getCitas);
agendaRouter.get("/agenda/citas/:id", getCita);
agendaRouter.post("/agenda/citas", postCita);
agendaRouter.put("/agenda/citas/:id", putCita);
agendaRouter.delete("/agenda/citas/:id", deleteCita);

// Cambiar estado de cita
agendaRouter.put("/agenda/citas/:id/estado", cambiarEstadoCita);
