// src/services/mensajesFormales.service.ts
import { getMasterDb } from "../db/masterDb.js";
import { crearNotificacionUsuario } from "./notificaciones.service.js";

export type Prioridad = "BAJA" | "NORMAL" | "ALTA" | "URGENTE";

export interface MensajeFormal {
  id: number;
  idUsuarioAutor: number;
  autorUsername: string;
  autorNombre: string | null;
  asunto: string;
  contenido: string;
  prioridad: Prioridad;
  createdAt: string;
}

export interface MensajeRecibido extends MensajeFormal {
  leido: boolean;
  fechaLectura: string | null;
  archivado: boolean;
}

export interface MensajeEnviado extends MensajeFormal {
  destinatarios: Array<{
    id: number;
    username: string;
    nombre: string | null;
    leido: boolean;
    fechaLectura: string | null;
  }>;
}

export interface FiltrosMensaje {
  soloNoLeidos?: boolean;
  soloArchivados?: boolean;
  prioridad?: Prioridad;
  busqueda?: string;
}

/**
 * Enviar un mensaje formal a múltiples destinatarios
 */
export async function enviarMensaje(
  idAutor: number,
  destinatarios: number[],
  asunto: string,
  contenido: string,
  prioridad: Prioridad = "NORMAL"
): Promise<MensajeFormal> {
  const db = getMasterDb();

  if (destinatarios.length === 0) {
    throw new Error("Debe especificar al menos un destinatario");
  }

  // Verificar que los destinatarios existen y están activos
  const usuariosValidos = await db("usuarios")
    .whereIn("id", destinatarios)
    .where("activo", true)
    .select("id");

  const idsValidos = usuariosValidos.map((u: { id: number }) => u.id);

  if (idsValidos.length === 0) {
    throw new Error("Ningún destinatario válido encontrado");
  }

  // Crear el mensaje
  const [mensaje] = await db("mensajes_formales")
    .insert({
      id_usuario_autor: idAutor,
      asunto,
      contenido,
      prioridad,
      created_at: new Date(),
    })
    .returning(["id", "id_usuario_autor", "asunto", "contenido", "prioridad", "created_at"]);

  // Agregar destinatarios
  const destinatariosData = idsValidos.map((id: number) => ({
    id_mensaje: mensaje.id,
    id_usuario: id,
    leido: false,
  }));

  await db("mensajes_formales_destinatarios").insert(destinatariosData);

  // Obtener datos del autor
  const autor = await db("usuarios")
    .where("id", idAutor)
    .select("username", "nombre")
    .first();

  // Notificar a los destinatarios
  for (const idDest of idsValidos) {
    await crearNotificacionUsuario(
      idDest,
      "mensaje_nuevo",
      `Nuevo mensaje: ${asunto}`,
      `${autor.username} te ha enviado un mensaje${prioridad === "URGENTE" ? " URGENTE" : prioridad === "ALTA" ? " de alta prioridad" : ""}`,
      { idMensaje: mensaje.id, prioridad }
    );
  }

  return {
    id: mensaje.id,
    idUsuarioAutor: mensaje.id_usuario_autor,
    autorUsername: autor.username,
    autorNombre: autor.nombre,
    asunto: mensaje.asunto,
    contenido: mensaje.contenido,
    prioridad: mensaje.prioridad,
    createdAt: mensaje.created_at,
  };
}

/**
 * Obtener bandeja de entrada de un usuario
 */
