// src/routes/rutasPersonalizadas/servicios.routes.ts
import { Router } from "express";
import {
  getServiciosFull,
  getServicio,
  createServicio,
  updateServicio,
  deleteServicio,
  getFamiliasServiciosFull,
} from "../../controllers/controllersPersonalizados/servicios.controllers.js";

export const serviciosRouter = Router();

// Familias de servicios con subfamilias
serviciosRouter.get("/familias-servicios-full", getFamiliasServiciosFull);

// CRUD de servicios
serviciosRouter.get("/servicios-full", getServiciosFull);
serviciosRouter.get("/servicios/:id", getServicio);
serviciosRouter.post("/servicios", createServicio);
serviciosRouter.put("/servicios/:id", updateServicio);
serviciosRouter.delete("/servicios/:id", deleteServicio);
