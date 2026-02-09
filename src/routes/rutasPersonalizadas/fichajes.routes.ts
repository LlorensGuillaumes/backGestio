// src/routes/rutasPersonalizadas/fichajes.routes.ts
import { Router } from "express";
import {
  fichar,
  getEstadoUsuario,
  getEstadoPorUsername,
  getFichajes,
  getFichajesUsuario,
  updateFichaje,
  deleteFichaje,
  crearFichajeManual,
  getResumenMensual,
} from "../../controllers/controllersPersonalizados/fichajes.controllers.js";
import { requirePermission } from "../../middlewares/authorize.js";

// =====================================================
// RUTAS PÚBLICAS (sin autenticación, validación en body)
// Se registran ANTES del middleware de autenticación
// =====================================================
export const fichajesPublicRouter = Router();

// POST /fichajes/fichar - Fichar (cualquier usuario con sus credenciales)
fichajesPublicRouter.post("/fichajes/fichar", fichar);

// GET /fichajes/estado-por-username/:username - Estado por username (para el modal antes de fichar)
fichajesPublicRouter.get("/fichajes/estado-por-username/:username", getEstadoPorUsername);

// =====================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// Se registran DESPUÉS del middleware de autenticación
// =====================================================
export const fichajesRouter = Router();

// GET /fichajes/estado/:idUsuario - Estado del fichaje de un usuario
fichajesRouter.get("/fichajes/estado/:idUsuario", getEstadoUsuario);

// GET /fichajes - Listar todos los fichajes (requiere permiso rrhh.fichajes)
fichajesRouter.get(
  "/fichajes",
  requirePermission("rrhh.fichajes", "ver"),
  getFichajes
);

// GET /fichajes/usuario/:id - Fichajes de un usuario específico
fichajesRouter.get(
  "/fichajes/usuario/:id",
  requirePermission("rrhh.fichajes", "ver"),
  getFichajesUsuario
);

// GET /fichajes/resumen/:anyo/:mes - Resumen mensual
fichajesRouter.get(
  "/fichajes/resumen/:anyo/:mes",
  requirePermission("rrhh.fichajes", "ver"),
  getResumenMensual
);

// PUT /fichajes/:id - Corregir fichaje (requiere permiso gestionar)
fichajesRouter.put(
  "/fichajes/:id",
  requirePermission("rrhh.fichajes.gestionar", "editar"),
  updateFichaje
);

// DELETE /fichajes/:id - Eliminar fichaje (soft delete)
fichajesRouter.delete(
  "/fichajes/:id",
  requirePermission("rrhh.fichajes.gestionar", "eliminar"),
  deleteFichaje
);

// POST /fichajes/manual - Crear fichaje manual
fichajesRouter.post(
  "/fichajes/manual",
  requirePermission("rrhh.fichajes.gestionar", "crear"),
  crearFichajeManual
);
