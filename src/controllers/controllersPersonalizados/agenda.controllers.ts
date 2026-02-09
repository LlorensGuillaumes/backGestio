// src/controllers/controllersPersonalizados/agenda.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

// Helper para obtener IdUsuario para auditoría (null para master)
function getUserId(req: Request): number | null {
  const userId = req.user?.userId;
  return typeof userId === "number" ? userId : null;
}

/**
 * GET /agenda/citas
 * Lista citas en un rango de fechas (para el calendario)
 */
export async function getCitas(req: Request, res: Response, next: NextFunction) {
  try {
    const { inicio, fin, idProfesional, estado } = req.query;

    if (!inicio || !fin) {
      return res.status(400).json({ error: "Se requieren parámetros inicio y fin" });
    }

    let query = db("Citas as c")
      .leftJoin("clientes as cl", "c.IdCliente", "cl.id")
      .leftJoin("cliente_persona as cp", "cl.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "cl.id", "ce.id_cliente")
      .leftJoin("clientes_telefonos as ct", function () {
        this.on("cl.id", "=", "ct.id_cliente").andOn("ct.es_principal", "=", db.raw("?", [1]));
      })
      .select(
        "c.*",
        "cl.id as clienteId",
        "ct.telefono as clienteTelefono",
        "ce.email_contacto as clienteEmail",
        db.raw(`
          CASE
            WHEN cl.tipo_cliente = 'P' THEN
              COALESCE(
                NULLIF(
                  trim(
                    COALESCE(cp.nombre,'') || ' ' ||
                    COALESCE(cp.primer_apellido,'') || ' ' ||
                    COALESCE(cp.segundo_apellido,'')
                  ),
                  ''
                ),
                c."NombreContacto"
              )
            WHEN cl.tipo_cliente = 'E' THEN
              COALESCE(ce.razon_social, c."NombreContacto")
            ELSE
              c."NombreContacto"
          END AS "NombreCompleto"
        `)
      )
      .where("c.Activo", 1)
      .where("c.FechaHoraInicio", ">=", inicio)
      .where("c.FechaHoraInicio", "<=", fin)
      .orderBy("c.FechaHoraInicio", "asc");

    if (idProfesional) {
      query = query.where("c.IdProfesional", Number(idProfesional));
    }

    if (estado) {
      query = query.where("c.Estado", estado);
    }

    const rows = await query;

    res.json({ rows, totalCount: rows.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /agenda/citas/:id
 * Obtiene una cita específica con todos sus datos
 */
export async function getCita(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de cita inválido" });
    }

    const cita = await db("Citas as c")
      .leftJoin("clientes as cl", "c.IdCliente", "cl.id")
      .leftJoin("cliente_persona as cp", "cl.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "cl.id", "ce.id_cliente")
      .leftJoin("clientes_telefonos as ct", function () {
        this.on("cl.id", "=", "ct.id_cliente").andOn("ct.es_principal", "=", db.raw("?", [1]));
      })
      .select(
        "c.*",
        "cl.id as clienteId",
        "ct.telefono as clienteTelefono",
        "ce.email_contacto as clienteEmail",
        db.raw(`
          CASE
            WHEN cl.tipo_cliente = 'P' THEN
              COALESCE(
                NULLIF(
                  trim(
                    COALESCE(cp.nombre,'') || ' ' ||
                    COALESCE(cp.primer_apellido,'') || ' ' ||
                    COALESCE(cp.segundo_apellido,'')
                  ),
                  ''
                ),
                c."NombreContacto"
              )
            WHEN cl.tipo_cliente = 'E' THEN
              COALESCE(ce.razon_social, c."NombreContacto")
            ELSE
              c."NombreContacto"
          END AS "NombreCliente"
        `)
      )
      .where("c.IdCita", id)
      .first();

    if (!cita) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.json(cita);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /agenda/citas
 * Crea una nueva cita
 */
export async function postCita(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      IdCliente,
      NombreContacto,
      TelefonoContacto,
      EmailContacto,
      FechaHoraInicio,
      FechaHoraFin,
      TodoElDia,
      MotivoVisita,
      TipoCita,
      Observaciones,
      Estado,
      IdProfesional,
      Color,
      Recordatorio,
      MinutosRecordatorio,
    } = req.body;

    if (!FechaHoraInicio || !FechaHoraFin) {
      return res.status(400).json({ error: "FechaHoraInicio y FechaHoraFin son obligatorios" });
    }

    // Si no hay cliente registrado, debe haber al menos un nombre de contacto
    if (!IdCliente && !NombreContacto?.trim()) {
      return res.status(400).json({ error: "Debe indicar un cliente o un nombre de contacto" });
    }

    const idUsuario = getUserId(req);
    const [created] = await db("Citas")
      .insert({
        IdCliente: IdCliente || null,
        NombreContacto: NombreContacto?.trim() || null,
        TelefonoContacto: TelefonoContacto?.trim() || null,
        EmailContacto: EmailContacto?.trim() || null,
        FechaHoraInicio,
        FechaHoraFin,
        TodoElDia: Boolean(TodoElDia),
        MotivoVisita: MotivoVisita?.trim() || null,
        TipoCita: TipoCita || "GENERAL",
        Observaciones: Observaciones?.trim() || null,
        Estado: Estado || "PROGRAMADA",
        IdProfesional: IdProfesional || null,
        Color: Color || "#3b82f6",
        Recordatorio: Boolean(Recordatorio),
        MinutosRecordatorio: MinutosRecordatorio || 60,
        Activo: 1,
        FechaCreacion: new Date(),
        IdUsuario: idUsuario,
      })
      .returning("*");

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /agenda/citas/:id
 * Actualiza una cita
 */
export async function putCita(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de cita inválido" });
    }

    const {
      IdCliente,
      NombreContacto,
      TelefonoContacto,
      EmailContacto,
      FechaHoraInicio,
      FechaHoraFin,
      TodoElDia,
      MotivoVisita,
      TipoCita,
      Observaciones,
      Estado,
      IdProfesional,
      Color,
      Recordatorio,
      MinutosRecordatorio,
      Activo,
    } = req.body;

    const updateData: Record<string, any> = {
      FechaModificacion: new Date(),
    };

    if (IdCliente !== undefined) updateData.IdCliente = IdCliente || null;
    if (NombreContacto !== undefined) updateData.NombreContacto = NombreContacto?.trim() || null;
    if (TelefonoContacto !== undefined) updateData.TelefonoContacto = TelefonoContacto?.trim() || null;
    if (EmailContacto !== undefined) updateData.EmailContacto = EmailContacto?.trim() || null;
    if (FechaHoraInicio !== undefined) updateData.FechaHoraInicio = FechaHoraInicio;
    if (FechaHoraFin !== undefined) updateData.FechaHoraFin = FechaHoraFin;
    if (TodoElDia !== undefined) updateData.TodoElDia = Boolean(TodoElDia);
    if (MotivoVisita !== undefined) updateData.MotivoVisita = MotivoVisita?.trim() || null;
    if (TipoCita !== undefined) updateData.TipoCita = TipoCita;
    if (Observaciones !== undefined) updateData.Observaciones = Observaciones?.trim() || null;
    if (Estado !== undefined) updateData.Estado = Estado;
    if (IdProfesional !== undefined) updateData.IdProfesional = IdProfesional || null;
    if (Color !== undefined) updateData.Color = Color;
    if (Recordatorio !== undefined) updateData.Recordatorio = Boolean(Recordatorio);
    if (MinutosRecordatorio !== undefined) updateData.MinutosRecordatorio = MinutosRecordatorio;
    if (Activo !== undefined) updateData.Activo = Activo;

    const [updated] = await db("Citas")
      .where("IdCita", id)
      .update(updateData)
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /agenda/citas/:id
 * Cancela/desactiva una cita (soft delete)
 */
export async function deleteCita(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de cita inválido" });
    }

    const [updated] = await db("Citas")
      .where("IdCita", id)
      .update({
        Activo: 0,
        Estado: "CANCELADA",
        FechaModificacion: new Date(),
      })
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.json({ message: "Cita cancelada", cita: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /agenda/citas/:id/estado
 * Cambia el estado de una cita
 */
export async function cambiarEstadoCita(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const { estado } = req.body;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de cita inválido" });
    }

    const estadosValidos = ["PROGRAMADA", "CONFIRMADA", "COMPLETADA", "CANCELADA", "NO_ASISTIO"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: `Estado debe ser uno de: ${estadosValidos.join(", ")}` });
    }

    const [updated] = await db("Citas")
      .where("IdCita", id)
      .update({
        Estado: estado,
        FechaModificacion: new Date(),
      })
      .returning("*");

    if (!updated) {
      return res.status(404).json({ error: "Cita no encontrada" });
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /agenda/citas-dia/:fecha
 * Obtiene las citas de un día específico
 */
export async function getCitasDia(req: Request, res: Response, next: NextFunction) {
  try {
    const { fecha } = req.params;
    const { idProfesional } = req.query;

    if (!fecha) {
      return res.status(400).json({ error: "Se requiere la fecha" });
    }

    const inicioDelDia = `${fecha}T00:00:00`;
    const finDelDia = `${fecha}T23:59:59`;

    let query = db("Citas as c")
      .leftJoin("clientes as cl", "c.IdCliente", "cl.id")
      .leftJoin("cliente_persona as cp", "cl.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "cl.id", "ce.id_cliente")
      .select(
        "c.*",
        db.raw(`
          CASE
            WHEN cl.tipo_cliente = 'P' THEN
              COALESCE(
                NULLIF(
                  trim(
                    COALESCE(cp.nombre,'') || ' ' ||
                    COALESCE(cp.primer_apellido,'') || ' ' ||
                    COALESCE(cp.segundo_apellido,'')
                  ),
                  ''
                ),
                c."NombreContacto"
              )
            WHEN cl.tipo_cliente = 'E' THEN
              COALESCE(ce.razon_social, c."NombreContacto")
            ELSE
              c."NombreContacto"
          END AS "NombreCompleto"
        `)
      )
      .where("c.Activo", 1)
      .where("c.FechaHoraInicio", ">=", inicioDelDia)
      .where("c.FechaHoraInicio", "<=", finDelDia)
      .orderBy("c.FechaHoraInicio", "asc");

    if (idProfesional) {
      query = query.where("c.IdProfesional", Number(idProfesional));
    }

    const rows = await query;

    res.json({ rows, fecha });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /agenda/buscar-clientes
 * Busca clientes para autocompletado
 */
export async function buscarClientes(req: Request, res: Response, next: NextFunction) {
  try {
    const { q } = req.query;

    if (!q || String(q).length < 2) {
      return res.json({ rows: [] });
    }

    const termino = `%${String(q).toLowerCase()}%`;

    const rows = await db("clientes as cl")
      .leftJoin("cliente_persona as cp", "cl.id", "cp.id_cliente")
      .leftJoin("cliente_empresa as ce", "cl.id", "ce.id_cliente")
      .leftJoin("clientes_telefonos as ct", function () {
        this.on("cl.id", "=", "ct.id_cliente").andOn("ct.es_principal", "=", db.raw("?", [1]));
      })
      .select(
        "cl.id",
        db.raw(`
          CASE
            WHEN cl.tipo_cliente = 'P' THEN
              COALESCE(
                NULLIF(
                  trim(
                    COALESCE(cp.nombre,'') || ' ' ||
                    COALESCE(cp.primer_apellido,'') || ' ' ||
                    COALESCE(cp.segundo_apellido,'')
                  ),
                  ''
                ),
                'Sin nombre'
              )
            ELSE
              COALESCE(ce.razon_social, 'Sin nombre')
          END AS nombre
        `),
        "ct.telefono as telefono",
        "ce.email_contacto as email"
      )
      .where("cl.activo", 1)
      .andWhere(function () {
        this.whereRaw(`LOWER(COALESCE(cp.nombre, '')) LIKE ?`, [termino])
          .orWhereRaw(`LOWER(COALESCE(cp.primer_apellido, '')) LIKE ?`, [termino])
          .orWhereRaw(`LOWER(COALESCE(cp.segundo_apellido, '')) LIKE ?`, [termino])
          .orWhereRaw(`LOWER(COALESCE(ce.razon_social, '')) LIKE ?`, [termino])
          .orWhereRaw(`LOWER(COALESCE(ct.telefono, '')) LIKE ?`, [termino])
          .orWhereRaw(`LOWER(COALESCE(ce.email_contacto, '')) LIKE ?`, [termino]);
      })
      .limit(15);

    res.json({ rows });
  } catch (err) {
    next(err);
  }
}
