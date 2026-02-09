// src/routes/rutasPersonalizadas/departamentos.routes.ts
import { Router } from "express";
import {
  getDepartamentos,
  getDepartamento,
  crearDepartamento,
  actualizarDepartamento,
  eliminarDepartamento,
  getUsuariosDepartamento,
  asignarUsuarios,
  agregarUsuario,
  quitarUsuario,
  getPermisosComunicacion,
  configurarPermiso,
  eliminarPermiso,
  getUsuariosConDepartamentos,
  getDepartamentosUsuario,
} from "../../controllers/controllersPersonalizados/departamentos.controller.js";

export const departamentosRouter = Router();

// Rutas de departamentos
departamentosRouter.get("/departamentos", getDepartamentos);
departamentosRouter.get("/departamentos/usuarios", getUsuariosConDepartamentos);
departamentosRouter.get("/departamentos/permisos", getPermisosComunicacion);
departamentosRouter.put("/departamentos/permisos", configurarPermiso);
departamentosRouter.delete("/departamentos/permisos", eliminarPermiso);
departamentosRouter.get("/departamentos/usuario/:id", getDepartamentosUsuario);
departamentosRouter.get("/departamentos/:id", getDepartamento);
departamentosRouter.post("/departamentos", crearDepartamento);
departamentosRouter.put("/departamentos/:id", actualizarDepartamento);
departamentosRouter.delete("/departamentos/:id", eliminarDepartamento);
departamentosRouter.get("/departamentos/:id/usuarios", getUsuariosDepartamento);
departamentosRouter.put("/departamentos/:id/usuarios", asignarUsuarios);
departamentosRouter.post("/departamentos/:id/usuarios/:idUsuario", agregarUsuario);
departamentosRouter.delete("/departamentos/:id/usuarios/:idUsuario", quitarUsuario);
