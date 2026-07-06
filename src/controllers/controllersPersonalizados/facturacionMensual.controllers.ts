// src/controllers/controllersPersonalizados/facturacionMensual.controllers.ts
// Asistente de facturación mensual de alumnos (ventas).
// Genera una factura por alumno con una línea por cada clase matriculada (cuota).
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getMasterDb } from "../../db/masterDb.js";

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function etiquetaMes(mes: number, anyo: number) {
  return `Mensualidad ${MESES[mes] ?? mes}/${anyo}`;
}

// Serie de facturación del tenant activo (de bases_datos), por defecto 'F'
async function getSerie(req: Request): Promise<string> {
  const headerDb = req.headers["x-database"];
  const dbName = String((Array.isArray(headerDb) ? headerDb[0] : headerDb) || req.user?.currentDatabase || "");
  if (!dbName) return "F";
  try {
    const row = await getMasterDb()("bases_datos").where("db_name", dbName).first();
    return (row?.serie_facturacion || "F").toString();
  } catch {
    return "F";
  }
}

// Líneas a facturar (matrículas activas) con el IVA de cada clase
async function getLineasFacturables() {
  return db("Matriculas as m")
    .join("ClasesRecurrentes as cr", "m.IdClaseRecurrente", "cr.IdClaseRecurrente")
    .join("clientes as c", "m.IdCliente", "c.id")
    .leftJoin("Servicios as s", "cr.IdServicio", "s.IdServicio")
    .select(
      "m.IdMatricula",
      "m.IdClaseRecurrente",
      "m.IdCliente",
      "c.nombre",
      "c.apellido1",
      "c.apellido2",
      "cr.Nombre as NombreClase",
      "s.Codigo as CodigoServicio",
      "m.CuotaMensual",
      db.raw('COALESCE(s."PorcentajeIva", 0)::numeric as "PorcentajeIva"')
    )
    .where("m.Activo", 1)
    .andWhere("cr.Activo", 1)
    .andWhere("m.CuotaMensual", ">", 0) // solo facturar mensualidad si la cuota > 0
    .orderBy("c.nombre", "asc");
}

// Conjunto de "idCliente-idClaseRecurrente" ya facturados en un periodo (anti-duplicado por alumno+clase)
async function yaFacturadoClaseSet(observacionesLike: string): Promise<Set<string>> {
  const rows = await db("FacturasLineas as fl")
    .join("Facturas as f", "fl.IdFactura", "f.IdFactura")
    .whereILike("f.Observaciones", observacionesLike)
    .andWhere("f.Estado", "ACTIVA")
    .whereNotNull("fl.IdClaseRecurrente")
    .select("f.IdCliente", "fl.IdClaseRecurrente");
  return new Set(rows.map((r: any) => `${r.IdCliente}-${r.IdClaseRecurrente}`));
}

// Quita de cada factura las líneas (alumno+clase) ya facturadas en el periodo.
// Marca yaFacturado=true en las facturas que se quedan sin líneas nuevas.
function excluirLineasYaFacturadas(facturas: any[], yaSet: Set<string>) {
  for (const f of facturas) {
    f.lineas = f.lineas.filter((l: any) => !yaSet.has(`${f.idCliente}-${l.idClaseRecurrente}`));
    f.yaFacturado = f.lineas.length === 0;
  }
}

function nombreAlumno(r: any) {
  return [r.nombre, r.apellido1, r.apellido2].filter(Boolean).join(" ");
}

