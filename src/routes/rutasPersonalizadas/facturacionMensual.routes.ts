// src/routes/rutasPersonalizadas/facturacionMensual.routes.ts
import { Router } from "express";
import {
  previewMensual,
  generarMensual,
  previewMatriculas,
  generarMatriculas,
  generarMatriculaAlumno,
} from "../../controllers/controllersPersonalizados/facturacionMensual.controllers.js";

export const facturacionMensualRouter = Router();

facturacionMensualRouter.get("/facturacion-mensual/preview", previewMensual);
facturacionMensualRouter.post("/facturacion-mensual/generar", generarMensual);
facturacionMensualRouter.get("/facturacion-matriculas/preview", previewMatriculas);
facturacionMensualRouter.post("/facturacion-matriculas/generar", generarMatriculas);
facturacionMensualRouter.post("/facturacion-matriculas/alumno", generarMatriculaAlumno);
