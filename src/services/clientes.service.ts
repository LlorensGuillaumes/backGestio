// src/services/clientes.service.ts
import db from "../db.js";

export async function listClientesFull(opts: {
  take: number;
  offset: number;
  q: string | null;
  soloActivos: boolean;
}) {
  const { take, offset, q, soloActivos } = opts;

  // OJO: aquí va tu SQL real. Ejemplo conceptual:
  // 1) Lista base de clientes + persona/empresa
  // 2) Teléfonos en una segunda query y los agregas por id (más fácil y rápido que joins multiplicadores)
  // 3) totalCount para paginación

  // TODO: adapta nombres de tablas/campos a tu DB
  const baseQuery = db("Clientes as c")
    .select(
      "c.IdCliente as id",
      "c.TipoCliente as tipoCliente",
      "c.DocumentoFiscal as documentoFiscal",
      "c.NombreComercial as nombreComercial",
      "c.EsClienteFacturaSimplificada as esClienteFacturaSimplificada",
      "c.Direccion as direccion",
      "c.CodigoPostal as codigoPostal",
      "c.Poblacion as poblacion",
      "c.Pais as pais"
    );

  if (soloActivos) baseQuery.where("c.Activo", 1);

  if (q) {
    baseQuery.andWhere((w) => {
      w.whereILike("c.NombreComercial", `%${q}%`)
       .orWhereILike("c.DocumentoFiscal", `%${q}%`);
      // si quieres, añade persona/empresa con joins o subqueries
    });
  }

  const totalRow = await baseQuery.clone().clearSelect().count({ total: "*" }).first();
  const totalCount = Number((totalRow as any)?.total ?? 0);

  const rows = await baseQuery.limit(take).offset(offset);

  // 2) Teléfonos
  const ids = rows.map((r: any) => r.id);
  const tels = ids.length
    ? await db("ClientesTelefonos as t")
        .select(
          "t.IdTelefono as id",
          "t.IdCliente as idCliente",
          "t.Telefono as telefono",
          "t.Extension as extension",
          "t.EsPrincipal as esPrincipal"
        )
        .whereIn("t.IdCliente", ids)
    : [];

  const telsByCliente = new Map<string, any[]>();
  for (const t of tels) {
    const key = String((t as any).idCliente);
    if (!telsByCliente.has(key)) telsByCliente.set(key, []);
    telsByCliente.get(key)!.push({
      id: (t as any).id,
      telefono: (t as any).telefono,
      extension: (t as any).extension,
      esPrincipal: Boolean((t as any).esPrincipal),
    });
  }

  // 3) (Opcional) persona/empresa en otra query y merge, si lo tienes separado

  const finalRows = rows.map((c: any) => ({
    ...c,
    telefonos: telsByCliente.get(String(c.id)) ?? [],
    persona: null,
    empresa: null,
  }));

  return { rows: finalRows, totalCount };
}

export async function getClienteFacturas(idCliente: string) {
  // devuelve [{id, fecha, estado, total}]
  return [];
}
export async function getClienteRevisiones(idCliente: string) {
  return [];
}
export async function getClienteDocumentos(idCliente: string) {
  return [];
}