// Agrupa las líneas por alumno y calcula importes
function construirFacturas(lineas: any[], prefijoDesc = "") {
  const porAlumno = new Map<number, any>();
  for (const l of lineas) {
    const cuota = Number(l.CuotaMensual) || 0;
    const pcIva = Number(l.PorcentajeIva) || 0;
    const base = Math.round(cuota * 100) / 100;
    const iva = Math.round(base * pcIva) / 100;
    const total = Math.round((base + iva) * 100) / 100;

    if (!porAlumno.has(l.IdCliente)) {
      porAlumno.set(l.IdCliente, {
        idCliente: l.IdCliente,
        nombreAlumno: nombreAlumno(l),
        lineas: [],
        totalBase: 0,
        totalIva: 0,
        total: 0,
      });
    }
    const f = porAlumno.get(l.IdCliente);
    f.lineas.push({
      idMatricula: l.IdMatricula,
      idClaseRecurrente: l.IdClaseRecurrente ?? null,
      codigo: l.CodigoServicio ?? null,
      descripcion: prefijoDesc + l.NombreClase,
      cuota: base,
      pcIva,
      base,
      iva,
      total,
    });
    f.totalBase = Math.round((f.totalBase + base) * 100) / 100;
    f.totalIva = Math.round((f.totalIva + iva) * 100) / 100;
    f.total = Math.round((f.total + total) * 100) / 100;
  }
  return Array.from(porAlumno.values());
}

// Descuento (%) por alumno, sumando las subfamilias de cliente que aplican a cada concepto
async function resolverDescuentos(idsCliente: number[]) {
  const map = new Map<number, { cuota: number; matricula: number }>();
  if (!idsCliente.length) return map;
  const rows = await db("clientes_subfamilias as cs")
    .join("subfamilias_clientes as sf", "cs.id_subfamilia", "sf.id")
    .join("familias_clientes as fa", "sf.id_familia", "fa.id")
    .whereIn("cs.id_cliente", idsCliente)
    .andWhere("sf.activa", true)
    .andWhere("sf.descuento_porcentaje", ">", 0)
    .select("cs.id_cliente", "sf.descuento_porcentaje", "fa.aplica_cuota", "fa.aplica_matricula");
  for (const r of rows as any[]) {
    const e = map.get(Number(r.id_cliente)) || { cuota: 0, matricula: 0 };
    if (r.aplica_cuota) e.cuota += Number(r.descuento_porcentaje);
    if (r.aplica_matricula) e.matricula += Number(r.descuento_porcentaje);
    map.set(Number(r.id_cliente), e);
  }
  for (const e of map.values()) {
    e.cuota = Math.min(e.cuota, 100);
    e.matricula = Math.min(e.matricula, 100);
  }
  return map;
}

// Aplica el descuento por alumno a sus líneas (recalcula base/iva/total). override = ajuste manual del front
function aplicarDescuentos(
  facturas: any[],
  descMap: Map<number, { cuota: number; matricula: number }>,
  campo: "cuota" | "matricula",
  override?: Record<string, number>
) {
  for (const f of facturas) {
    let pct = descMap.get(Number(f.idCliente))?.[campo] ?? 0;
    if (override && override[f.idCliente] !== undefined && override[f.idCliente] !== null) {
      pct = Number(override[f.idCliente]);
    }
    f.descuentoPorcentaje = pct;
    f.totalBase = 0;
    f.totalIva = 0;
    f.total = 0;
    f.totalDescuento = 0;
    for (const ln of f.lineas) {
      const bruto = ln.cuota;
      const importeDesc = Math.round(bruto * pct) / 100;
      const base = Math.round((bruto - importeDesc) * 100) / 100;
      const iva = Math.round(base * ln.pcIva) / 100;
      ln.pcDescuento = pct;
      ln.importeDescuento = importeDesc;
      ln.base = base;
      ln.iva = iva;
      ln.total = Math.round((base + iva) * 100) / 100;
      f.totalBase = Math.round((f.totalBase + base) * 100) / 100;
      f.totalIva = Math.round((f.totalIva + iva) * 100) / 100;
      f.total = Math.round((f.total + ln.total) * 100) / 100;
      f.totalDescuento = Math.round((f.totalDescuento + importeDesc) * 100) / 100;
    }
  }
}

