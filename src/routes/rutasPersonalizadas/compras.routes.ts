// src/routes/rutasPersonalizadas/compras.routes.ts
import { Router } from "express";
import {
  getOrdenesCompra,
  getOrdenCompra,
  postOrdenCompra,
  putOrdenCompra,
  getRecepcionesCompra,
  getRecepcionCompra,
  postRecepcionCompra,
  getFacturaCompra,
  postFacturaCompra,
  addPagoFacturaCompra,
  getProveedoresLookup,
  getOrdenesPendientesProveedor,
} from "../../controllers/controllersPersonalizados/compras.controllers.js";

export const comprasRouter = Router();

// Proveedores lookup
comprasRouter.get("/proveedores-lookup", getProveedoresLookup);

// Ordenes de compra
comprasRouter.get("/compras/ordenes", getOrdenesCompra);
comprasRouter.get("/compras/ordenes/:id", getOrdenCompra);
comprasRouter.post("/compras/ordenes", postOrdenCompra);
comprasRouter.put("/compras/ordenes/:id", putOrdenCompra);

// Ordenes pendientes por proveedor (para recepciones)
comprasRouter.get("/compras/ordenes-pendientes/:idProveedor", getOrdenesPendientesProveedor);

// Recepciones de compra (albaranes)
comprasRouter.get("/compras/recepciones", getRecepcionesCompra);
comprasRouter.get("/compras/recepciones/:id", getRecepcionCompra);
comprasRouter.post("/compras/recepciones", postRecepcionCompra);

// Facturas de compra
comprasRouter.get("/compras/facturas/:id", getFacturaCompra);
comprasRouter.post("/compras/facturas", postFacturaCompra);
comprasRouter.post("/compras/facturas/:id/pagos", addPagoFacturaCompra);
