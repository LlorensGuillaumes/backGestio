// src/routes/rutasPersonalizadas/stock.routes.ts
import { Router } from "express";
import {
  getProductosStock,
  getMovimientosStock,
} from "../../controllers/controllersPersonalizados/stock.controllers.js";

export const stockRouter = Router();

stockRouter.get("/productos-stock", getProductosStock);
stockRouter.get("/movimientos-stock/:idProducto", getMovimientosStock);
