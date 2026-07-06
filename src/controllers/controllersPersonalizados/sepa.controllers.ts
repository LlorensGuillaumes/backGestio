// src/controllers/controllersPersonalizados/sepa.controllers.ts
// Generación de fichero SEPA de adeudos directos (pain.008.001.02) para cobrar
// las facturas de venta domiciliadas (mensualidades / matrículas) de la escuela.
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

function xmlEsc(s: any): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function edadDe(fechaNac: any): number | null {
  if (!fechaNac) return null;
  return Math.floor((Date.now() - new Date(fechaNac).getTime()) / (365.25 * 24 * 3600 * 1000));
}

// Resuelve el IBAN/titular pagador de cada cliente (mayor→propio; menor→responsable pagador)
async function resolverPagadores(idsCliente: number[]) {
  const alumnos = await db("clientes as c")
    .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
    .whereIn("c.id", idsCliente)
    .select("c.id", "c.iban", "c.titular_cuenta", "c.nombre", "cp.fecha_nacimiento");
  const responsables = await db("AlumnoResponsables as ar")
    .join("Contactos as co", "ar.IdContacto", "co.IdContacto")
    .whereIn("ar.IdCliente", idsCliente)
    .andWhere("ar.Activo", 1)
    .andWhere("ar.EsPagador", true)
    .select("ar.IdCliente", "co.Iban", "co.TitularCuenta");
  const respMap = new Map(responsables.map((r: any) => [Number(r.IdCliente), r]));

  const map = new Map<number, { iban: string; titular: string }>();
  for (const a of alumnos as any[]) {
    const esMayor = (edadDe(a.fecha_nacimiento) ?? 99) >= 18;
    if (esMayor && a.iban) {
      map.set(Number(a.id), { iban: a.iban, titular: a.titular_cuenta || a.nombre || "Titular" });
    } else {
      const r = respMap.get(Number(a.id));
      if (r?.Iban) map.set(Number(a.id), { iban: r.Iban, titular: r.TitularCuenta || "Titular" });
    }
  }
  return map;
}

// Estados de cobro válidos
const ESTADOS_COBRO = ["PENDIENTE", "SEPA_GENERADO", "PAGADA", "DEVUELTA"];
const ESTADOS_FISCAL = ["EMITIDA", "ANULADA", "RECTIFICADA"];

