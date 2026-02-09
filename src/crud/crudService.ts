// src/crud/crudService.ts
import db from "../db.js";
import type { TableConfig } from "./types.js";

function applyDefaultFiltersWithAlias(qb: any, cfg: TableConfig, alias: string) {
  if (!cfg.defaultFilters) return;
  for (const [k, v] of Object.entries(cfg.defaultFilters)) {
    qb.where(`${alias}.${k}`, v as any);
  }
}

export async function list(
  cfg: TableConfig,
  opts: {
    take?: number;
    offset?: number;
    where?: Record<string, any>;
    whereIn?: { field: string; values: any[] };
    select?: string[];
    includeInactive?: boolean;
    orderBy?: { field: string; dir?: "asc" | "desc" }; // opcional
  }
) {
  let q = db(cfg.table);

  if (!opts.includeInactive && cfg.defaultFilters) q = q.where(cfg.defaultFilters);
  if (opts.where) q = q.where(opts.where);
  if (opts.whereIn?.values?.length) q = q.whereIn(opts.whereIn.field, opts.whereIn.values);
  if (opts.select?.length) q = q.select(opts.select);

  const wantsPaging =
    typeof opts.take === "number" || typeof opts.offset === "number";

  // ✅ Si NO paginamos: ejecuta y punto (count barato)
  if (!wantsPaging) {
    const rows = await q;
    return { rows, totalCount: rows.length };
  }

  // ✅ Si paginamos: ORDER BY obligatorio (SQL Server lo exige para OFFSET)
  const take = Math.max(0, Number(opts.take ?? 50));
  const offset = Math.max(0, Number(opts.offset ?? 0));

  const orderField = opts.orderBy?.field ?? (cfg.pk?.[0] ?? null);
  if (!orderField) {
    throw new Error(`No puedo paginar ${cfg.table} sin orderBy o pk en cfg.pk`);
  }

  // Total
  const totalRow = await q
    .clone()
    .clearSelect()
    // por si acaso tu builder lleva orden
    // @ts-ignore
    .clearOrder?.()
    .count({ total: "*" })
    .first();

  const totalCount = Number((totalRow as any)?.total ?? 0);

  // Rows paginadas
  const rows = await q
    .clone()
    .orderBy(orderField, opts.orderBy?.dir ?? "asc")
    .limit(take)
    .offset(offset);

  return { rows, totalCount };
}


type ClienteListadoRow = Record<string, any> & {
  nombreCompleto: string;
  telefono_principal: string | null;
};

type CreateSubfamiliaInput = {
  id_familia: number;
  descripcion: string;
  activa: boolean;
  prioridad: number;
};

export async function listClientes(
  cfg: TableConfig,
  opts: { take?: number; offset?: number; includeInactive?: boolean }
) {
  const take = opts.take ?? 50;
  const offset = opts.offset ?? 0;
  const includeInactive = opts.includeInactive ?? false;

  const q = db({ c: cfg.table })
    .leftJoin({ cp: "cliente_persona" }, "c.id", "cp.id_cliente")
    .leftJoin({ ce: "cliente_empresa" }, "c.id", "ce.id_cliente")
    .leftJoin({ ct: "clientes_telefonos" }, function () {
      this.on("c.id", "=", "ct.id_cliente").andOn(
        "ct.es_principal",
        "=",
        db.raw("?", [1])
      );
    })
    .select(
      "c.*",
      "ct.telefono as telefono_principal",
      db.raw(`
        CASE
          WHEN c.tipo_cliente = 'P' THEN
            COALESCE(
              NULLIF(
                trim(
                  COALESCE(cp.nombre,'') || ' ' ||
                  COALESCE(cp.primer_apellido,'') || ' ' ||
                  COALESCE(cp.segundo_apellido,'')
                ),
                ''
              ),
              'Persona sin nombre'
            )
          ELSE
            COALESCE(
              NULLIF(trim(COALESCE(ce.razon_social,'')), ''),
              'Empresa sin nombre'
            )
        END AS "nombreCompleto"
      `)
    )
    .modify((qb) => {
      if (!includeInactive) qb.where("c.activo", 1);
      // si quisieras aplicar defaultFilters aquí también, hazlo con alias:
      // if (!includeInactive) applyDefaultFiltersWithAlias(qb, cfg, "c");
    })
    .limit(take)
    .offset(offset);

  const rows = (await q) as ClienteListadoRow[];

  const countRes = await db({ c: cfg.table })
    .modify((qb) => {
      if (!includeInactive) qb.where("c.activo", 1);
      // idem:
      // if (!includeInactive) applyDefaultFiltersWithAlias(qb, cfg, "c");
    })
    .countDistinct<{ total: string }>("c.id as total")
    .first();

  return {
    rows: rows.map((r: ClienteListadoRow) => ({
      ...r,
      telefono: r.telefono_principal || "Sin teléfono",
    })),
    totalCount: Number(countRes?.total ?? 0),
  };
}

