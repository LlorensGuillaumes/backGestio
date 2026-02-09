// ============================================================
// ARCHIVO OBSOLETO - NO USAR
// ============================================================
//
// Este archivo de rutas ha sido reemplazado por:
// - rrhh.routes.ts (para usuarios como trabajadores)
// - controlHorario.routes.ts (para cálculos de horas)
//
// Las tablas de trabajadores han sido migradas a gestio_master:
// - Trabajadores -> usuarios
// - Convenios -> convenios
// - HorarioTrabajador -> horarios_usuario
// - AusenciasTrabajador -> ausencias_usuario
//
// Ver: /rrhh/* endpoints
// ============================================================

import { Router } from "express";

export const trabajadoresRouter = Router();
// Router vacío - ya no se usa
