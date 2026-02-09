// src/routes/rutasPersonalizadas/verifactu.routes.ts
import { Router } from "express";
import {
  getConfig,
  putConfig,
  enviarVenta,
  enviarCompra,
  getLogs,
  getLogDetalle,
  reintentar,
  getPendientes,
  testConexion,
} from "../../controllers/controllersPersonalizados/verifactu.controllers.js";

export const verifactuRouter = Router();

// Configuracion
verifactuRouter.get("/verifactu/config", getConfig);
verifactuRouter.put("/verifactu/config", putConfig);

// Envio de facturas
verifactuRouter.post("/verifactu/enviar/venta/:id", enviarVenta);
verifactuRouter.post("/verifactu/enviar/compra/:id", enviarCompra);

// Log de comunicaciones
verifactuRouter.get("/verifactu/log", getLogs);
verifactuRouter.get("/verifactu/log/:id", getLogDetalle);

// Reintentar envio
verifactuRouter.post("/verifactu/reintentar/:idLog", reintentar);

// Pendientes
verifactuRouter.get("/verifactu/pendientes", getPendientes);

// Test conexion
verifactuRouter.post("/verifactu/test-conexion", testConexion);
