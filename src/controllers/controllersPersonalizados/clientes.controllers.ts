// src/controllers/clientesFull.controller.ts
import type { Request, Response, NextFunction } from "express";
import { tables } from "../../routes/tables.js";
import * as crudService from "../../crud/crudService.js";
import type { TableConfig } from "../../crud/types.js";
import db from "../../db.js";

// ✅ Helper que garantiza TableConfig (nunca undefined)
function getClientesCfg(): TableConfig {
  const cfg = tables.find((t) => t.path === "clientes");
  if (!cfg) throw new Error("No existe TableConfig para path 'clientes'");
  return cfg;
}

// Formatea fecha a DD/MM/YYYY con padding de ceros
function formatDateDMY(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function postSubfamiliaCliente(req: Request, res: Response, next: NextFunction) {
  try {
    const id_familia = Number(req.body?.id_familia);
    const descripcion = String(req.body?.descripcion ?? "").trim();
    const activa = req.body?.activa ?? true;
    const prioridad = Number(req.body?.prioridad ?? 0);

    if (!Number.isFinite(id_familia) || id_familia <= 0) {
      return res.status(400).json({ error: "id_familia inválido" });
    }
    if (!descripcion) {
      return res.status(400).json({ error: "descripcion es obligatoria" });
    }

    const created = await crudService.createSubfamiliaWithDefaultAcciones({
      id_familia,
      descripcion,
      activa: Boolean(activa),
      prioridad: Number.isFinite(prioridad) ? prioridad : 0,
    });

    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}

export async function getClientesFull(req: Request, res: Response, next: NextFunction) {
  try {
    const take = Number(req.query.take ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    const clientesCfg = getClientesCfg();

    const result = await crudService.listClientes(clientesCfg, {
      take,
      offset,
      includeInactive: !soloActivos,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCliente(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "Falta el id de cliente" });

    const soloActivos = String(req.query.soloActivos ?? "1") === "1";

    const clientesCfg = getClientesCfg();

    const item = await crudService.getOneCliente(
      clientesCfg,
      { id },
      { includeInactive: !soloActivos }
    );

    if (!item) return res.status(404).json({ error: "Cliente no encontrado" });

    res.json(item);
  } catch (err) {
    next(err);
  }
}

export async function getClienteFacturas(req: Request, res: Response, next: NextFunction) {
  try {
    const id = String(req.params.id ?? "").trim();
    if (!id) return res.status(400).json({ error: "Falta el id de cliente" });

    // TODO: cuando lo tengas
    // const rows = await clientesService.getClienteFacturas(id);
    // res.json(rows);

    res.json({ rows: [], totalCount: 0 });
  } catch (err) {
    next(err);
  }
}

export async function getClienteRevisiones(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Falta el id de cliente" });
    }

    const rawRows = await db("Revisiones")
      .where("IdCliente", id)
      .orderBy("FechaRevision", "desc");

    // Mapear campos de BD (PascalCase) a camelCase para el frontend
    const rows = rawRows.map((r: any) => ({
      id: r.IdRevision,
      idCliente: r.IdCliente,
      fecha: formatDateDMY(r.FechaRevision),
      motivoConsulta: r.MotivoConsulta,
      sintomas: r.Sintomas,
      profesional: r.Profesional,
      observaciones: r.Observaciones,
    }));

    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}

export async function getClienteDocumentos(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Falta el id de cliente" });
    }

    const rows = await db("Documentos")
      .where("IdCliente", id)
      .orderBy("Fecha", "desc");

    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /clientes/:id/ultima-graduacion
 * Obtiene la refracción final de la última revisión del cliente
 */
export async function getClienteUltimaGraduacion(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Falta el id de cliente" });
    }

    // Buscar la última revisión del cliente
    const ultimaRevision = await db("Revisiones")
      .where("IdCliente", id)
      .orderBy("FechaRevision", "desc")
      .first();

    if (!ultimaRevision) {
      return res.json({ graduacion: null, mensaje: "El cliente no tiene revisiones" });
    }

    // Buscar la refracción final de esa revisión
    const refraccionFinal = await db("Rev_RefraccionFinal")
      .where("IdRevision", ultimaRevision.IdRevision)
      .first();

    if (!refraccionFinal) {
      return res.json({
        graduacion: null,
        mensaje: "La última revisión no tiene refracción final",
        fechaRevision: ultimaRevision.FechaRevision
      });
    }

    // Mapear a camelCase para el frontend
    res.json({
      graduacion: {
        odEsfera: refraccionFinal.OD_Esf,
        odCilindro: refraccionFinal.OD_Cil,
        odEje: refraccionFinal.OD_Eje,
        odAdicion: refraccionFinal.OD_ADD,
        oiEsfera: refraccionFinal.OI_Esf,
        oiCilindro: refraccionFinal.OI_Cil,
        oiEje: refraccionFinal.OI_Eje,
        oiAdicion: refraccionFinal.OI_ADD,
      },
      fechaRevision: ultimaRevision.FechaRevision,
      idRevision: ultimaRevision.IdRevision,
    });
  } catch (err) {
    next(err);
  }
}

export async function postCliente(req: Request, res: Response, next: NextFunction) {
  try {
    const clientesCfg = getClientesCfg();
    const item = await crudService.createCliente(clientesCfg, req.body);
    res.status(201).json(item);
  } catch (e) {
    next(e);
  }
}

export async function putCliente(req: Request, res: Response, next: NextFunction) {
  try {
    const clientesCfg = getClientesCfg();
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id inválido" });
    }
    const item = await crudService.updateCliente(clientesCfg, id, req.body);
    res.json(item);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /clientes/:id/descuento
 * Obtiene el descuento del cliente basado en sus subfamilias
 * Devuelve el mayor descuento activo encontrado
 */
export async function getClienteDescuento(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Falta el id de cliente" });
    }

    // Buscar las subfamilias del cliente
    const subfamilias = await db("clientes_subfamilias")
      .where("id_cliente", id)
      .select("id_subfamilia");

    if (subfamilias.length === 0) {
      return res.json({
        descuento: 0,
        esPorcentaje: true,
        origen: null,
        mensaje: "El cliente no pertenece a ningún grupo"
      });
    }

    const idsSubfamilias = subfamilias.map((s: any) => s.id_subfamilia);

    // Buscar acciones de tipo descuento (id_tipo_accion = 1) activas
    // para las subfamilias del cliente, con valor > 0
    const acciones = await db("subfamilias_clientes_acciones as sca")
      .join("subfamilias_clientes as sc", "sc.id", "sca.id_subfamilia")
      .whereIn("sca.id_subfamilia", idsSubfamilias)
      .where("sca.id_tipo_accion", 1) // 1 = descuento
      .where("sca.activo", true)
      .where("sca.valor_accion", ">", 0)
      .select(
        "sca.valor_accion",
        "sca.es_porcentaje",
        "sc.descripcion as nombreSubfamilia"
      )
      .orderBy("sca.valor_accion", "desc"); // Mayor descuento primero

    if (acciones.length === 0) {
      return res.json({
        descuento: 0,
        esPorcentaje: true,
        origen: null,
        mensaje: "Sin descuento configurado"
      });
    }

    // Tomar el mayor descuento
    const mayorDescuento = acciones[0];

    res.json({
      descuento: Number(mayorDescuento.valor_accion),
      esPorcentaje: Boolean(mayorDescuento.es_porcentaje),
      origen: mayorDescuento.nombreSubfamilia,
      mensaje: `Descuento por grupo: ${mayorDescuento.nombreSubfamilia}`
    });
  } catch (err) {
    next(err);
  }
}

// (Opcional) borrar / desactivar
export async function deleteCliente(req: Request, res: Response, next: NextFunction) {
  try {
    const clientesCfg = getClientesCfg();
    const id = Number(req.params.id);

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id inválido" });
    }

    // si en tu sistema es "baja lógica", crea un método en crudService:
    // const item = await crudService.disableCliente(clientesCfg, id);
    // res.json(item);

    // placeholder:
    res.status(501).json({ error: "deleteCliente no implementado" });
  } catch (e) {
    next(e);
  }
}
