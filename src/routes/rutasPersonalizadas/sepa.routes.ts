// src/routes/rutasPersonalizadas/sepa.routes.ts
import { Router } from "express";
import { previewSepa, generarSepa, updateEstadoFactura } from "../../controllers/controllersPersonalizados/sepa.controllers.js";
import { previewPagos, generarPagos } from "../../controllers/controllersPersonalizados/sepaPagos.controllers.js";

export const sepaRouter = Router();

sepaRouter.post("/sepa/preview", previewSepa);
sepaRouter.post("/sepa/generar", generarSepa);
sepaRouter.put("/facturas/:id/estado", updateEstadoFactura);
sepaRouter.post("/sepa/pagos/preview", previewPagos);
sepaRouter.post("/sepa/pagos/generar", generarPagos);
