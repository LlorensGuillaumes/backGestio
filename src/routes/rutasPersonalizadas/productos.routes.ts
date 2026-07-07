// src/routes/rutasPersonalizadas/productos.routes.ts
import { Router } from "express";
import {
  getProductosFull,
  getProducto,
  postProducto,
  putProducto,
  getFamiliasProductosFull,
} from "../../controllers/controllersPersonalizados/productos.controllers.js";

export const productosRouter = Router();

productosRouter.get("/familias-productos-full", getFamiliasProductosFull);
productosRouter.get("/productos-full", getProductosFull);
productosRouter.get("/productos/:id", getProducto);
productosRouter.post("/productos-post", postProducto);
productosRouter.put("/productos-put/:id", putProducto);
