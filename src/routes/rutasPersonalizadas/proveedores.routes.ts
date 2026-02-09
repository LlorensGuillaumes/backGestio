// src/routes/rutasPersonalizadas/proveedores.routes.ts
import { Router } from "express";
import {
  getProveedoresFull,
  getProveedor,
  getProveedorProductos,
  postProveedor,
  putProveedor,
} from "../../controllers/controllersPersonalizados/proveedores.controllers.js";

export const proveedoresRouter = Router();

proveedoresRouter.get("/proveedores-full", getProveedoresFull);
proveedoresRouter.get("/proveedores/:id", getProveedor);
proveedoresRouter.get("/proveedores/:id/productos", getProveedorProductos);
proveedoresRouter.post("/proveedores-post", postProveedor);
proveedoresRouter.put("/proveedores-put/:id", putProveedor);
