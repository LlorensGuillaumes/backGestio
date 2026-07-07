// src/routes/rutasPersonalizadas/rrhh.routes.ts
import { Router } from "express";
import {
  // Convenios
  getConvenios,
  postConvenio,
  putConvenio,
  // Usuarios como trabajadores
  getUsuariosTrabajadores,
  getUsuarioTrabajador,
  putUsuarioTrabajador,
  // Horarios
  getUsuarioHorario,
  putUsuarioHorario,
  // Ausencias
  getUsuarioAusencias,
  postUsuarioAusencia,
  deleteUsuarioAusencia,
  // Festivos
  getFestivos,
  postFestivo,
  deleteFestivo,
} from "../../controllers/controllersPersonalizados/rrhh.controllers.js";

export const rrhhRouter = Router();

// Convenios
rrhhRouter.get("/rrhh/convenios", getConvenios);
rrhhRouter.post("/rrhh/convenios", postConvenio);
rrhhRouter.put("/rrhh/convenios/:id", putConvenio);

// Usuarios (como trabajadores)
rrhhRouter.get("/rrhh/usuarios", getUsuariosTrabajadores);
rrhhRouter.get("/rrhh/usuarios/:id", getUsuarioTrabajador);
rrhhRouter.put("/rrhh/usuarios/:id", putUsuarioTrabajador);

// Horarios de usuario
rrhhRouter.get("/rrhh/usuarios/:id/horario", getUsuarioHorario);
rrhhRouter.put("/rrhh/usuarios/:id/horario", putUsuarioHorario);

// Ausencias de usuario
rrhhRouter.get("/rrhh/usuarios/:id/ausencias", getUsuarioAusencias);
rrhhRouter.post("/rrhh/usuarios/:id/ausencias", postUsuarioAusencia);
rrhhRouter.delete("/rrhh/usuarios/:idUsuario/ausencias/:idAusencia", deleteUsuarioAusencia);

// Festivos (por empresa)
rrhhRouter.get("/rrhh/festivos", getFestivos);
rrhhRouter.post("/rrhh/festivos", postFestivo);
rrhhRouter.delete("/rrhh/festivos/:id", deleteFestivo);