/** GET /facturacion-mensual/preview?mes=&anyo= */
export async function previewMensual(req: Request, res: Response, next: NextFunction) {
  try {
    const mes = Number(req.query.mes);
    const anyo = Number(req.query.anyo);
    if (!mes || !anyo || mes < 1 || mes > 12) {
      res.status(400).json({ error: "Mes y año válidos son obligatorios" });
      return;
    }

    const etiqueta = etiquetaMes(mes, anyo);
    const lineas = await getLineasFacturables();
    const facturas = construirFacturas(lineas);
    // Excluir las clases ya facturadas este mes a cada alumno (anti-duplicado alumno+clase)
    const yaSet = await yaFacturadoClaseSet(etiqueta);
    excluirLineasYaFacturadas(facturas, yaSet);
    const desc = await resolverDescuentos(facturas.map((f) => f.idCliente));
    aplicarDescuentos(facturas, desc, "cuota");

    const resumen = facturas.reduce(
      (acc, f) => ({
        numAlumnos: acc.numAlumnos + 1,
        totalBase: Math.round((acc.totalBase + f.totalBase) * 100) / 100,
        totalIva: Math.round((acc.totalIva + f.totalIva) * 100) / 100,
        total: Math.round((acc.total + f.total) * 100) / 100,
      }),
      { numAlumnos: 0, totalBase: 0, totalIva: 0, total: 0 }
    );

    res.json({ mes, anyo, etiqueta, facturas, resumen });
  } catch (e) {
    next(e);
  }
}