/** PUT /facturas/:id/estado  body: { estadoCobro?, estadoFiscal? } */
export async function updateEstadoFactura(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { estadoCobro, estadoFiscal } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (estadoCobro !== undefined) {
      if (!ESTADOS_COBRO.includes(estadoCobro)) {
        res.status(400).json({ error: `Estado de cobro inválido (${ESTADOS_COBRO.join(", ")})` });
        return;
      }
      patch.EstadoCobro = estadoCobro;
    }
    if (estadoFiscal !== undefined) {
      if (!ESTADOS_FISCAL.includes(estadoFiscal)) {
        res.status(400).json({ error: `Estado fiscal inválido (${ESTADOS_FISCAL.join(", ")})` });
        return;
      }
      patch.EstadoFiscal = estadoFiscal;
    }
    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "Nada que actualizar" });
      return;
    }
    patch.FechaModificacion = new Date();
    await db("Facturas").where("IdFactura", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

/** POST /sepa/preview  body: { idsFactura:[] }  → facturas con su pagador resuelto */
export async function previewSepa(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = (req.body?.idsFactura ?? []).map(Number).filter(Boolean);
    if (!ids.length) {
      res.json({ facturas: [], total: 0, sinIban: 0 });
      return;
    }
    const facturas = await db("Facturas as f")
      .leftJoin("clientes as c", "c.id", "f.IdCliente")
      .leftJoin("cliente_persona as cp", "cp.id_cliente", "c.id")
      .whereIn("f.IdFactura", ids)
      .select(
        "f.IdFactura",
        "f.Serie",
        "f.Numero",
        "f.IdCliente",
        "f.TotalFactura",
        "f.Observaciones",
        "f.EstadoCobro",
        db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido,''), c.nombre, '') as "nombreCliente"`)
      );
    const pagadores = await resolverPagadores(facturas.map((f: any) => Number(f.IdCliente)));

    let total = 0;
    let sinIban = 0;
    const out = facturas.map((f: any) => {
      const pag = pagadores.get(Number(f.IdCliente));
      total += Number(f.TotalFactura);
      if (!pag) sinIban += 1;
      return {
        idFactura: f.IdFactura,
        numero: `${f.Serie}${f.Numero}`,
        nombreCliente: f.nombreCliente?.trim(),
        importe: Number(f.TotalFactura),
        concepto: f.Observaciones,
        estadoCobro: f.EstadoCobro,
        iban: pag?.iban ?? null,
        titular: pag?.titular ?? null,
      };
    });
    res.json({ facturas: out, total: Math.round(total * 100) / 100, sinIban });
  } catch (e) {
    next(e);
  }
}

/** POST /sepa/generar  body: { idsFactura:[], fechaCobro? }  → XML pain.008 */
export async function generarSepa(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = (req.body?.idsFactura ?? []).map(Number).filter(Boolean);
    if (!ids.length) {
      res.status(400).json({ error: "No hay facturas seleccionadas" });
      return;
    }

    const empresa = await db("datos_empresa").first();
    if (!empresa?.iban || !empresa?.creditor_id) {
      res.status(400).json({ error: "Faltan datos bancarios del acreedor (IBAN / Identificador de acreedor) en Configuración → Empresa" });
      return;
    }

    const facturas = await db("Facturas as f")
      .leftJoin("clientes as c", "c.id", "f.IdCliente")
      .leftJoin("cliente_persona as cp", "cp.id_cliente", "c.id")
      .whereIn("f.IdFactura", ids)
      .select(
        "f.IdFactura",
        "f.Serie",
        "f.Numero",
        "f.IdCliente",
        "f.TotalFactura",
        "f.Observaciones",
        db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido,''), c.nombre, '') as "nombreCliente"`)
      );
    const pagadores = await resolverPagadores(facturas.map((f: any) => Number(f.IdCliente)));

    const incluidas = facturas.filter((f: any) => pagadores.has(Number(f.IdCliente)));
    const excluidasSinIban = facturas
      .filter((f: any) => !pagadores.has(Number(f.IdCliente)))
      .map((f: any) => `${f.Serie}${f.Numero} (${f.nombreCliente?.trim()})`);

    if (incluidas.length === 0) {
      res.status(400).json({ error: "Ninguna factura tiene IBAN de pago configurado", excluidasSinIban });
      return;
    }

    const now = new Date();
    const isoNow = now.toISOString().slice(0, 19);
    const msgId = `SEPA${now.getTime()}`;
    const fechaCobro = (req.body?.fechaCobro as string) || new Date(now.getTime() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const ctrlSum = Math.round(incluidas.reduce((a: number, f: any) => a + Number(f.TotalFactura), 0) * 100) / 100;
    const nb = incluidas.length;

    const txs = incluidas
      .map((f: any, i: number) => {
        const pag = pagadores.get(Number(f.IdCliente))!;
        const importe = Number(f.TotalFactura).toFixed(2);
        return `      <DrctDbtTxInf>
        <PmtId><EndToEndId>${xmlEsc(f.Serie + f.Numero)}</EndToEndId></PmtId>
        <InstdAmt Ccy="EUR">${importe}</InstdAmt>
        <DrctDbtTx><MndtRltdInf><MndtId>MND-${xmlEsc(f.IdCliente)}</MndtId><DtOfSgntr>2024-01-01</DtOfSgntr></MndtRltdInf></DrctDbtTx>
        <DbtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></DbtrAgt>
        <Dbtr><Nm>${xmlEsc(pag.titular)}</Nm></Dbtr>
        <DbtrAcct><Id><IBAN>${xmlEsc(pag.iban.replace(/\s/g, ""))}</IBAN></Id></DbtrAcct>
        <RmtInf><Ustrd>${xmlEsc(f.Observaciones || f.Serie + f.Numero)}</Ustrd></RmtInf>
      </DrctDbtTxInf>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${isoNow}</CreDtTm>
      <NbOfTxs>${nb}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${xmlEsc(empresa.nombre_empresa)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-1</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${nb}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl><LclInstrm><Cd>CORE</Cd></LclInstrm><SeqTp>RCUR</SeqTp></PmtTpInf>
      <ReqdColltnDt>${fechaCobro}</ReqdColltnDt>
      <Cdtr><Nm>${xmlEsc(empresa.nombre_empresa)}</Nm></Cdtr>
      <CdtrAcct><Id><IBAN>${xmlEsc(String(empresa.iban).replace(/\s/g, ""))}</IBAN></Id></CdtrAcct>
      <CdtrAgt><FinInstnId>${empresa.bic ? `<BIC>${xmlEsc(empresa.bic)}</BIC>` : "<Othr><Id>NOTPROVIDED</Id></Othr>"}</FinInstnId></CdtrAgt>
      <ChrgBr>SLEV</ChrgBr>
      <CdtrSchmeId><Id><PrvtId><Othr><Id>${xmlEsc(empresa.creditor_id)}</Id><SchmeNm><Prtry>SEPA</Prtry></SchmeNm></Othr></PrvtId></Id></CdtrSchmeId>
${txs}
    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;

    // Marcar las facturas incluidas (pendientes) como "SEPA generado"
    const idsIncluidas = incluidas.map((f: any) => f.IdFactura);
    await db("Facturas")
      .whereIn("IdFactura", idsIncluidas)
      .andWhere("EstadoCobro", "PENDIENTE")
      .update({ EstadoCobro: "SEPA_GENERADO", FechaModificacion: new Date() });

    res.json({
      xml,
      resumen: { incluidas: incluidas.length, total: ctrlSum, fechaCobro, excluidasSinIban },
    });
  } catch (e) {
    next(e);
  }
}
