// src/routes/rutasPersonalizadas/documentos.routes.ts
import { Router } from "express";
import {
  getDocumentosFull,
  getDocumento,
  postDocumento,
  putDocumento,
  cambiarEstadoDocumento,
  addPagoDocumento,
  getClienteDocumentos,
} from "../../controllers/controllersPersonalizados/documentos.controllers.js";

export const documentosRouter = Router();

// Listado con filtros
documentosRouter.get("/documentos-full", getDocumentosFull);

// CRUD
documentosRouter.get("/documentos/:id", getDocumento);
documentosRouter.post("/documentos-post", postDocumento);
documentosRouter.put("/documentos-put/:id", putDocumento);

// Acciones especiales
documentosRouter.put("/documentos/:id/estado", cambiarEstadoDocumento);
documentosRouter.post("/documentos/:id/pagos", addPagoDocumento);

// Documentos de un cliente
documentosRouter.get("/clientes/:id/documentos", getClienteDocumentos);
