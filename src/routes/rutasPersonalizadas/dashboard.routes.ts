// src/routes/rutasPersonalizadas/dashboard.routes.ts
import { Router } from "express";
import {
  getDashboardStats,
  getDashboardActividad,
} from "../../controllers/controllersPersonalizados/dashboard.controllers.js";

export const dashboardRouter = Router();

// Estadísticas generales
dashboardRouter.get("/dashboard/stats", getDashboardStats);

// Actividad reciente
dashboardRouter.get("/dashboard/actividad", getDashboardActividad);
