// src/routes/rutasPersonalizadas/modosPago.routes.ts
import { Router } from "express";
import {
  getModosPago,
  getModoPago,
  createModoPago,
  updateModoPago,
  deleteModoPago,
} from "../../controllers/controllersPersonalizados/modosPago.controllers.js";

export const modosPagoRouter = Router();

modosPagoRouter.get("/modos-pago", getModosPago);
modosPagoRouter.get("/modos-pago/:id", getModoPago);
modosPagoRouter.post("/modos-pago", createModoPago);
modosPagoRouter.put("/modos-pago/:id", updateModoPago);
modosPagoRouter.delete("/modos-pago/:id", deleteModoPago);
