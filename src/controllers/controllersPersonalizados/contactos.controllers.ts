// src/controllers/controllersPersonalizados/contactos.controllers.ts
// Contactos reutilizables y su vínculo como responsables de alumnos (clientes).
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { ocultarBancarios, puedeVerBancarios } from "../../auth/datosBancarios.js";

const CONTACTO_COLS = [
  "IdContacto as id",
  "Nombre",
  "Apellido1",
  "Apellido2",
  "Dni",
  "Telefono",
  "Email",
  "Direccion",
  "CodigoPostal",
  "Poblacion",
  "Provincia",
  "Iban",
  "TitularCuenta",
  "Bic",
  "Observaciones",
  "Activo",
];

// =========================================================
// CONTACTOS
// =========================================================
export async function getContactos(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.q as string)?.trim().toLowerCase() || "";
    const soloActivos = String(req.query.soloActivos ?? "1") === "1";
    let query = db("Contactos").select(CONTACTO_COLS).orderBy("Nombre", "asc");
    if (soloActivos) query = query.where("Activo", 1);
    if (q) {
      query = query.where(function () {
        this.whereRaw('LOWER("Nombre") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER("Apellido1") LIKE ?', [`%${q}%`])
          .orWhereRaw('LOWER("Dni") LIKE ?', [`%${q}%`]);
      });
    }
    const rows = await query;
    await ocultarBancarios(req, rows, "clientes.datos_bancarios");
    res.json({ data: rows, totalCount: rows.length });
  } catch (e) {
    next(e);
  }
}

export async function getContacto(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await db("Contactos").select(CONTACTO_COLS).where("IdContacto", Number(req.params.id)).first();
    if (!row) return res.status(404).json({ error: "Contacto no encontrado" });
    await ocultarBancarios(req, row, "clientes.datos_bancarios");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

function contactoPayload(b: any) {
  return {
    Nombre: String(b.nombre ?? "").trim(),
    Apellido1: b.apellido1 ?? null,
    Apellido2: b.apellido2 ?? null,
    Dni: b.dni ?? null,
    Telefono: b.telefono ?? null,
    Email: b.email ?? null,
    Direccion: b.direccion ?? null,
    CodigoPostal: b.codigoPostal ?? null,
    Poblacion: b.poblacion ?? null,
    Provincia: b.provincia ?? null,
    Iban: b.iban ?? null,
    TitularCuenta: b.titularCuenta ?? null,
    Bic: b.bic ?? null,
    Observaciones: b.observaciones ?? null,
  };
}

export async function createContacto(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body?.nombre?.trim()) return res.status(400).json({ error: "El nombre es obligatorio" });
    const [row] = await db("Contactos").insert(contactoPayload(req.body)).returning("IdContacto");
    res.status(201).json({ id: typeof row === "object" ? row.IdContacto : row });
  } catch (e) {
    next(e);
  }
}

export async function updateContacto(req: Request, res: Response, next: NextFunction) {
  try {
    const patch: any = contactoPayload(req.body);
    if (req.body.activo !== undefined) patch.Activo = req.body.activo ? 1 : 0;
    await db("Contactos").where("IdContacto", Number(req.params.id)).update(patch);
    res.json({ success: true, id: Number(req.params.id) });
  } catch (e) {
    next(e);
  }
}

export async function deleteContacto(req: Request, res: Response, next: NextFunction) {
  try {
    await db("Contactos").where("IdContacto", Number(req.params.id)).update({ Activo: 0 });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// =========================================================
// RESPONSABLES DE UN ALUMNO (N:M con Contactos)
// =========================================================
export async function getResponsablesAlumno(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.params.id);
    const rows = await db("AlumnoResponsables as ar")
      .join("Contactos as co", "ar.IdContacto", "co.IdContacto")
      .select(
        "ar.IdAlumnoResponsable as id",
        "ar.IdContacto",
        "ar.Parentesco",
        "ar.EsPagador",
        "ar.EsPrincipal",
        "co.Nombre",
        "co.Apellido1",
        "co.Apellido2",
        "co.Telefono",
        "co.Email",
        "co.Iban",
        "co.TitularCuenta"
      )
      .where("ar.IdCliente", idCliente)
      .andWhere("ar.Activo", 1)
      .orderBy("ar.EsPrincipal", "desc")
      .orderBy("co.Nombre", "asc");
    await ocultarBancarios(req, rows, "clientes.datos_bancarios");
    res.json({ data: rows, totalCount: rows.length });
  } catch (e) {
    next(e);
  }
}

