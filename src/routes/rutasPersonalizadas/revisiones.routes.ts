// src/routes/rutasPersonalizadas/revisiones.routes.ts
import { Router } from "express";
import {
  getRevisionFull,
  createRevisionFull,
  updateRevisionFull,
  deleteRevisionFull,
  getHistoriaClinicaFull,
  updateHistoriaClinicaFull
} from "../../controllers/controllersPersonalizados/revisiones.controllers.js";

export const revisionesRouter = Router();

// Revisiones completas
revisionesRouter.get("/revisiones-full/:id", getRevisionFull);
revisionesRouter.post("/revisiones-full", createRevisionFull);
revisionesRouter.put("/revisiones-full/:id", updateRevisionFull);
revisionesRouter.delete("/revisiones-full/:id", deleteRevisionFull);

// Historia clínica
revisionesRouter.get("/historia-clinica-full/:idCliente", getHistoriaClinicaFull);
revisionesRouter.put("/historia-clinica-full/:idCliente", updateHistoriaClinicaFull);
