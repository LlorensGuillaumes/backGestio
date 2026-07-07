// src/controllers/controllersPersonalizados/dashboard.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * GET /dashboard/stats
 * Estadísticas generales para el dashboard
 */
export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const hoy = new Date().toISOString().split("T")[0];
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split("T")[0];

    // Inicializar valores por defecto
    let ventasHoy = 0;
    let ventasMes = 0;
    let clientesActivos = 0;
    let documentosPendientes = 0;
    let facturasPendientes = 0;
    let comprasMes = 0;
    let numVentasHoy = 0;
    let nuevosClientesHoy = 0;
    let pedidosRecibidosHoy = 0;

    // 1. Ventas de hoy (cobros en caja)
    try {
      const ventasHoyResult = await db("CajaMovimientos")
        .whereRaw(`"Fecha"::date = ?`, [hoy])
        .where("Tipo", "COBRO")
        .sum("Importe as total")
        .first();
      ventasHoy = Number(ventasHoyResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener ventasHoy", e);
    }

    // 2. Ventas del mes
    try {
      const ventasMesResult = await db("CajaMovimientos")
        .whereRaw(`"Fecha"::date >= ?`, [inicioMesStr])
        .whereRaw(`"Fecha"::date <= ?`, [hoy])
        .where("Tipo", "COBRO")
        .sum("Importe as total")
        .first();
      ventasMes = Number(ventasMesResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener ventasMes", e);
    }

    // 3. Clientes activos (tabla: clientes, columna: activo - lowercase)
    try {
      const clientesActivosResult = await db("clientes")
        .where("activo", 1)
        .count("* as total")
        .first();
      clientesActivos = Number(clientesActivosResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener clientesActivos", e);
    }

    // 4. Documentos pendientes (presupuestos/encargos en estado PENDIENTE o EN_PROCESO)
    // Nota: Documentos usa Estado para control, no tiene columna Activo
    try {
      const documentosPendientesResult = await db("Documentos")
        .whereIn("Estado", ["PENDIENTE", "EN_PROCESO", "CONFIRMADO"])
        .count("* as total")
        .first();
      documentosPendientes = Number(documentosPendientesResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener documentosPendientes", e);
    }

    // 5. Facturas pendientes de cobro
    // Nota: Facturas usa Estado para control, no tiene columna Activo
    try {
      const facturasPendientesResult = await db("Facturas")
        .where("EstadoCobro", "PENDIENTE")
        .whereNot("Estado", "ANULADA")
        .count("* as total")
        .first();
      facturasPendientes = Number(facturasPendientesResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener facturasPendientes", e);
    }

    // 6. Compras del mes (facturas de compra a proveedores)
    // Nota: La tabla es FacturasCompra, no ComprasFacturas
    try {
      const comprasMesResult = await db("FacturasCompra")
        .whereRaw(`"FechaFactura"::date >= ?`, [inicioMesStr])
        .whereRaw(`"FechaFactura"::date <= ?`, [hoy])
        .whereNot("Estado", "ANULADA")
        .sum("TotalFactura as total")
        .first();
      comprasMes = Number(comprasMesResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener comprasMes", e);
    }

    // 7. Número de ventas hoy
    try {
      const numVentasHoyResult = await db("CajaMovimientos")
        .whereRaw(`"Fecha"::date = ?`, [hoy])
        .where("Tipo", "COBRO")
        .count("* as total")
        .first();
      numVentasHoy = Number(numVentasHoyResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener numVentasHoy", e);
    }

    // 8. Nuevos clientes hoy (tabla: clientes - lowercase)
    try {
      const nuevosClientesHoyResult = await db("clientes")
        .whereRaw(`"fecha_alta"::date = ?`, [hoy])
        .count("* as total")
        .first();
      nuevosClientesHoy = Number(nuevosClientesHoyResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener nuevosClientesHoy", e);
    }

    // 9. Pedidos recibidos hoy (recepciones de compra)
    try {
      const pedidosRecibidosHoyResult = await db("ComprasRecepciones")
        .whereRaw(`"FechaRecepcion"::date = ?`, [hoy])
        .whereNot("Estado", "ANULADA")
        .count("* as total")
        .first();
      pedidosRecibidosHoy = Number(pedidosRecibidosHoyResult?.total ?? 0);
    } catch (e) {
      console.log("Dashboard: No se pudo obtener pedidosRecibidosHoy", e);
    }

    res.json({
      ventasHoy,
      ventasMes,
      clientesActivos,
      documentosPendientes,
      facturasPendientes,
      comprasMes,
      numVentasHoy,
      nuevosClientesHoy,
      pedidosRecibidosHoy,
    });
  } catch (err) {
    console.error("Error en getDashboardStats:", err);
    next(err);
  }
}

/**
 * GET /dashboard/actividad
 * Actividad reciente para el dashboard
 */
export async function getDashboardActividad(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50);
    const actividad: any[] = [];

    // Últimos movimientos de caja (ventas)
    try {
      const ultimosMovimientos = await db("CajaMovimientos as cm")
        .leftJoin("Facturas as f", "cm.IdFactura", "f.IdFactura")
        .leftJoin("clientes as c", "cm.IdCliente", "c.id")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .select(
          "cm.IdMovimiento as id",
          "cm.Fecha as fecha",
          "cm.Tipo as tipo",
          "cm.Concepto as concepto",
          "cm.Importe as importe",
          db.raw(`CASE WHEN f."IdFactura" IS NOT NULL THEN CONCAT(f."Serie", '-', f."Numero") ELSE NULL END as "numeroFactura"`),
          db.raw(`COALESCE(c.nombre_comercial, ce.razon_social, CONCAT(cp.nombre, ' ', COALESCE(cp.primer_apellido, ''))) as "nombreCliente"`)
        )
        .whereIn("cm.Tipo", ["COBRO", "PAGO"])
        .orderBy("cm.Fecha", "desc")
        .limit(limit);

      for (const mov of ultimosMovimientos) {
        actividad.push({
          id: `mov-${mov.id}`,
          tipo: mov.tipo === "COBRO" ? "venta" : "pago",
          descripcion: mov.numeroFactura
            ? `Venta completada - Factura #${mov.numeroFactura}`
            : mov.concepto,
          fecha: mov.fecha,
          importe: Number(mov.importe),
          nombreCliente: mov.nombreCliente,
        });
      }
    } catch (e) {
      console.log("Dashboard: No se pudo obtener ultimosMovimientos", e);
    }

    // Últimos clientes registrados (tabla: clientes - lowercase)
    try {
      const ultimosClientes = await db("clientes as c")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .select(
          "c.id as id",
          db.raw(`COALESCE(c.nombre_comercial, ce.razon_social, CONCAT(cp.nombre, ' ', COALESCE(cp.primer_apellido, ''))) as nombre`),
          "c.fecha_alta as fecha"
        )
        .orderBy("c.fecha_alta", "desc")
        .limit(5);

      for (const cli of ultimosClientes) {
        actividad.push({
          id: `cli-${cli.id}`,
          tipo: "cliente",
          descripcion: `Nuevo cliente registrado - ${cli.nombre}`,
          fecha: cli.fecha,
        });
      }
    } catch (e) {
      console.log("Dashboard: No se pudo obtener ultimosClientes", e);
    }

    // Últimos documentos creados
    try {
      const ultimosDocumentos = await db("Documentos as d")
        .leftJoin("clientes as c", "d.IdCliente", "c.id")
        .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
        .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
        .select(
          "d.IdDocumento as id",
          "d.NumeroDocumento as numero",
          "d.Tipo as tipo",
          "d.Estado as estado",
          "d.Total as total",
          "d.Fecha as fecha",
          db.raw(`COALESCE(c.nombre_comercial, ce.razon_social, CONCAT(cp.nombre, ' ', COALESCE(cp.primer_apellido, ''))) as "nombreCliente"`)
        )
        .whereNot("d.Estado", "ANULADO")
        .orderBy("d.Fecha", "desc")
        .limit(5);

      for (const doc of ultimosDocumentos) {
        actividad.push({
          id: `doc-${doc.id}`,
          tipo: "documento",
          descripcion: `${doc.tipo === "ENCARGO" ? "Encargo" : "Presupuesto"} #${doc.numero} - ${doc.estado}`,
          fecha: doc.fecha,
          importe: Number(doc.total),
          nombreCliente: doc.nombreCliente,
        });
      }
    } catch (e) {
      console.log("Dashboard: No se pudo obtener ultimosDocumentos", e);
    }

    // Ordenar por fecha descendente
    actividad.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    res.json({
      actividad: actividad.slice(0, limit),
    });
  } catch (err) {
    console.error("Error en getDashboardActividad:", err);
    next(err);
  }
}
