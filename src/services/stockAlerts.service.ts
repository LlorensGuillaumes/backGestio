// src/services/stockAlerts.service.ts
import type { Knex } from "knex";
import { crearNotificacionPorPermiso } from "./notificaciones.service.js";

export interface ProductoBajoStock {
  id: number;
  codigo: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  diferencia: number;
  esCritico: boolean;
}

export interface StockCheckResult {
  productosVerificados: number;
  alertasGeneradas: number;
  productosBajoStock: ProductoBajoStock[];
}

/**
 * Verificar el stock de un producto específico y crear notificación si está bajo mínimo
 * @param db - Conexión a la base de datos del tenant
 * @param idProducto - ID del producto a verificar
 * @param dbName - Nombre de la base de datos (para incluir en la notificación)
 */
export async function verificarStock(
  db: Knex,
  idProducto: number,
  dbName: string
): Promise<void> {
  const producto = await db("Productos")
    .select("IdProducto as id", "Codigo as codigo", "Nombre as nombre", "Stock as stock", "StockMinimo as stockMinimo")
    .where("IdProducto", idProducto)
    .where("Activo", 1)
    .first();

  if (!producto) {
    return;
  }

  const { stock, stockMinimo, nombre, codigo } = producto;

  // Solo verificar si tiene stock mínimo configurado
  if (stockMinimo === null || stockMinimo === undefined || stockMinimo <= 0) {
    return;
  }

  if (stock <= 0) {
    // Stock crítico (0 o negativo)
    await crearNotificacionPorPermiso(
      "stock_critico",
      `Stock crítico: ${nombre}`,
      `El producto "${nombre}" (${codigo}) tiene stock ${stock}. Base de datos: ${dbName}`,
      {
        idProducto,
        codigo,
        nombre,
        stock,
        stockMinimo,
        dbName,
      }
    );
  } else if (stock <= stockMinimo) {
    // Stock bajo (por debajo del mínimo pero mayor que 0)
    await crearNotificacionPorPermiso(
      "stock_bajo",
      `Stock bajo: ${nombre}`,
      `El producto "${nombre}" (${codigo}) tiene stock ${stock}, por debajo del mínimo (${stockMinimo}). Base de datos: ${dbName}`,
      {
        idProducto,
        codigo,
        nombre,
        stock,
        stockMinimo,
        dbName,
      }
    );
  }
}

/**
 * Verificar el stock de todos los productos activos
 * @param db - Conexión a la base de datos del tenant
 * @param dbName - Nombre de la base de datos
 */
export async function verificarTodoStock(db: Knex, dbName: string): Promise<StockCheckResult> {
  const productosBajoStock = await getProductosBajoStock(db);
  let alertasGeneradas = 0;

  for (const producto of productosBajoStock) {
    if (producto.esCritico) {
      await crearNotificacionPorPermiso(
        "stock_critico",
        `Stock crítico: ${producto.nombre}`,
        `El producto "${producto.nombre}" (${producto.codigo}) tiene stock ${producto.stock}. Base de datos: ${dbName}`,
        {
          idProducto: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          stock: producto.stock,
          stockMinimo: producto.stockMinimo,
          dbName,
        }
      );
    } else {
      await crearNotificacionPorPermiso(
        "stock_bajo",
        `Stock bajo: ${producto.nombre}`,
        `El producto "${producto.nombre}" (${producto.codigo}) tiene stock ${producto.stock}, por debajo del mínimo (${producto.stockMinimo}). Base de datos: ${dbName}`,
        {
          idProducto: producto.id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          stock: producto.stock,
          stockMinimo: producto.stockMinimo,
          dbName,
        }
      );
    }
    alertasGeneradas++;
  }

  // Contar total de productos verificados
  const totalProductos = await db("Productos")
    .where("Activo", 1)
    .whereNotNull("StockMinimo")
    .where("StockMinimo", ">", 0)
    .count("* as count")
    .first();

  return {
    productosVerificados: Number((totalProductos as { count: number })?.count ?? 0),
    alertasGeneradas,
    productosBajoStock,
  };
}

/**
 * Obtener lista de productos con stock bajo o crítico
 * @param db - Conexión a la base de datos del tenant
 */
export async function getProductosBajoStock(db: Knex): Promise<ProductoBajoStock[]> {
  const productos = await db("Productos")
    .select(
      "IdProducto as id",
      "Codigo as codigo",
      "Nombre as nombre",
      "Stock as stock",
      "StockMinimo as stockMinimo"
    )
    .where("Activo", 1)
    .whereNotNull("StockMinimo")
    .where("StockMinimo", ">", 0)
    .whereRaw('"Stock" <= "StockMinimo"')
    .orderByRaw('"Stock" - "StockMinimo" ASC');

  return productos.map((p: { id: number; codigo: string; nombre: string; stock: number; stockMinimo: number }) => ({
    id: p.id,
    codigo: p.codigo,
    nombre: p.nombre,
    stock: p.stock,
    stockMinimo: p.stockMinimo,
    diferencia: p.stock - p.stockMinimo,
    esCritico: p.stock <= 0,
  }));
}

/**
 * Verificar si un producto tiene stock bajo después de una actualización
 * Útil para llamar después de movimientos de stock
 * @param db - Conexión a la base de datos del tenant
 * @param idProducto - ID del producto
 * @param nuevoStock - Nuevo valor del stock
 * @param dbName - Nombre de la base de datos
 */
export async function verificarStockDespuesMovimiento(
  db: Knex,
  idProducto: number,
  nuevoStock: number,
  dbName: string
): Promise<void> {
  const producto = await db("Productos")
    .select("IdProducto as id", "Codigo as codigo", "Nombre as nombre", "StockMinimo as stockMinimo")
    .where("IdProducto", idProducto)
    .where("Activo", 1)
    .first();

  if (!producto || !producto.stockMinimo || producto.stockMinimo <= 0) {
    return;
  }

  if (nuevoStock <= 0) {
    await crearNotificacionPorPermiso(
      "stock_critico",
      `Stock crítico: ${producto.nombre}`,
      `El producto "${producto.nombre}" (${producto.codigo}) tiene stock ${nuevoStock}. Base de datos: ${dbName}`,
      {
        idProducto,
        codigo: producto.codigo,
        nombre: producto.nombre,
        stock: nuevoStock,
        stockMinimo: producto.stockMinimo,
        dbName,
      }
    );
  } else if (nuevoStock <= producto.stockMinimo) {
    await crearNotificacionPorPermiso(
      "stock_bajo",
      `Stock bajo: ${producto.nombre}`,
      `El producto "${producto.nombre}" (${producto.codigo}) tiene stock ${nuevoStock}, por debajo del mínimo (${producto.stockMinimo}). Base de datos: ${dbName}`,
      {
        idProducto,
        codigo: producto.codigo,
        nombre: producto.nombre,
        stock: nuevoStock,
        stockMinimo: producto.stockMinimo,
        dbName,
      }
    );
  }
}
