// src/routes/rutasPersonalizadas/caja.routes.ts
import { Router } from "express";
import {
  getMovimientosCaja,
  getResumenCaja,
  createMovimientoCaja,
  registrarCobroFactura,
  getMovimientoCaja,
  deleteMovimientoCaja,
  createTicketVenta,
  getClienteFacturaSimplificada,
} from "../../controllers/controllersPersonalizados/caja.controllers.js";

export const cajaRouter = Router();

// Resumen de caja (debe ir antes de :id)
cajaRouter.get("/caja/resumen", getResumenCaja);

// Listado de movimientos
cajaRouter.get("/caja/movimientos", getMovimientosCaja);

// Registrar cobro de factura (endpoint específico)
cajaRouter.post("/caja/cobro-factura", registrarCobroFactura);

// Ticket de venta (POS)
cajaRouter.post("/caja/ticket", createTicketVenta);

// Cliente por defecto para factura simplificada
cajaRouter.get("/clientes/default-factura-simplificada", getClienteFacturaSimplificada);

// CRUD básico de movimientos
cajaRouter.get("/caja/movimientos/:id", getMovimientoCaja);
cajaRouter.post("/caja/movimientos", createMovimientoCaja);
cajaRouter.delete("/caja/movimientos/:id", deleteMovimientoCaja);