/** POST /facturacion-mensual/generar  body: { mes, anyo, alumnosExcluidos?, lineasExcluidas? } */
export async function generarMensual(req: Request, res: Response, next: NextFunction) {
  try {
    const mes = Number(req.body?.mes);
    const anyo = Number(req.body?.anyo);
    if (!mes || !anyo || mes < 1 || mes > 12) {
      res.status(400).json({ error: "Mes y año válidos son obligatorios" });
      return;
    }
    const alumnosExcluidos = new Set((req.body?.alumnosExcluidos ?? []).map(Number));
    const lineasExcluidas = new Set((req.body?.lineasExcluidas ?? []).map(Number));
    const omitirYaFacturados = req.body?.omitirYaFacturados !== false;

    const lineasRaw = await getLineasFacturables();
    // Aplicar exclusiones
    const lineasFiltradas = lineasRaw.filter(
      (l) => !alumnosExcluidos.has(Number(l.IdCliente)) && !lineasExcluidas.has(Number(l.IdMatricula))
    );
    const etiqueta = etiquetaMes(mes, anyo);
    const fechaFactura = `${anyo}-${String(mes).padStart(2, "0")}-01`;

    let facturas = construirFacturas(lineasFiltradas).filter((f) => f.lineas.length > 0);
    // Anti-duplicado por alumno+clase: quitar las clases ya facturadas este mes
    if (omitirYaFacturados) {
      const yaSet = await yaFacturadoClaseSet(etiqueta);
      excluirLineasYaFacturadas(facturas, yaSet);
      facturas = facturas.filter((f) => f.lineas.length > 0);
    }
    const desc = await resolverDescuentos(facturas.map((f) => f.idCliente));
    aplicarDescuentos(facturas, desc, "cuota", req.body?.descuentos);

    const serie = await getSerie(req);

    if (facturas.length === 0) {
      res.json({ creadas: 0, mensaje: "No había nada que facturar (todo excluido o ya facturado).", facturas: [] });
      return;
    }

    const creadas: any[] = [];
    await db.transaction(async (trx) => {
      // Número correlativo de partida para la serie y año
      const last = await trx("Facturas")
        .where("Serie", serie)
        .max("Numero as maxNum")
        .first();
      let numero = Number(last?.maxNum || 0);

      for (const f of facturas) {
        numero += 1;
        const [facturaRow] = await trx("Facturas")
          .insert({
            Serie: serie,
            Numero: numero,
            FechaFactura: fechaFactura,
            IdCliente: f.idCliente,
            TipoFactura: "NORMAL",
            TotalBaseImponible: f.totalBase,
            TotalCuotaIva: f.totalIva,
            TotalFactura: f.total,
            EstadoFiscal: "EMITIDA",
            EstadoCobro: "PENDIENTE",
            Estado: "ACTIVA",
            Observaciones: etiqueta,
          })
          .returning(["IdFactura", "Serie", "Numero"]);

        const idFactura = facturaRow.IdFactura ?? facturaRow;
        let nl = 0;
        for (const ln of f.lineas) {
          nl += 1;
          await trx("FacturasLineas").insert({
            IdFactura: idFactura,
            NumeroLinea: nl,
            CodigoItem: ln.codigo,
            DescripcionItem: ln.descripcion,
            Cantidad: 1,
            PrecioUnitario: ln.cuota,
            BaseImporte: ln.base,
            PcIva: ln.pcIva,
            ImporteIva: ln.iva,
            PcDescuento: ln.pcDescuento ?? 0,
            ImporteDescuento: ln.importeDescuento ?? 0,
            ImporteLinea: ln.total,
            IdClaseRecurrente: ln.idClaseRecurrente ?? null,
          });
        }
        creadas.push({ idFactura, serie, numero, alumno: f.nombreAlumno, total: f.total });
      }
    });

    res.status(201).json({ creadas: creadas.length, serie, facturas: creadas });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// MATRÍCULAS (cobro anual, opción 1 pago o 2 cuotas)
// =========================================================

// Líneas de matrícula: importe de matrícula del servicio de cada clase activa (>0)
async function getLineasMatriculables() {
  return db("Matriculas as m")
    .join("ClasesRecurrentes as cr", "m.IdClaseRecurrente", "cr.IdClaseRecurrente")
    .join("clientes as c", "m.IdCliente", "c.id")
    .join("Servicios as s", "cr.IdServicio", "s.IdServicio")
    .select(
      "m.IdMatricula",
      "m.IdClaseRecurrente",
      "m.IdCliente",
      "c.nombre",
      "c.apellido1",
      "c.apellido2",
      "cr.Nombre as NombreClase",
      "s.Codigo as CodigoServicio",
      db.raw('s."ImporteMatricula" as "CuotaMensual"'),
      db.raw('COALESCE(s."PorcentajeIva", 0)::numeric as "PorcentajeIva"')
    )
    .where("m.Activo", 1)
    .andWhere("cr.Activo", 1)
    .andWhere("s.ImporteMatricula", ">", 0)
    .orderBy("c.nombre", "asc");
}

function etiquetaMatricula(anyo: number) {
  return `Matrícula ${anyo}`;
}

/** POST /facturacion-matriculas/alumno  body: { idCliente, idClaseRecurrente, anyo? }
 *  Crea la factura de matrícula de UN alumno por UNA clase (al matricularlo). */
export async function generarMatriculaAlumno(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.body?.idCliente);
    const idClase = Number(req.body?.idClaseRecurrente);
    const anyo = Number(req.body?.anyo) || new Date().getFullYear();
    if (!idCliente || !idClase) {
      res.status(400).json({ error: "Alumno y clase son obligatorios" });
      return;
    }

    // Clase + servicio (importe de matrícula e IVA)
    const clase = await db("ClasesRecurrentes as cr")
      .leftJoin("Servicios as s", "cr.IdServicio", "s.IdServicio")
      .select(
        "cr.Nombre as NombreClase",
        "s.Codigo as CodigoServicio",
        db.raw('COALESCE(s."ImporteMatricula", 0)::numeric as "ImporteMatricula"'),
        db.raw('COALESCE(s."PorcentajeIva", 0)::numeric as "PorcentajeIva"')
      )
      .where("cr.IdClaseRecurrente", idClase)
      .first();

    if (!clase || Number(clase.ImporteMatricula) <= 0) {
      res.json({ creada: false, mensaje: "La clase no tiene importe de matrícula configurado." });
      return;
    }

    const etiqueta = `${etiquetaMatricula(anyo)} · ${clase.NombreClase}`;
    const dup = await db("Facturas")
      .where("IdCliente", idCliente)
      .andWhere("Observaciones", etiqueta)
      .andWhere("Estado", "ACTIVA")
      .first();
    if (dup) {
      res.json({ creada: false, mensaje: "La matrícula de esta clase ya estaba facturada este año." });
      return;
    }

    // Descuento de matrícula del alumno
    const desc = await resolverDescuentos([idCliente]);
    const pct = desc.get(idCliente)?.matricula ?? 0;

    const bruto = Math.round(Number(clase.ImporteMatricula) * 100) / 100;
    const importeDesc = Math.round(bruto * pct) / 100;
    const base = Math.round((bruto - importeDesc) * 100) / 100;
    const pcIva = Number(clase.PorcentajeIva) || 0;
    const iva = Math.round(base * pcIva) / 100;
    const total = Math.round((base + iva) * 100) / 100;

    const serie = await getSerie(req);
    const fecha = new Date().toISOString().slice(0, 10);

    let creada: any = null;
    await db.transaction(async (trx) => {
      const last = await trx("Facturas").where("Serie", serie).max("Numero as maxNum").first();
      const numero = Number(last?.maxNum || 0) + 1;
      const [row] = await trx("Facturas")
        .insert({
          Serie: serie,
          Numero: numero,
          FechaFactura: fecha,
          IdCliente: idCliente,
          TipoFactura: "NORMAL",
          TotalBaseImponible: base,
          TotalCuotaIva: iva,
          TotalFactura: total,
          EstadoFiscal: "EMITIDA",
          EstadoCobro: "PENDIENTE",
          Estado: "ACTIVA",
          Observaciones: etiqueta,
        })
        .returning(["IdFactura"]);
      const idFactura = row.IdFactura ?? row;
      await trx("FacturasLineas").insert({
        IdFactura: idFactura,
        NumeroLinea: 1,
        CodigoItem: clase.CodigoServicio,
        DescripcionItem: `Matrícula · ${clase.NombreClase}`,
        Cantidad: 1,
        PrecioUnitario: bruto,
        BaseImporte: base,
        PcIva: pcIva,
        ImporteIva: iva,
        PcDescuento: pct,
        ImporteDescuento: importeDesc,
        ImporteLinea: total,
        IdClaseRecurrente: idClase,
      });
      creada = { idFactura, serie, numero, total };
    });

    res.status(201).json({ creada: true, factura: creada });
  } catch (e) {
    next(e);
  }
}

