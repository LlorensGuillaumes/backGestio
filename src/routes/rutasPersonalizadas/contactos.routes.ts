// src/routes/rutasPersonalizadas/contactos.routes.ts
import { Router } from "express";
import {
  getContactos,
  getContacto,
  createContacto,
  updateContacto,
  deleteContacto,
  getResponsablesAlumno,
  addResponsable,
  updateResponsable,
  removeResponsable,
  getPagadorAlumno,
} from "../../controllers/controllersPersonalizados/contactos.controllers.js";

export const contactosRouter = Router();

// Contactos
contactosRouter.get("/contactos", getContactos);
contactosRouter.get("/contactos/:id", getContacto);
contactosRouter.post("/contactos", createContacto);
contactosRouter.put("/contactos/:id", updateContacto);
contactosRouter.delete("/contactos/:id", deleteContacto);

// Responsables de un alumno
contactosRouter.get("/clientes/:id/responsables", getResponsablesAlumno);
contactosRouter.post("/clientes/:id/responsables", addResponsable);
contactosRouter.get("/clientes/:id/pagador", getPagadorAlumno);
contactosRouter.put("/responsables/:relId", updateResponsable);
contactosRouter.delete("/responsables/:relId", removeResponsable);
