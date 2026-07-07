// src/controllers/controllersPersonalizados/autonomosProveedor.controllers.ts
// Sincroniza los trabajadores autónomos (master) como proveedores de la empresa (tenant).
// Un autónomo factura sus servicios a la escuela, así que es un proveedor.
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";
import { getMasterDb } from "../../db/masterDb.js";

export async function sincronizarAutonomos(_req: Request, res: Response, next: NextFunction) {
  try {
    const autonomos = await getMasterDb()("usuarios")
      .where("tipo_relacion", "AUTONOMO")
      .andWhere("activo", true)
      .select("id", "nombre", "dni", "iban", "titular_cuenta", "email");

    let creados = 0;
    let actualizados = 0;
    for (const a of autonomos as any[]) {
      const existe = await db("Proveedores").where("IdUsuario", a.id).first();
      if (existe) {
        await db("Proveedores")
          .where("IdProveedor", existe.IdProveedor)
          .update({ Nombre: a.nombre, NIF: a.dni ?? null, Iban: a.iban ?? null, Email: a.email ?? null, Activo: 1 });
        actualizados++;
      } else {
        await db("Proveedores").insert({
          Nombre: a.nombre,
          NombreComercial: a.nombre,
          NIF: a.dni ?? null,
          Iban: a.iban ?? null,
          Email: a.email ?? null,
          IdUsuario: a.id,
          Activo: 1,
        });
        creados++;
      }
    }
    res.json({ creados, actualizados, total: autonomos.length });
  } catch (e) {
    next(e);
  }
}
