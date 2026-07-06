// src/controllers/controllersPersonalizados/nominas.controllers.ts
// Nóminas del personal propio (tipo_relacion = NOMINA). Detalladas por conceptos.
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getMasterDb } from "../../db/masterDb.js";

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function parseComplementos(c: any): { concepto: string; importe: number }[] {
  if (Array.isArray(c)) return c;
  if (typeof c === "string") { try { return JSON.parse(c) || []; } catch { return []; } }
  return [];
}

// Calcula las líneas de la nómina (devengos y deducciones) de un trabajador
function calcularNomina(u: any) {
  const salarioBase = Number(u.salario_base) || 0;
  const numPagas = Number(u.num_pagas) || 12;
  const pctIrpf = Number(u.pct_irpf) || 0;
  const pctSs = Number(u.pct_ss) || 0;
  const complementos = parseComplementos(u.complementos);

  const lineas: { tipo: "DEVENGO" | "DEDUCCION"; concepto: string; importe: number; orden: number }[] = [];
  let orden = 1;
  const r2 = (n: number) => Math.round(n * 100) / 100;

  lineas.push({ tipo: "DEVENGO", concepto: "Salario base", importe: r2(salarioBase), orden: orden++ });
  for (const c of complementos) {
    lineas.push({ tipo: "DEVENGO", concepto: c.concepto || "Complemento", importe: r2(Number(c.importe) || 0), orden: orden++ });
  }
  const baseExtra = salarioBase + complementos.reduce((a, c) => a + (Number(c.importe) || 0), 0);
  if (numPagas > 12) {
    lineas.push({ tipo: "DEVENGO", concepto: `Prorrata pagas extra (${numPagas} pagas)`, importe: r2((baseExtra * (numPagas - 12)) / 12), orden: orden++ });
  }
  const totalDevengado = r2(lineas.filter((l) => l.tipo === "DEVENGO").reduce((a, l) => a + l.importe, 0));

  const irpf = r2((totalDevengado * pctIrpf) / 100);
  const ss = r2((totalDevengado * pctSs) / 100);
  lineas.push({ tipo: "DEDUCCION", concepto: `Retención IRPF (${pctIrpf}%)`, importe: irpf, orden: orden++ });
  lineas.push({ tipo: "DEDUCCION", concepto: `Seguridad Social (${pctSs}%)`, importe: ss, orden: orden++ });
  const totalDeducciones = r2(irpf + ss);
  const liquido = r2(totalDevengado - totalDeducciones);

  return { lineas, totalDevengado, totalDeducciones, liquido };
}

// Trabajadores de nómina con salario configurado (de master)
async function getTrabajadoresNomina() {
  return getMasterDb()("usuarios")
    .where("tipo_relacion", "NOMINA")
    .andWhere("activo", true)
    .andWhere("salario_base", ">", 0)
    .select("id", "nombre", "salario_base", "pct_irpf", "pct_ss", "num_pagas", "complementos", "iban", "titular_cuenta")
    .orderBy("nombre", "asc");
}

/** GET /nominas/preview?mes=&anyo= */
export async function previewNominas(req: Request, res: Response, next: NextFunction) {
  try {
    const mes = Number(req.query.mes);
    const anyo = Number(req.query.anyo);
    if (!mes || !anyo) return res.status(400).json({ error: "Mes y año son obligatorios" });

    const trabajadores = await getTrabajadoresNomina();
    const yaGeneradas = await db("Nominas").where({ Mes: mes, Anyo: anyo, Activo: 1 }).pluck("IdUsuario");
    const setYa = new Set(yaGeneradas.map(Number));

    const nominas = trabajadores.map((u: any) => {
      const calc = calcularNomina(u);
      return {
        idUsuario: u.id,
        nombre: u.nombre,
        yaGenerada: setYa.has(Number(u.id)),
        ...calc,
      };
    });
    const resumen = nominas.reduce((a: any, n: any) => ({
      num: a.num + 1,
      totalDevengado: Math.round((a.totalDevengado + n.totalDevengado) * 100) / 100,
      totalLiquido: Math.round((a.totalLiquido + n.liquido) * 100) / 100,
    }), { num: 0, totalDevengado: 0, totalLiquido: 0 });

    res.json({ mes, anyo, etiqueta: `Nómina ${MESES[mes]}/${anyo}`, nominas, resumen });
  } catch (e) {
    next(e);
  }
}