type ClienteOneRowDb = Record<string, any> & {
  id: string | number;
  tipo_cliente: "P" | "E";
  telefono_principal: string | null;
  nombreCompleto: string;

  // persona (aliased)
  p_nombre: string | null;
  p_primer_apellido: string | null;
  p_segundo_apellido: string | null;
  p_fecha_nacimiento: string | null;

  // empresa (aliased)
  e_razon_social: string | null;
  e_nombre_fiscal: string | null;
  e_persona_contacto: string | null;
  e_email_contacto: string | null;
};

export async function getOneCliente(
  cfg: TableConfig,
  pk: Record<string, any>,
  opts?: { includeInactive?: boolean }
) {
  const includeInactive = opts?.includeInactive ?? false;

  const row = (await db({ c: cfg.table })
    .leftJoin({ cp: "cliente_persona" }, "c.id", "cp.id_cliente")
    .leftJoin({ ce: "cliente_empresa" }, "c.id", "ce.id_cliente")
    .leftJoin({ ct: "clientes_telefonos" }, function () {
      this.on("c.id", "=", "ct.id_cliente").andOn(
        "ct.es_principal",
        "=",
        db.raw("?", [1])
      );
    })
    .select(
      "c.*",
      "ct.telefono as telefono_principal",

      // persona
      "cp.nombre as p_nombre",
      "cp.primer_apellido as p_primer_apellido",
      "cp.segundo_apellido as p_segundo_apellido",
      db.raw(`to_char(cp.fecha_nacimiento::date, 'YYYY-MM-DD') as p_fecha_nacimiento`),


      // empresa (opcional)
      "ce.razon_social as e_razon_social",
      "ce.nombre_fiscal as e_nombre_fiscal",
      "ce.persona_contacto as e_persona_contacto",
      "ce.email_contacto as e_email_contacto",

      // nombreCompleto
      db.raw(`
        CASE
          WHEN c.tipo_cliente = 'P' THEN
            COALESCE(
              NULLIF(
                trim(
                  COALESCE(cp.nombre,'') || ' ' ||
                  COALESCE(cp.primer_apellido,'') || ' ' ||
                  COALESCE(cp.segundo_apellido,'')
                ),
                ''
              ),
              'Persona sin nombre'
            )
          ELSE
            COALESCE(
              NULLIF(trim(COALESCE(ce.razon_social,'')), ''),
              'Empresa sin nombre'
            )
        END AS "nombreCompleto"
      `)
    )
    .modify((qb) => {
      for (const k of cfg.pk) qb.where(`c.${k}`, pk[k]);

      if (!includeInactive) qb.where("c.activo", 1);

      // ✅ defaultFilters sin ambigüedad
      if (!includeInactive) applyDefaultFiltersWithAlias(qb, cfg, "c");
    })
    .first()) as ClienteOneRowDb | undefined;

  if (!row) return null;

  const telefonos = await db("clientes_telefonos")
    .where("id_cliente", row.id)
    .orderBy("es_principal", "desc")
    .orderBy("telefono", "asc");

  return {
    ...row,

    telefono: row.telefono_principal || "Sin teléfono",

    persona:
      row.tipo_cliente === "P"
        ? {
            nombre: row.p_nombre ?? null,
            primerApellido: row.p_primer_apellido ?? null,
            segundoApellido: row.p_segundo_apellido ?? null,
            fechaNacimiento: row.p_fecha_nacimiento ?? null,
          }
        : null,

    empresa:
      row.tipo_cliente === "E"
        ? {
            razonSocial: row.e_razon_social ?? null,
            nombreFiscal: row.e_nombre_fiscal ?? null,
            personaContacto: row.e_persona_contacto ?? null,
            emailContacto: row.e_email_contacto ?? null,
          }
        : null,

    telefonos,

    // limpiar aliases para no mandarlos al front (si quieres)
    p_nombre: undefined,
    p_primer_apellido: undefined,
    p_segundo_apellido: undefined,
    p_fecha_nacimiento: undefined,
    e_razon_social: undefined,
    e_nombre_fiscal: undefined,
    e_persona_contacto: undefined,
    e_email_contacto: undefined,
  };
}

