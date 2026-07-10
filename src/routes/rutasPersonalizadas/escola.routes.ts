// src/routes/rutasPersonalizadas/escola.routes.ts
import { Router } from "express";
import {
  getClasesRecurrentes,
  getClaseRecurrente,
  createClaseRecurrente,
  updateClaseRecurrente,
  deleteClaseRecurrente,
  regenerarCitasClases,
  getMatriculas,
  createMatricula,
  updateMatricula,
  deleteMatricula,
  getOpcionesEscola,
  getAsignaturas,
  createAsignatura,
  updateAsignatura,
  deleteAsignatura,
} from "../../controllers/controllersPersonalizados/escola.controllers.js";
import {
  getClasesGrupales,
  getClaseGrupal,
  createClaseGrupal,
  updateClaseGrupal,
  deleteClaseGrupal,
  getOpcionesClasesGrupales,
} from "../../controllers/controllersPersonalizados/clasesGrupales.controllers.js";
import {
  getAulas,
  createAula,
  updateAula,
  deleteAula,
  getConflictosAula,
} from "../../controllers/controllersPersonalizados/aulas.controllers.js";
import { sincronizarAutonomos } from "../../controllers/controllersPersonalizados/autonomosProveedor.controllers.js";

export const escolaRouter = Router();

// Opciones para selects (instrumentos, profesores, alumnos)
escolaRouter.get("/escola/opciones", getOpcionesEscola);

// Sincronizar trabajadores autónomos como proveedores
escolaRouter.post("/proveedores/sincronizar-autonomos", sincronizarAutonomos);

// Aulas
escolaRouter.get("/aulas", getAulas);
escolaRouter.post("/aulas", createAula);
escolaRouter.put("/aulas/:id", updateAula);
escolaRouter.delete("/aulas/:id", deleteAula);

// Asignaturas
escolaRouter.get("/asignaturas", getAsignaturas);
escolaRouter.post("/asignaturas", createAsignatura);
escolaRouter.put("/asignaturas/:id", updateAsignatura);
escolaRouter.delete("/asignaturas/:id", deleteAsignatura);

// Clases grupales
escolaRouter.get("/clases-grupales", getClasesGrupales);
escolaRouter.get("/clases-grupales/opciones", getOpcionesClasesGrupales);
escolaRouter.get("/clases-grupales/:id", getClaseGrupal);
escolaRouter.post("/clases-grupales", createClaseGrupal);
escolaRouter.put("/clases-grupales/:id", updateClaseGrupal);
escolaRouter.delete("/clases-grupales/:id", deleteClaseGrupal);

// Clases recurrentes
escolaRouter.get("/clases-recurrentes", getClasesRecurrentes);
escolaRouter.post("/clases-recurrentes/conflictos-aula", getConflictosAula);
escolaRouter.post("/clases-recurrentes/regenerar-citas", regenerarCitasClases);
escolaRouter.get("/clases-recurrentes/:id", getClaseRecurrente);
escolaRouter.post("/clases-recurrentes", createClaseRecurrente);
escolaRouter.put("/clases-recurrentes/:id", updateClaseRecurrente);
escolaRouter.delete("/clases-recurrentes/:id", deleteClaseRecurrente);

// Matrículas
escolaRouter.get("/matriculas", getMatriculas);
escolaRouter.post("/matriculas", createMatricula);
escolaRouter.put("/matriculas/:id", updateMatricula);
escolaRouter.delete("/matriculas/:id", deleteMatricula);
