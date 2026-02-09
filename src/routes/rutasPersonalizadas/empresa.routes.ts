// src/routes/rutasPersonalizadas/empresa.routes.ts
import { Router } from "express";
import {
  getDatosEmpresa,
  putDatosEmpresa,
} from "../../controllers/controllersPersonalizados/empresa.controllers.js";

export const empresaRouter = Router();

// Datos de empresa
empresaRouter.get("/empresa/datos", getDatosEmpresa);
empresaRouter.put("/empresa/datos", putDatosEmpresa);
