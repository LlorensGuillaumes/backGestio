// src/controllers/controllersPersonalizados/sepaPagos.controllers.ts
// SEPA de PAGOS (transferencias, pain.001.001.03): la escuela PAGA a trabajadores
// (líquido de nóminas) y a proveedores/autónomos (facturas de compra).
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getMasterDb } from "../../db/masterDb.js";

const MESES = ["", "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function xmlEsc(s: any): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Pagos de nóminas pendientes (líquido) con el IBAN del trabajador
async function pagosNominas(anyo?: number, mes?: number) {
  let q = db("Nominas").where("Activo", 1).andWhere("EstadoPago", "PENDIENTE");
  if (anyo) q = q.where("Anyo", anyo);
  if (mes) q = q.where("Mes", mes);
  const nominas = await q.select("IdNomina", "IdUsuario", "Mes", "Anyo", "LiquidoPagar");
  const ids = [...new Set(nominas.map((n: any) => Number(n.IdUsuario)))];
  const trab = ids.length ? await getMasterDb()("usuarios").whereIn("id", ids).select("id", "nombre", "iban") : [];
  const map = new Map(trab.map((t: any) => [Number(t.id), t]));
  return nominas.map((n: any) => {
    const t = map.get(Number(n.IdUsuario));
    return { id: n.IdNomina, beneficiario: t?.nombre ?? "—", iban: t?.iban ?? null, importe: Number(n.LiquidoPagar), concepto: `Nómina ${MESES[n.Mes]}/${n.Anyo}` };
  });
}

// Pagos de facturas de compra pendientes con el IBAN del proveedor
async function pagosCompras() {
  const fc = await db("FacturasCompra as fc")
    .leftJoin("Proveedores as p", "fc.IdProveedor", "p.IdProveedor")
    .where("fc.Estado", "ACTIVA")
    .andWhere("fc.ImportePendiente", ">", 0)
    .select("fc.IdFacturaCompra", "fc.SerieFactura", "fc.NumeroFactura", "fc.ImportePendiente", "p.Nombre", "p.Iban");
  return fc.map((f: any) => ({ id: f.IdFacturaCompra, beneficiario: f.Nombre ?? "—", iban: f.Iban ?? null, importe: Number(f.ImportePendiente), concepto: `Factura ${f.SerieFactura}${f.NumeroFactura}` }));
}

async function reunirPagos(tipo: string, anyo?: number, mes?: number) {
  return tipo === "COMPRAS" ? pagosCompras() : pagosNominas(anyo, mes);
}

/** POST /sepa/pagos/preview  body: { tipo:'NOMINAS'|'COMPRAS', mes?, anyo? } */
export async function previewPagos(req: Request, res: Response, next: NextFunction) {
  try {
    const tipo = req.body?.tipo === "COMPRAS" ? "COMPRAS" : "NOMINAS";
    const pagos = await reunirPagos(tipo, Number(req.body?.anyo) || undefined, Number(req.body?.mes) || undefined);
    const total = Math.round(pagos.reduce((a, p) => a + p.importe, 0) * 100) / 100;
    const sinIban = pagos.filter((p) => !p.iban).length;
    res.json({ tipo, pagos, total, sinIban });
  } catch (e) {
    next(e);
  }
}

/** POST /sepa/pagos/generar  body: { tipo, ids:[], fechaPago?, mes?, anyo? } → XML pain.001 */
export async function generarPagos(req: Request, res: Response, next: NextFunction) {
  try {
    const tipo = req.body?.tipo === "COMPRAS" ? "COMPRAS" : "NOMINAS";
    const ids = new Set((req.body?.ids ?? []).map(Number));

    const empresa = await db("datos_empresa").first();
    if (!empresa?.iban) {
      res.status(400).json({ error: "Falta el IBAN de la empresa (Configuración → Empresa)" });
      return;
    }

    let pagos = await reunirPagos(tipo, Number(req.body?.anyo) || undefined, Number(req.body?.mes) || undefined);
    if (ids.size) pagos = pagos.filter((p) => ids.has(Number(p.id)));
    const incluidos = pagos.filter((p) => p.iban);
    const excluidosSinIban = pagos.filter((p) => !p.iban).map((p) => `${p.beneficiario} (${p.concepto})`);
    if (!incluidos.length) {
      res.status(400).json({ error: "No hay pagos con IBAN para incluir", excluidosSinIban });
      return;
    }

    const now = new Date();
    const isoNow = now.toISOString().slice(0, 19);
    const msgId = `PAGO${now.getTime()}`;
    const fechaPago = (req.body?.fechaPago as string) || new Date(now.getTime() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const ctrlSum = Math.round(incluidos.reduce((a, p) => a + p.importe, 0) * 100) / 100;
    const nb = incluidos.length;

    const txs = incluidos.map((p) => `      <CdtTrfTxInf>
        <PmtId><EndToEndId>${xmlEsc(`${tipo}-${p.id}`)}</EndToEndId></PmtId>
        <Amt><InstdAmt Ccy="EUR">${p.importe.toFixed(2)}</InstdAmt></Amt>
        <CdtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></CdtrAgt>
        <Cdtr><Nm>${xmlEsc(p.beneficiario)}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${xmlEsc(String(p.iban).replace(/\s/g, ""))}</IBAN></Id></CdtrAcct>
        <RmtInf><Ustrd>${xmlEsc(p.concepto)}</Ustrd></RmtInf>
      </CdtTrfTxInf>`).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>${msgId}</MsgId>
      <CreDtTm>${isoNow}</CreDtTm>
      <NbOfTxs>${nb}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <InitgPty><Nm>${xmlEsc(empresa.nombre_empresa)}</Nm></InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${msgId}-1</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <NbOfTxs>${nb}</NbOfTxs>
      <CtrlSum>${ctrlSum.toFixed(2)}</CtrlSum>
      <PmtTpInf><SvcLvl><Cd>SEPA</Cd></SvcLvl></PmtTpInf>
      <ReqdExctnDt>${fechaPago}</ReqdExctnDt>
      <Dbtr><Nm>${xmlEsc(empresa.nombre_empresa)}</Nm></Dbtr>
      <DbtrAcct><Id><IBAN>${xmlEsc(String(empresa.iban).replace(/\s/g, ""))}</IBAN></Id></DbtrAcct>
      <DbtrAgt><FinInstnId>${empresa.bic ? `<BIC>${xmlEsc(empresa.bic)}</BIC>` : "<Othr><Id>NOTPROVIDED</Id></Othr>"}</FinInstnId></DbtrAgt>
      <ChrgBr>SLEV</ChrgBr>
${txs}
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    // Marcar como "SEPA generado"
    const idsIncluidos = incluidos.map((p) => Number(p.id));
    if (tipo === "NOMINAS") {
      await db("Nominas").whereIn("IdNomina", idsIncluidos).andWhere("EstadoPago", "PENDIENTE").update({ EstadoPago: "SEPA_GENERADO" });
    }

    res.json({ xml, resumen: { incluidos: incluidos.length, total: ctrlSum, fechaPago, excluidosSinIban } });
  } catch (e) {
    next(e);
  }
}
