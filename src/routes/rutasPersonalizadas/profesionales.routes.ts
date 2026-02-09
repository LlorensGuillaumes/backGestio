// src/routes/rutasPersonalizadas/profesionales.routes.ts
import { Router } from "express";
import {
  getProfesionales,
  getProfesional,
  createProfesional,
  updateProfesional,
  deleteProfesional,
} from "../../controllers/controllersPersonalizados/profesionales.controllers.js";

export const profesionalesRouter = Router();

profesionalesRouter.get("/profesionales", getProfesionales);
profesionalesRouter.get("/profesionales/:id", getProfesional);
profesionalesRouter.post("/profesionales", createProfesional);
profesionalesRouter.put("/profesionales/:id", updateProfesional);
profesionalesRouter.delete("/profesionales/:id", deleteProfesional);
