// src/routes/rutasPersonalizadas/descuentos.routes.ts
import { Router } from "express";
import {
  getDescuentos,
  createFamiliaDescuento,
  updateFamiliaDescuento,
  deleteFamiliaDescuento,
  createSubDescuento,
  updateSubDescuento,
  deleteSubDescuento,
} from "../../controllers/controllersPersonalizados/descuentos.controllers.js";

export const descuentosRouter = Router();

descuentosRouter.get("/descuentos", getDescuentos);
descuentosRouter.post("/descuentos/familias", createFamiliaDescuento);
descuentosRouter.put("/descuentos/familias/:id", updateFamiliaDescuento);
descuentosRouter.delete("/descuentos/familias/:id", deleteFamiliaDescuento);
descuentosRouter.post("/descuentos/subfamilias", createSubDescuento);
descuentosRouter.put("/descuentos/subfamilias/:id", updateSubDescuento);
descuentosRouter.delete("/descuentos/subfamilias/:id", deleteSubDescuento);
