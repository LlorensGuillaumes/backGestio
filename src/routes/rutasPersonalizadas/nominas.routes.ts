// src/routes/rutasPersonalizadas/nominas.routes.ts
import { Router } from "express";
import {
  previewNominas,
  generarNominas,
  getNominas,
  getNomina,
  deleteNomina,
} from "../../controllers/controllersPersonalizados/nominas.controllers.js";

export const nominasRouter = Router();

nominasRouter.get("/nominas/preview", previewNominas);
nominasRouter.post("/nominas/generar", generarNominas);
nominasRouter.get("/nominas", getNominas);
nominasRouter.get("/nominas/:id", getNomina);
nominasRouter.delete("/nominas/:id", deleteNomina);