export async function addResponsable(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.params.id);
    const idContacto = Number(req.body?.idContacto);
    if (!idContacto) return res.status(400).json({ error: "Falta el contacto" });
    const esPagador = !!req.body?.esPagador;
    const esPrincipal = !!req.body?.esPrincipal;

    const dup = await db("AlumnoResponsables")
      .where({ IdCliente: idCliente, IdContacto: idContacto, Activo: 1 })
      .first();
    if (dup) return res.status(409).json({ error: "Ese contacto ya es responsable de este alumno" });

    // Solo un pagador / principal por alumno
    if (esPagador) await db("AlumnoResponsables").where("IdCliente", idCliente).update({ EsPagador: false });
    if (esPrincipal) await db("AlumnoResponsables").where("IdCliente", idCliente).update({ EsPrincipal: false });

    const [row] = await db("AlumnoResponsables")
      .insert({
        IdCliente: idCliente,
        IdContacto: idContacto,
        Parentesco: req.body?.parentesco ?? null,
        EsPagador: esPagador,
        EsPrincipal: esPrincipal,
      })
      .returning("IdAlumnoResponsable");
    res.status(201).json({ id: typeof row === "object" ? row.IdAlumnoResponsable : row });
  } catch (e) {
    next(e);
  }
}

export async function updateResponsable(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.relId);
    const rel = await db("AlumnoResponsables").where("IdAlumnoResponsable", id).first();
    if (!rel) return res.status(404).json({ error: "Responsable no encontrado" });

    const patch: any = {};
    if (req.body.parentesco !== undefined) patch.Parentesco = req.body.parentesco;
    if (req.body.esPagador !== undefined) {
      patch.EsPagador = !!req.body.esPagador;
      if (patch.EsPagador) await db("AlumnoResponsables").where("IdCliente", rel.IdCliente).update({ EsPagador: false });
    }
    if (req.body.esPrincipal !== undefined) {
      patch.EsPrincipal = !!req.body.esPrincipal;
      if (patch.EsPrincipal) await db("AlumnoResponsables").where("IdCliente", rel.IdCliente).update({ EsPrincipal: false });
    }
    await db("AlumnoResponsables").where("IdAlumnoResponsable", id).update(patch);
    res.json({ success: true, id });
  } catch (e) {
    next(e);
  }
}

export async function removeResponsable(req: Request, res: Response, next: NextFunction) {
  try {
    await db("AlumnoResponsables").where("IdAlumnoResponsable", Number(req.params.relId)).update({ Activo: 0 });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
}

// Resuelve el pagador efectivo del alumno (para SEPA): mayor→su IBAN; menor→responsable pagador
export async function getPagadorAlumno(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.params.id);
    const alumno = await db("clientes as c")
      .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
      .select("c.id", "c.iban", "c.titular_cuenta", "cp.fecha_nacimiento")
      .where("c.id", idCliente)
      .first();
    if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });

    // Sin permiso de datos bancarios no se revela ningún IBAN de pago
    if (!(await puedeVerBancarios(req, "clientes.datos_bancarios"))) {
      res.json({ origen: null, iban: null, titular: null, edad: null, aviso: "Sin permiso para ver datos bancarios" });
      return;
    }

    const edad = alumno.fecha_nacimiento
      ? Math.floor((Date.now() - new Date(alumno.fecha_nacimiento).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;
    const esMayor = edad === null || edad >= 18;

    if (esMayor && alumno.iban) {
      res.json({ origen: "ALUMNO", iban: alumno.iban, titular: alumno.titular_cuenta, edad });
      return;
    }
    const pagador = await db("AlumnoResponsables as ar")
      .join("Contactos as co", "ar.IdContacto", "co.IdContacto")
      .select("co.Iban", "co.TitularCuenta", "co.Nombre", "co.Apellido1")
      .where("ar.IdCliente", idCliente)
      .andWhere("ar.Activo", 1)
      .andWhere("ar.EsPagador", true)
      .first();
    if (pagador?.Iban) {
      res.json({ origen: "RESPONSABLE", iban: pagador.Iban, titular: pagador.TitularCuenta, edad });
      return;
    }
    res.json({ origen: null, iban: null, titular: null, edad, aviso: "Sin IBAN de pago configurado" });
  } catch (e) {
    next(e);
  }
}