export async function getOne(cfg: TableConfig, pk: Record<string, any>) {
  let q = db(cfg.table);
  if (cfg.defaultFilters) q = q.where(cfg.defaultFilters);

  for (const k of cfg.pk) q = q.where(k, pk[k]);

  return await q.first();
}

// ---- CLIENTES WRITE (POST/PUT) ---------------------------------------------

type TelefonoIn = { telefono: string; extension?: string | null };
type SubFamiliasIn = { idSubfamilia: number};

type PersonaIn = {
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
  fechaNacimiento?: string | null; // "YYYY-MM-DD"
};

type EmpresaIn = {
  razonSocial?: string | null;
  nombreFiscal?: string | null;
  contacto?: string | null; // en tu front viene "contacto"
  personaContacto?: string | null; // por si llega así
  email?: string | null;
  emailContacto?: string | null; // por si llega así
};

export type ClienteWritePayload = {
  tipo_cliente?: "P" | "E" | string;
  documento_fiscal?: string;
  nombre_comercial?: string | null;
  es_cliente_factura_simplificada?: boolean;

  direccion?: string | null;
  codigo_postal?: string | null;
  poblacion?: string | null;
  pais?: string | null;
  activo?: boolean;

  persona?: PersonaIn | null;
  empresa?: EmpresaIn | null;
  telefonos?: TelefonoIn[];
  subFamilias?: SubFamiliasIn[];
  

  // soporta PascalCase si te llega alguna vez
  TipoCliente?: "P" | "E" | string;
  DocumentoFiscal?: string;
  NombreComercial?: string | null;
  EsSimplificada?: boolean;
};

function s(v: any): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}
function b(v: any, def = false): boolean {
  if (v == null) return def;
  return Boolean(v);
}

function normalizeClienteWrite(body: ClienteWritePayload) {
  const tipo = String(body.tipo_cliente ?? body.TipoCliente ?? "").toUpperCase().trim();
  const tipo_cliente = (tipo === "P" || tipo === "E") ? (tipo as "P" | "E") : null;

  const documento_fiscal = s(body.documento_fiscal ?? body.DocumentoFiscal);
  const nombre_comercial = s(body.nombre_comercial ?? body.NombreComercial);
  const es_cliente_factura_simplificada = b(
    body.es_cliente_factura_simplificada ?? body.EsSimplificada,
    false
  );

  const direccion = s(body.direccion);
  const codigo_postal = s(body.codigo_postal);
  const poblacion = s(body.poblacion);
  const pais = s(body.pais) ?? "España";
  const activo = body.activo == null ? true : Boolean(body.activo);

  const persona = body.persona ?? null;
  const empresa = body.empresa ?? null;

  const telefonosIn = Array.isArray(body.telefonos) ? body.telefonos : [];
  const telefonos = telefonosIn
    .map((t: TelefonoIn) => ({
      telefono: s(t.telefono),
      extension: s(t.extension),
    }))
    .filter((t) => !!t.telefono) as { telefono: string; extension: string | null }[];
  const subFamiliasIn = Array.isArray(body.subFamilias) ? body.subFamilias : [];
  const subFamilias = subFamiliasIn
    .map((s: SubFamiliasIn) => ({
      idSubfamilia: s.idSubfamilia
    })) 

  return {
    tipo_cliente,
    documento_fiscal,
    nombre_comercial,
    es_cliente_factura_simplificada,
    direccion,
    codigo_postal,
    poblacion,
    pais,
    activo,
    persona,
    empresa,
    telefonos,
    subFamilias,
  };
}

