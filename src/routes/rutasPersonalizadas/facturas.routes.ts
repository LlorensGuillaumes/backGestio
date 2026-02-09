// src/routes/rutasPersonalizadas/facturas.routes.ts
import { Router } from "express";
import {
  getFacturasVenta,
  getFacturasCompra,
  createFacturaAnticipo,
  createFacturaFinal,
  createFacturaAbono,
  getFacturasDocumento,
  getFactura
} from "../../controllers/controllersPersonalizados/facturas.controllers.js";

export const facturasRouter = Router();

// Facturas de venta
facturasRouter.get("/facturas/venta", getFacturasVenta);

// Facturas de compra
facturasRouter.get("/facturas/compra", getFacturasCompra);

// Facturas vinculadas a un documento (DEBE IR ANTES de :id para que no capture "documento" como id)
facturasRouter.get("/facturas/documento/:idDocumento", getFacturasDocumento);

// Factura individual
facturasRouter.get("/facturas/:id", getFactura);

// Crear factura de anticipo
facturasRouter.post("/facturas/anticipo", createFacturaAnticipo);

// Crear factura final (entrega)
facturasRouter.post("/facturas/final/:idDocumento", createFacturaFinal);

// Crear factura de abono (rectificativa)
facturasRouter.post("/facturas/abono", createFacturaAbono);