export async function getBandejaEntrada(
  idUsuario: number,
  filtros?: FiltrosMensaje,
  limit: number = 50,
  offset: number = 0
): Promise<{ mensajes: MensajeRecibido[]; total: number }> {
  const db = getMasterDb();

  let query = db("mensajes_formales as m")
    .join("mensajes_formales_destinatarios as d", "d.id_mensaje", "m.id")
    .join("usuarios as u", "u.id", "m.id_usuario_autor")
    .where("d.id_usuario", idUsuario)
    .select(
      "m.id",
      "m.id_usuario_autor as idUsuarioAutor",
      "u.username as autorUsername",
      "u.nombre as autorNombre",
      "m.asunto",
      "m.contenido",
      "m.prioridad",
      "m.created_at as createdAt",
      "d.leido",
      "d.fecha_lectura as fechaLectura",
      "d.archivado"
    )
    .orderBy("m.created_at", "desc");

  // Aplicar filtros
  if (filtros) {
    if (filtros.soloNoLeidos) {
      query = query.where("d.leido", false);
    }
    if (filtros.soloArchivados !== undefined) {
      query = query.where("d.archivado", filtros.soloArchivados);
    }
    if (filtros.prioridad) {
      query = query.where("m.prioridad", filtros.prioridad);
    }
    if (filtros.busqueda) {
      query = query.where(function () {
        this.whereILike("m.asunto", `%${filtros.busqueda}%`)
          .orWhereILike("m.contenido", `%${filtros.busqueda}%`);
      });
    }
  } else {
    // Por defecto, no mostrar archivados
    query = query.where("d.archivado", false);
  }

  // Contar total (clearOrder necesario porque PostgreSQL no permite ORDER BY sin GROUP BY en COUNT)
  const countQuery = query.clone().clearSelect().clearOrder().count("* as total").first();
  const totalResult = await countQuery;
  const total = Number((totalResult as { total: number })?.total ?? 0);

  // Obtener mensajes paginados
  const mensajes = await query.limit(limit).offset(offset);

  return { mensajes, total };
}

/**
 * Obtener mensajes enviados por un usuario
 */
export async function getEnviados(
  idUsuario: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ mensajes: MensajeEnviado[]; total: number }> {
  const db = getMasterDb();

  // Obtener mensajes enviados
  const query = db("mensajes_formales as m")
    .join("usuarios as u", "u.id", "m.id_usuario_autor")
    .where("m.id_usuario_autor", idUsuario)
    .select(
      "m.id",
      "m.id_usuario_autor as idUsuarioAutor",
      "u.username as autorUsername",
      "u.nombre as autorNombre",
      "m.asunto",
      "m.contenido",
      "m.prioridad",
      "m.created_at as createdAt"
    )
    .orderBy("m.created_at", "desc");

  // Contar total (clearOrder necesario porque PostgreSQL no permite ORDER BY sin GROUP BY en COUNT)
  const countResult = await query.clone().clearSelect().clearOrder().count("* as total").first();
  const total = Number((countResult as { total: number })?.total ?? 0);

  // Obtener mensajes paginados
  const mensajes = await query.limit(limit).offset(offset);

  // Obtener destinatarios para cada mensaje
  const resultado: MensajeEnviado[] = [];

  for (const msg of mensajes) {
    const destinatarios = await db("mensajes_formales_destinatarios as d")
      .join("usuarios as u", "u.id", "d.id_usuario")
      .where("d.id_mensaje", msg.id)
      .select(
        "u.id",
        "u.username",
        "u.nombre",
        "d.leido",
        "d.fecha_lectura as fechaLectura"
      );

    resultado.push({
      ...msg,
      destinatarios,
    });
  }

  return { mensajes: resultado, total };
}

/**
 * Obtener un mensaje por ID
 */
export async function getMensaje(
  idMensaje: number,
  idUsuario: number
): Promise<MensajeRecibido | null> {
  const db = getMasterDb();

  const mensaje = await db("mensajes_formales as m")
    .join("mensajes_formales_destinatarios as d", "d.id_mensaje", "m.id")
    .join("usuarios as u", "u.id", "m.id_usuario_autor")
    .where("m.id", idMensaje)
    .where("d.id_usuario", idUsuario)
    .select(
      "m.id",
      "m.id_usuario_autor as idUsuarioAutor",
      "u.username as autorUsername",
      "u.nombre as autorNombre",
      "m.asunto",
      "m.contenido",
      "m.prioridad",
      "m.created_at as createdAt",
      "d.leido",
      "d.fecha_lectura as fechaLectura",
      "d.archivado"
    )
    .first();

  return mensaje || null;
}

/**
 * Obtener mensaje enviado por ID (para el autor)
 */
export async function getMensajeEnviado(
  idMensaje: number,
  idUsuario: number
): Promise<MensajeEnviado | null> {
  const db = getMasterDb();

  const mensaje = await db("mensajes_formales as m")
    .join("usuarios as u", "u.id", "m.id_usuario_autor")
    .where("m.id", idMensaje)
    .where("m.id_usuario_autor", idUsuario)
    .select(
      "m.id",
      "m.id_usuario_autor as idUsuarioAutor",
      "u.username as autorUsername",
      "u.nombre as autorNombre",
      "m.asunto",
      "m.contenido",
      "m.prioridad",
      "m.created_at as createdAt"
    )
    .first();

  if (!mensaje) {
    return null;
  }

  // Obtener destinatarios
  const destinatarios = await db("mensajes_formales_destinatarios as d")
    .join("usuarios as u", "u.id", "d.id_usuario")
    .where("d.id_mensaje", idMensaje)
    .select(
      "u.id",
      "u.username",
      "u.nombre",
      "d.leido",
      "d.fecha_lectura as fechaLectura"
    );

  return {
    ...mensaje,
    destinatarios,
  };
}