function assertClienteWrite(p: ReturnType<typeof normalizeClienteWrite>) {
  if (!p.tipo_cliente) throw new Error("tipo_cliente inválido (P/E).");
  if (!p.documento_fiscal) throw new Error("documento_fiscal es obligatorio.");

  if (p.tipo_cliente === "P") {
    const nom = s(p.persona?.nombre);
    const ape1 = s(p.persona?.primerApellido);
    if (!nom && !ape1) throw new Error("Para Persona, falta nombre o primer apellido.");
  } else {
    const rz = s(p.empresa?.razonSocial);
    if (!rz) throw new Error("Para Empresa, falta razonSocial.");
  }
}

async function replaceTelefonos(trx: any, idCliente: number, telefonos: { telefono: string; extension: string | null }[]) {
  await trx("clientes_telefonos").where({ id_cliente: idCliente }).del();

  if (!telefonos.length) return;

  const rows = telefonos.map((t, idx) => ({
    id_cliente: idCliente,
    telefono: t.telefono,
    extension: t.extension,
    es_principal: idx === 0 ? 1 : 0, // tú lo comparas con 1 en el join
  }));

  await trx("clientes_telefonos").insert(rows);
}

async function replaceSubfamilias(trx: any, idCliente: number, subFamilias: { idSubfamilia: number}[]) {
  await trx("clientes_subfamilias").where({ id_cliente: idCliente }).del();

  if (!subFamilias.length) return;

  const rows = subFamilias.map((t) => ({
    id_cliente: idCliente,
    id_subfamilia: t.idSubfamilia,
  }));

  await trx("clientes_subfamilias").insert(rows);
}
async function upsertPersonaEmpresa(trx: any, idCliente: number, p: ReturnType<typeof normalizeClienteWrite>) {
  if (p.tipo_cliente === "P") {
    // borra empresa
    await trx("cliente_empresa").where({ id_cliente: idCliente }).del();

    await trx("cliente_persona")
      .insert({
        id_cliente: idCliente,
        nombre: s(p.persona?.nombre),
        primer_apellido: s(p.persona?.primerApellido),
        segundo_apellido: s(p.persona?.segundoApellido),
        fecha_nacimiento: s(p.persona?.fechaNacimiento), // YYYY-MM-DD (string) ok
      })
      .onConflict("id_cliente")
      .merge({
        nombre: s(p.persona?.nombre),
        primer_apellido: s(p.persona?.primerApellido),
        segundo_apellido: s(p.persona?.segundoApellido),
        fecha_nacimiento: s(p.persona?.fechaNacimiento),
      });

    return;
  }

  // tipo E
  await trx("cliente_persona").where({ id_cliente: idCliente }).del();

  const personaContacto = s(p.empresa?.contacto ?? p.empresa?.personaContacto);
  const emailContacto = s(p.empresa?.email ?? p.empresa?.emailContacto);

  await trx("cliente_empresa")
    .insert({
      id_cliente: idCliente,
      razon_social: s(p.empresa?.razonSocial),
      nombre_fiscal: s(p.empresa?.nombreFiscal),
      persona_contacto: personaContacto,
      email_contacto: emailContacto,
    })
    .onConflict("id_cliente")
    .merge({
      razon_social: s(p.empresa?.razonSocial),
      nombre_fiscal: s(p.empresa?.nombreFiscal),
      persona_contacto: personaContacto,
      email_contacto: emailContacto,
    });
}

