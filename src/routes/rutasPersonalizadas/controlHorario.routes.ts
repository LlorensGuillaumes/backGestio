// src/routes/rutasPersonalizadas/controlHorario.routes.ts
import { Router } from "express";
import {
  getFestivosEmpresa,
  postFestivoEmpresa,
  putFestivoEmpresa,
  getConveniosFull,
  postConvenio,
  putConvenio,
  getCalculoHorasAnuales,
  getCalculoHorasUsuario,
  getCalendarioMes,
} from "../../controllers/controllersPersonalizados/controlHorario.controllers.js";

export const controlHorarioRouter = Router();

// Festivos empresa
controlHorarioRouter.get("/festivos-empresa-full", getFestivosEmpresa);
controlHorarioRouter.post("/festivos-empresa-post", postFestivoEmpresa);
controlHorarioRouter.put("/festivos-empresa-put/:id", putFestivoEmpresa);

// Convenios
controlHorarioRouter.get("/convenios-full", getConveniosFull);
controlHorarioRouter.post("/convenios-post", postConvenio);
controlHorarioRouter.put("/convenios-put/:id", putConvenio);

// Control horario - Cálculos
controlHorarioRouter.get("/control-horario/calculo-horas/:anyo", getCalculoHorasAnuales);
controlHorarioRouter.get("/control-horario/calculo-horas/:anyo/:idUsuario", getCalculoHorasUsuario);

// Control horario - Calendario
controlHorarioRouter.get("/control-horario/calendario/:anyo/:mes", getCalendarioMes);