/** GET /facturacion-matriculas/preview?anyo= */
export async function previewMatriculas(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = Number(req.query.anyo);
    if (!anyo) {
      res.status(400).json({ error: "Año válido obligatorio" });
      return;
    }
    const lineas = await getLineasMatriculables();
    const facturas = construirFacturas(lineas, "Matrícula · ");
    const desc = await resolverDescuentos(facturas.map((f) => f.idCliente));
    aplicarDescuentos(facturas, desc, "matricula");

    const etiqueta = etiquetaMatricula(anyo);
    const yaFacturados = await db("Facturas")
      .whereILike("Observaciones", `${etiqueta}%`)
      .andWhere("Estado", "ACTIVA")
      .distinct("IdCliente")
      .pluck("IdCliente");
    const setYa = new Set(yaFacturados.map(Number));
    for (const f of facturas) f.yaFacturado = setYa.has(f.idCliente);

    const resumen = facturas.reduce(
      (acc, f) => ({
        numAlumnos: acc.numAlumnos + 1,
        totalBase: Math.round((acc.totalBase + f.totalBase) * 100) / 100,
        totalIva: Math.round((acc.totalIva + f.totalIva) * 100) / 100,
        total: Math.round((acc.total + f.total) * 100) / 100,
      }),
      { numAlumnos: 0, totalBase: 0, totalIva: 0, total: 0 }
    );

    res.json({ anyo, etiqueta, facturas, resumen });
  } catch (e) {
    next(e);
  }
}