export async function createCliente(cfg: TableConfig, body: ClienteWritePayload) {
  const p = normalizeClienteWrite(body);
  assertClienteWrite(p);

  const idCliente = await db.transaction(async (trx) => {
    const inserted = await trx(cfg.table)
      .insert({
        tipo_cliente: p.tipo_cliente,
        documento_fiscal: p.documento_fiscal,
        nombre_comercial: p.nombre_comercial,
        es_cliente_factura_simplificada: p.es_cliente_factura_simplificada,
        direccion: p.direccion,
        codigo_postal: p.codigo_postal,
        poblacion: p.poblacion,
        pais: p.pais,
        activo: p.activo,
      })
      .returning(["id"]);

    const newId = Number(Array.isArray(inserted) ? inserted[0]?.id : (inserted as any)?.id);
    if (!newId) throw new Error("No se pudo obtener id del cliente insertado.");

    await upsertPersonaEmpresa(trx, newId, p);
    await replaceTelefonos(trx, newId, p.telefonos);
    await replaceSubfamilias(trx, newId, p.subFamilias);

    return newId;
  });

  // devuelve el “full” (ya lo tienes hecho)
  return await getOneCliente(cfg, { id: String(idCliente) }, { includeInactive: true });
}

export async function updateCliente(cfg: TableConfig, idCliente: number, body: ClienteWritePayload) {
  try{

    console.log('entra en updateCliente')
    const p = normalizeClienteWrite(body);
  assertClienteWrite(p);

  await db.transaction(async (trx) => {
    const exists = await trx(cfg.table).where({ id: idCliente }).first();
    if (!exists) throw new Error("Cliente no encontrado.");

    await trx(cfg.table)
      .where({ id: idCliente })
      .update({
        tipo_cliente: p.tipo_cliente,
        documento_fiscal: p.documento_fiscal,
        nombre_comercial: p.nombre_comercial,
        es_cliente_factura_simplificada: p.es_cliente_factura_simplificada,
        direccion: p.direccion,
        codigo_postal: p.codigo_postal,
        poblacion: p.poblacion,
        pais: p.pais,
        activo: p.activo,
      });

    await upsertPersonaEmpresa(trx, idCliente, p);
    await replaceTelefonos(trx, idCliente, p.telefonos);
    await replaceSubfamilias(trx, idCliente, p.subFamilias);
  });

  return await getOneCliente(cfg, { id: String(idCliente) }, { includeInactive: true });

  }catch(error){
    console.log(error)
  }
  
}



export async function createSubfamiliaWithDefaultAcciones(input: CreateSubfamiliaInput) {
  // IDs fijos para los tipos de acción (deben coincidir con los registros en acciones_tipo)
  const ID_TIPO_DESCUENTO = 1;
  const ID_TIPO_INCREMENTO = 2;

  return await db.transaction(async (trx) => {
    // 1) crear subfamilia
    const inserted = await trx("subfamilias_clientes")
      .insert({
        id_familia: input.id_familia,
        descripcion: input.descripcion,
        activa: input.activa,
        prioridad: input.prioridad,
      })
      .returning("*");

    const sub = inserted?.[0];
    if (!sub?.id) throw new Error("No se pudo crear la subfamilia");

    const idSub = Number(sub.id);

    // 2) insertar acciones por defecto con IDs fijos
    await trx("subfamilias_clientes_acciones").insert([
      {
        id_subfamilia: idSub,
        id_tipo_accion: ID_TIPO_DESCUENTO,
        id_campo: null,
        orden_dentro_fase: 0,
        es_porcentaje: true,
        valor_accion: 0,
        grupo_exclusion: null,
        activo: true,
      },
      {
        id_subfamilia: idSub,
        id_tipo_accion: ID_TIPO_INCREMENTO,
        id_campo: null,
        orden_dentro_fase: 1,
        es_porcentaje: true,
        valor_accion: 0,
        grupo_exclusion: null,
        activo: true,
      },
    ]);

    // devuelve la subfamilia creada
    return sub;
  });
}