/** POST /nominas/generar  body: { mes, anyo, usuariosExcluidos? } */
export async function generarNominas(req: Request, res: Response, next: NextFunction) {
  try {
    const mes = Number(req.body?.mes);
    const anyo = Number(req.body?.anyo);
    if (!mes || !anyo) return res.status(400).json({ error: "Mes y año son obligatorios" });
    const excluidos = new Set((req.body?.usuariosExcluidos ?? []).map(Number));

    const trabajadores = (await getTrabajadoresNomina()).filter((u: any) => !excluidos.has(Number(u.id)));
    const yaGeneradas = await db("Nominas").where({ Mes: mes, Anyo: anyo, Activo: 1 }).pluck("IdUsuario");
    const setYa = new Set(yaGeneradas.map(Number));
    const pendientes = trabajadores.filter((u: any) => !setYa.has(Number(u.id)));

    if (!pendientes.length) {
      return res.json({ creadas: 0, mensaje: "No había nóminas que generar (todo excluido o ya generado)." });
    }

    const creadas: any[] = [];
    await db.transaction(async (trx) => {
      for (const u of pendientes as any[]) {
        const calc = calcularNomina(u);
        const [row] = await trx("Nominas")
          .insert({
            IdUsuario: u.id, Mes: mes, Anyo: anyo,
            TotalDevengado: calc.totalDevengado, TotalDeducciones: calc.totalDeducciones, LiquidoPagar: calc.liquido,
            Estado: "EMITIDA", EstadoPago: "PENDIENTE",
            Observaciones: `Nómina ${MESES[mes]}/${anyo}`,
          })
          .returning("IdNomina");
        const idNomina = typeof row === "object" ? row.IdNomina : row;
        await trx("NominaLineas").insert(calc.lineas.map((l) => ({ IdNomina: idNomina, Tipo: l.tipo, Concepto: l.concepto, Importe: l.importe, Orden: l.orden })));
        creadas.push({ idNomina, trabajador: u.nombre, liquido: calc.liquido });
      }
    });
    res.status(201).json({ creadas: creadas.length, nominas: creadas });
  } catch (e) {
    next(e);
  }
}

/** GET /nominas?mes=&anyo= — listado con nombre del trabajador */
export async function getNominas(req: Request, res: Response, next: NextFunction) {
  try {
    const mes = req.query.mes ? Number(req.query.mes) : null;
    const anyo = req.query.anyo ? Number(req.query.anyo) : null;
    let q = db("Nominas").where("Activo", 1).orderBy("Anyo", "desc").orderBy("Mes", "desc");
    if (mes) q = q.where("Mes", mes);
    if (anyo) q = q.where("Anyo", anyo);
    const rows = await q;

    const ids = [...new Set(rows.map((r: any) => Number(r.IdUsuario)))];
    const trabMap = new Map<number, any>();
    if (ids.length) {
      const trab = await getMasterDb()("usuarios").whereIn("id", ids).select("id", "nombre", "iban");
      for (const t of trab as any[]) trabMap.set(Number(t.id), t);
    }
    const data = rows.map((r: any) => ({
      id: r.IdNomina, idUsuario: r.IdUsuario,
      nombre: trabMap.get(Number(r.IdUsuario))?.nombre ?? "—",
      mes: r.Mes, anyo: r.Anyo,
      totalDevengado: Number(r.TotalDevengado), totalDeducciones: Number(r.TotalDeducciones), liquido: Number(r.LiquidoPagar),
      estadoPago: r.EstadoPago, estado: r.Estado,
    }));
    res.json({ data, totalCount: data.length });
  } catch (e) {
    next(e);
  }
}

/** GET /nominas/:id — detalle con líneas */
export async function getNomina(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const n = await db("Nominas").where("IdNomina", id).first();
    if (!n) return res.status(404).json({ error: "Nómina no encontrada" });
    const lineas = await db("NominaLineas").where("IdNomina", id).orderBy("Orden", "asc");
    const t = await getMasterDb()("usuarios").where("id", n.IdUsuario).first();
    res.json({
      id: n.IdNomina, idUsuario: n.IdUsuario,
      nombre: t?.nombre ?? "—", iban: t?.iban ?? null,
      mes: n.Mes, anyo: n.Anyo, fechaEmision: n.FechaEmision,
      totalDevengado: Number(n.TotalDevengado), totalDeducciones: Number(n.TotalDeducciones), liquido: Number(n.LiquidoPagar),
      estadoPago: n.EstadoPago, estado: n.Estado,
      lineas: lineas.map((l: any) => ({ tipo: l.Tipo, concepto: l.Concepto, importe: Number(l.Importe) })),
    });
  } catch (e) {
    next(e);
  }
}

export async function deleteNomina(req: Request, res: Response, next: NextFunction) {
  try {
    await db("Nominas").where("IdNomina", Number(req.params.id)).update({ Activo: 0 });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}