/** POST /facturacion-matriculas/generar  body: { anyo, numCuotas(1|2), alumnosExcluidos?, lineasExcluidas? } */
export async function generarMatriculas(req: Request, res: Response, next: NextFunction) {
  try {
    const anyo = Number(req.body?.anyo);
    if (!anyo) {
      res.status(400).json({ error: "Año válido obligatorio" });
      return;
    }
    const numCuotas = Number(req.body?.numCuotas) === 2 ? 2 : 1;
    const alumnosExcluidos = new Set((req.body?.alumnosExcluidos ?? []).map(Number));
    const lineasExcluidas = new Set((req.body?.lineasExcluidas ?? []).map(Number));
    const omitirYaFacturados = req.body?.omitirYaFacturados !== false;

    const lineasRaw = await getLineasMatriculables();
    const lineasFiltradas = lineasRaw.filter(
      (l) => !alumnosExcluidos.has(Number(l.IdCliente)) && !lineasExcluidas.has(Number(l.IdMatricula))
    );
    let facturas = construirFacturas(lineasFiltradas, "Matrícula · ").filter((f) => f.lineas.length > 0);
    const desc = await resolverDescuentos(facturas.map((f) => f.idCliente));
    aplicarDescuentos(facturas, desc, "matricula", req.body?.descuentos);

    const serie = await getSerie(req);
    const etiquetaBase = etiquetaMatricula(anyo);

    if (omitirYaFacturados) {
      const yaFacturados = await db("Facturas")
        .whereILike("Observaciones", `${etiquetaBase}%`)
        .andWhere("Estado", "ACTIVA")
        .distinct("IdCliente")
        .pluck("IdCliente");
      const setYa = new Set(yaFacturados.map(Number));
      facturas = facturas.filter((f) => !setYa.has(f.idCliente));
    }

    if (facturas.length === 0) {
      res.json({ creadas: 0, mensaje: "No había matrículas que facturar (todo excluido o ya facturado).", facturas: [] });
      return;
    }

    const creadas: any[] = [];
    await db.transaction(async (trx) => {
      const last = await trx("Facturas")
        .where("Serie", serie)
        .max("Numero as maxNum")
        .first();
      let numero = Number(last?.maxNum || 0);

      for (const f of facturas) {
        // numCuotas facturas por alumno (1 o 2), cada una con el importe dividido
        for (let cuota = 1; cuota <= numCuotas; cuota++) {
          numero += 1;
          const factor = 1 / numCuotas;
          const sufijo = numCuotas === 2 ? ` (${cuota}/2)` : "";
          const fecha = `${anyo}-${cuota === 1 ? "09" : "01"}-01`; // 1ª: sept; 2ª: enero
          const totalBase = Math.round(f.totalBase * factor * 100) / 100;
          const totalIva = Math.round(f.totalIva * factor * 100) / 100;
          const total = Math.round((totalBase + totalIva) * 100) / 100;

          const [facturaRow] = await trx("Facturas")
            .insert({
              Serie: serie,
              Numero: numero,
              FechaFactura: fecha,
              IdCliente: f.idCliente,
              TipoFactura: "NORMAL",
              TotalBaseImponible: totalBase,
              TotalCuotaIva: totalIva,
              TotalFactura: total,
              EstadoFiscal: "EMITIDA",
              EstadoCobro: "PENDIENTE",
              Estado: "ACTIVA",
              Observaciones: etiquetaBase + sufijo,
            })
            .returning(["IdFactura"]);
          const idFactura = facturaRow.IdFactura ?? facturaRow;

          let nl = 0;
          for (const ln of f.lineas) {
            nl += 1;
            const base = Math.round(ln.base * factor * 100) / 100;
            const iva = Math.round(ln.iva * factor * 100) / 100;
            await trx("FacturasLineas").insert({
              IdFactura: idFactura,
              NumeroLinea: nl,
              CodigoItem: ln.codigo,
              DescripcionItem: ln.descripcion + sufijo,
              Cantidad: 1,
              PrecioUnitario: Math.round(ln.cuota * factor * 100) / 100,
              BaseImporte: base,
              PcIva: ln.pcIva,
              ImporteIva: iva,
              PcDescuento: ln.pcDescuento ?? 0,
              ImporteDescuento: Math.round((ln.importeDescuento ?? 0) * factor * 100) / 100,
              ImporteLinea: Math.round((base + iva) * 100) / 100,
            });
          }
          creadas.push({ idFactura, serie, numero, alumno: f.nombreAlumno, total, cuota: numCuotas === 2 ? `${cuota}/2` : "única" });
        }
      }
    });

    res.status(201).json({ creadas: creadas.length, serie, numCuotas, facturas: creadas });
  } catch (e) {
    next(e);
  }
}