/**
 * Marcar mensaje como leído
 */
export async function marcarLeido(idMensaje: number, idUsuario: number): Promise<boolean> {
  const db = getMasterDb();

  const updated = await db("mensajes_formales_destinatarios")
    .where("id_mensaje", idMensaje)
    .where("id_usuario", idUsuario)
    .update({
      leido: true,
      fecha_lectura: new Date(),
    });

  // Eliminar notificaciones de mensaje relacionadas
  const tipoMensaje = await db("tipos_notificacion")
    .where("codigo", "mensaje_nuevo")
    .select("id")
    .first();

  if (tipoMensaje) {
    await db("notificaciones")
      .where("id_usuario_destino", idUsuario)
      .where("id_tipo", tipoMensaje.id)
      .whereRaw("datos::jsonb->>'idMensaje' = ?", [String(idMensaje)])
      .delete();
  }

  return updated > 0;
}

/**
 * Archivar mensaje
 */
export async function archivar(
  idMensaje: number,
  idUsuario: number,
  archivado: boolean = true
): Promise<boolean> {
  const db = getMasterDb();

  const updated = await db("mensajes_formales_destinatarios")
    .where("id_mensaje", idMensaje)
    .where("id_usuario", idUsuario)
    .update({ archivado });

  return updated > 0;
}

/**
 * Contar mensajes no leídos
 */
export async function contarNoLeidos(idUsuario: number): Promise<number> {
  const db = getMasterDb();

  const result = await db("mensajes_formales_destinatarios")
    .where("id_usuario", idUsuario)
    .where("leido", false)
    .where("archivado", false)
    .count("* as count")
    .first();

  return Number((result as { count: number })?.count ?? 0);
}

/**
 * Obtener usuarios disponibles como destinatarios
 */
export async function getDestinatariosDisponibles(
  idUsuario: number
): Promise<
  Array<{
    id: number;
    username: string;
    nombre: string | null;
    puesto: string | null;
    departamentos: string[];
    empresas: Array<{ id: number; nombre: string; dbName: string }>;
  }>
> {
  const db = getMasterDb();

  // Obtener todos los usuarios activos excepto el actual
  const usuarios = await db("usuarios")
    .where("activo", true)
    .whereNot("id", idUsuario)
    .select("id", "username", "nombre", "puesto");

  const resultado = [];

  for (const u of usuarios) {
    // Obtener departamentos del usuario
    const departamentos = await db("usuarios_departamentos as ud")
      .join("departamentos as d", "d.id", "ud.id_departamento")
      .where("ud.id_usuario", u.id)
      .where("d.activo", true)
      .select("d.nombre");

    // Obtener empresas (bases de datos) a las que tiene acceso el usuario
    const empresas = await db("usuarios_bases_datos as ubd")
      .join("bases_datos as bd", "bd.id", "ubd.id_base_datos")
      .where("ubd.id_usuario", u.id)
      .where("bd.activa", true)
      .select("bd.id", "bd.nombre", "bd.db_name as dbName");

    resultado.push({
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      puesto: u.puesto,
      departamentos: departamentos.map((d: { nombre: string }) => d.nombre),
      empresas: empresas.map((e: { id: number; nombre: string; dbName: string }) => ({
        id: e.id,
        nombre: e.nombre,
        dbName: e.dbName,
      })),
    });
  }

  return resultado;
}

/**
 * Eliminar mensaje (solo para el destinatario, lo archiva permanentemente)
 */
export async function eliminarMensaje(idMensaje: number, idUsuario: number): Promise<boolean> {
  const db = getMasterDb();

  // Simplemente marcar como archivado (soft delete)
  const updated = await db("mensajes_formales_destinatarios")
    .where("id_mensaje", idMensaje)
    .where("id_usuario", idUsuario)
    .update({ archivado: true });

  return updated > 0;
}
