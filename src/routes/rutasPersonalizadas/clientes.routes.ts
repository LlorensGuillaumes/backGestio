// src/routes/clientes.routes.ts
import { Router } from "express";
import {
  getClientesFull,
  getClienteFacturas,
  getClienteRevisiones,
  getClienteUltimaGraduacion,
  getClienteDescuento,
  getCliente,
  postCliente,
  putCliente,
} from "../../controllers/controllersPersonalizados/clientes.controllers.js";


export const clientesRouter = Router();

clientesRouter.get("/clientes-full", getClientesFull);
clientesRouter.get("/clientes/:id", getCliente);
clientesRouter.get("/clientes/:id/facturas", getClienteFacturas);
clientesRouter.get("/clientes/:id/revisiones", getClienteRevisiones);
clientesRouter.get("/clientes/:id/ultima-graduacion", getClienteUltimaGraduacion);
clientesRouter.get("/clientes/:id/descuento", getClienteDescuento);
// /clientes/:id/documentos está en documentos.routes.ts
clientesRouter.post("/clientes-post", postCliente);
clientesRouter.put("/clientes-put/:id", putCliente);
// POST /subfamilias-clientes lo maneja el CRUD genérico (el frontend crea las acciones después)
