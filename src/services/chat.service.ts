// src/services/chat.service.ts
import { getMasterDb } from "../db/masterDb.js";
import { crearNotificacionUsuario } from "./notificaciones.service.js";

export interface Conversacion {
  id: number;
  tipo: "DIRECTA" | "GRUPO";
  nombre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversacionResumen {
  id: number;
  tipo: "DIRECTA" | "GRUPO";
  nombre: string | null;
  ultimoMensaje: string | null;
  ultimoMensajeFecha: string | null;
  ultimoMensajeAutor: string | null;
  mensajesNoLeidos: number;
  participantes: Array<{
    id: number;
    username: string;
    nombre: string | null;
  }>;
}

export interface Mensaje {
  id: number;
  idConversacion: number;
  idUsuarioAutor: number;
  autorUsername: string;
  autorNombre: string | null;
  contenido: string;
  tipo: "TEXTO" | "ARCHIVO" | "IMAGEN";
  archivoUrl: string | null;
  editado: boolean;
  eliminado: boolean;
  createdAt: string;
}

export interface Participante {
  id: number;
  username: string;
  nombre: string | null;
  ultimoMensajeLeido: number | null;
  silenciada: boolean;
  fechaUnion: string;
}

/**
 * Obtener o crear una conversación directa entre dos usuarios
 */
export async function getConversacionDirecta(
  idUsuario1: number,
  idUsuario2: number
): Promise<Conversacion> {
  const db = getMasterDb();

  // Buscar conversación directa existente entre los dos usuarios
  const existente = await db("conversaciones as c")
    .join("conversacion_participantes as cp1", function () {
      this.on("cp1.id_conversacion", "c.id").andOn("cp1.id_usuario", db.raw("?", [idUsuario1]));
    })
    .join("conversacion_participantes as cp2", function () {
      this.on("cp2.id_conversacion", "c.id").andOn("cp2.id_usuario", db.raw("?", [idUsuario2]));
    })
    .where("c.tipo", "DIRECTA")
    .select("c.id", "c.tipo", "c.nombre", "c.created_at as createdAt", "c.updated_at as updatedAt")
    .first();

  if (existente) {
    return existente;
  }

  // Crear nueva conversación directa
  const [conversacion] = await db("conversaciones")
    .insert({
      tipo: "DIRECTA",
      nombre: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(["id", "tipo", "nombre", "created_at as createdAt", "updated_at as updatedAt"]);

  // Agregar participantes
  await db("conversacion_participantes").insert([
    {
      id_conversacion: conversacion.id,
      id_usuario: idUsuario1,
      fecha_union: new Date(),
    },
    {
      id_conversacion: conversacion.id,
      id_usuario: idUsuario2,
      fecha_union: new Date(),
    },
  ]);

  return conversacion;
}

/**
 * Crear una conversación de grupo
 */
export async function crearGrupo(
  idCreador: number,
  nombre: string,
  participantes: number[]
): Promise<Conversacion> {
  const db = getMasterDb();

  if (!nombre || nombre.trim().length === 0) {
    throw new Error("El nombre del grupo es requerido");
  }

  if (participantes.length < 1) {
    throw new Error("Debe haber al menos un participante además del creador");
  }

  // Verificar que los participantes existen y están activos
  const usuariosValidos = await db("usuarios")
    .whereIn("id", participantes)
    .where("activo", true)
    .select("id");

  const idsValidos = usuariosValidos.map((u: { id: number }) => u.id);

  if (idsValidos.length === 0) {
    throw new Error("Ningún participante válido encontrado");
  }

  // Asegurar que el creador esté en la lista
  const todosParticipantes = [...new Set([idCreador, ...idsValidos])];

  // Crear la conversación de grupo
  const [conversacion] = await db("conversaciones")
    .insert({
      tipo: "GRUPO",
      nombre: nombre.trim(),
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning(["id", "tipo", "nombre", "created_at as createdAt", "updated_at as updatedAt"]);

  // Agregar participantes
  const participantesData = todosParticipantes.map((idUsuario) => ({
    id_conversacion: conversacion.id,
    id_usuario: idUsuario,
    fecha_union: new Date(),
  }));

  await db("conversacion_participantes").insert(participantesData);

  // Notificar a los participantes (excepto al creador)
  const creador = await db("usuarios").where("id", idCreador).select("nombre", "username").first();
  for (const idParticipante of idsValidos) {
    if (idParticipante !== idCreador) {
      await crearNotificacionUsuario(
        idParticipante,
        "chat_nuevo",
        `Nuevo grupo: ${nombre}`,
        `${creador.nombre || creador.username} te ha añadido al grupo "${nombre}"`,
        { idConversacion: conversacion.id, tipo: "GRUPO" }
      );
    }
  }

  return conversacion;
}

/**
 * Añadir participante a un grupo
 */
export async function addParticipanteGrupo(
  idConversacion: number,
  idUsuarioAdmin: number,
  idNuevoUsuario: number
): Promise<void> {
  const db = getMasterDb();

  // Verificar que es un grupo
  const conversacion = await db("conversaciones")
    .where("id", idConversacion)
    .where("tipo", "GRUPO")
    .first();

  if (!conversacion) {
    throw new Error("Grupo no encontrado");
  }

  // Verificar que el admin es participante
  const esParticipante = await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuarioAdmin)
    .first();

  if (!esParticipante) {
    throw new Error("No tienes acceso a este grupo");
  }

  // Verificar que el nuevo usuario existe y está activo
  const nuevoUsuario = await db("usuarios")
    .where("id", idNuevoUsuario)
    .where("activo", true)
    .first();

  if (!nuevoUsuario) {
    throw new Error("Usuario no encontrado");
  }

  // Verificar que no está ya en el grupo
  const yaParticipante = await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idNuevoUsuario)
    .first();

  if (yaParticipante) {
    throw new Error("El usuario ya es participante del grupo");
  }

  // Añadir al grupo
  await db("conversacion_participantes").insert({
    id_conversacion: idConversacion,
    id_usuario: idNuevoUsuario,
    fecha_union: new Date(),
  });

  // Notificar
  await crearNotificacionUsuario(
    idNuevoUsuario,
    "chat_nuevo",
    `Añadido al grupo: ${conversacion.nombre}`,
    `Te han añadido al grupo "${conversacion.nombre}"`,
    { idConversacion, tipo: "GRUPO" }
  );
}

/**
 * Salir de un grupo
 */
export async function salirDeGrupo(
  idConversacion: number,
  idUsuario: number
): Promise<void> {
  const db = getMasterDb();

  // Verificar que es un grupo
  const conversacion = await db("conversaciones")
    .where("id", idConversacion)
    .where("tipo", "GRUPO")
    .first();

  if (!conversacion) {
    throw new Error("Grupo no encontrado");
  }

  // Eliminar participación
  await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuario)
    .del();
}

/**
 * Renombrar un grupo
 */
export async function renombrarGrupo(
  idConversacion: number,
  idUsuario: number,
  nuevoNombre: string
): Promise<void> {
  const db = getMasterDb();

  if (!nuevoNombre || nuevoNombre.trim().length === 0) {
    throw new Error("El nombre es requerido");
  }

  // Verificar que es un grupo
  const conversacion = await db("conversaciones")
    .where("id", idConversacion)
    .where("tipo", "GRUPO")
    .first();

  if (!conversacion) {
    throw new Error("Grupo no encontrado");
  }

  // Verificar que el usuario es participante
  const esParticipante = await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuario)
    .first();

  if (!esParticipante) {
    throw new Error("No tienes acceso a este grupo");
  }

  await db("conversaciones")
    .where("id", idConversacion)
    .update({ nombre: nuevoNombre.trim() });
}

/**
 * Enviar un mensaje en una conversación
 */
export async function enviarMensaje(
  idConversacion: number,
  idUsuario: number,
  contenido: string,
  tipo: "TEXTO" | "ARCHIVO" | "IMAGEN" = "TEXTO",
  archivoUrl?: string
): Promise<Mensaje> {
  const db = getMasterDb();

  // Verificar que el usuario es participante de la conversación
  const participante = await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuario)
    .first();

  if (!participante) {
    throw new Error("No tienes acceso a esta conversación");
  }

  // Crear el mensaje
  const [mensaje] = await db("mensajes_chat")
    .insert({
      id_conversacion: idConversacion,
      id_usuario_autor: idUsuario,
      contenido,
      tipo,
      archivo_url: archivoUrl || null,
      created_at: new Date(),
    })
    .returning(["id", "id_conversacion", "id_usuario_autor", "contenido", "tipo", "archivo_url", "editado", "eliminado", "created_at"]);

  // Actualizar timestamp de la conversación
  await db("conversaciones").where("id", idConversacion).update({ updated_at: new Date() });

  // Obtener datos del autor
  const autor = await db("usuarios")
    .where("id", idUsuario)
    .select("username", "nombre")
    .first();

  // Notificar a los otros participantes
  const otrosParticipantes = await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .whereNot("id_usuario", idUsuario)
    .where("silenciada", false)
    .select("id_usuario");

  for (const p of otrosParticipantes) {
    await crearNotificacionUsuario(
      p.id_usuario,
      "chat_nuevo",
      `Nuevo mensaje de ${autor.username}`,
      contenido.substring(0, 100) + (contenido.length > 100 ? "..." : ""),
      { idConversacion, idMensaje: mensaje.id }
    );
  }

  return {
    id: mensaje.id,
    idConversacion: mensaje.id_conversacion,
    idUsuarioAutor: mensaje.id_usuario_autor,
    autorUsername: autor.username,
    autorNombre: autor.nombre,
    contenido: mensaje.contenido,
    tipo: mensaje.tipo,
    archivoUrl: mensaje.archivo_url,
    editado: mensaje.editado,
    eliminado: mensaje.eliminado,
    createdAt: mensaje.created_at,
  };
}

/**
 * Obtener mensajes de una conversación con paginación
 */
export async function getMensajes(
  idConversacion: number,
  idUsuario: number,
  limit: number = 50,
  before?: number
): Promise<Mensaje[]> {
  const db = getMasterDb();

  // Verificar acceso
  const participante = await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuario)
    .first();

  if (!participante) {
    throw new Error("No tienes acceso a esta conversación");
  }

  let query = db("mensajes_chat as m")
    .join("usuarios as u", "u.id", "m.id_usuario_autor")
    .select(
      "m.id",
      "m.id_conversacion as idConversacion",
      "m.id_usuario_autor as idUsuarioAutor",
      "u.username as autorUsername",
      "u.nombre as autorNombre",
      "m.contenido",
      "m.tipo",
      "m.archivo_url as archivoUrl",
      "m.editado",
      "m.eliminado",
      "m.created_at as createdAt"
    )
    .where("m.id_conversacion", idConversacion)
    .orderBy("m.created_at", "desc")
    .limit(limit);

  if (before) {
    query = query.where("m.id", "<", before);
  }

  const mensajes = await query;

  // Devolver en orden cronológico (más antiguo primero)
  return mensajes.reverse();
}

/**
 * Marcar mensajes como leídos hasta el más reciente
 */
export async function marcarLeidos(idConversacion: number, idUsuario: number): Promise<void> {
  const db = getMasterDb();

  // Obtener el ID del último mensaje
  const ultimoMensaje = await db("mensajes_chat")
    .where("id_conversacion", idConversacion)
    .orderBy("id", "desc")
    .select("id")
    .first();

  if (!ultimoMensaje) {
    return;
  }

  await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuario)
    .update({ ultimo_mensaje_leido: ultimoMensaje.id });

  // Eliminar notificaciones de chat relacionadas con esta conversación
  const tipoChat = await db("tipos_notificacion")
    .where("codigo", "chat_nuevo")
    .select("id")
    .first();

  if (tipoChat) {
    await db("notificaciones")
      .where("id_usuario_destino", idUsuario)
      .where("id_tipo", tipoChat.id)
      .whereRaw("datos::jsonb->>'idConversacion' = ?", [String(idConversacion)])
      .delete();
  }
}

/**
 * Obtener lista de conversaciones de un usuario
 */
export async function getConversaciones(idUsuario: number): Promise<ConversacionResumen[]> {
  const db = getMasterDb();

  // Obtener conversaciones donde el usuario participa
  const conversaciones = await db("conversaciones as c")
    .join("conversacion_participantes as cp", "cp.id_conversacion", "c.id")
    .where("cp.id_usuario", idUsuario)
    .select(
      "c.id",
      "c.tipo",
      "c.nombre",
      "c.updated_at as updatedAt",
      "cp.ultimo_mensaje_leido as ultimoMensajeLeido"
    )
    .orderBy("c.updated_at", "desc");

  const resultado: ConversacionResumen[] = [];

  for (const conv of conversaciones) {
    // Obtener participantes
    const participantes = await db("conversacion_participantes as cp")
      .join("usuarios as u", "u.id", "cp.id_usuario")
      .where("cp.id_conversacion", conv.id)
      .whereNot("cp.id_usuario", idUsuario)
      .select("u.id", "u.username", "u.nombre");

    // Obtener último mensaje
    const ultimoMensaje = await db("mensajes_chat as m")
      .join("usuarios as u", "u.id", "m.id_usuario_autor")
      .where("m.id_conversacion", conv.id)
      .orderBy("m.created_at", "desc")
      .select("m.contenido", "m.created_at as fecha", "u.username as autor")
      .first();

    // Contar mensajes no leídos
    let noLeidos = 0;
    if (conv.ultimoMensajeLeido) {
      const countResult = await db("mensajes_chat")
        .where("id_conversacion", conv.id)
        .where("id", ">", conv.ultimoMensajeLeido)
        .whereNot("id_usuario_autor", idUsuario)
        .count("* as count")
        .first();
      noLeidos = Number((countResult as { count: number })?.count ?? 0);
    } else {
      // Si nunca ha leído, contar todos los mensajes de otros
      const countResult = await db("mensajes_chat")
        .where("id_conversacion", conv.id)
        .whereNot("id_usuario_autor", idUsuario)
        .count("* as count")
        .first();
      noLeidos = Number((countResult as { count: number })?.count ?? 0);
    }

    resultado.push({
      id: conv.id,
      tipo: conv.tipo,
      nombre: conv.nombre,
      ultimoMensaje: ultimoMensaje?.contenido || null,
      ultimoMensajeFecha: ultimoMensaje?.fecha || null,
      ultimoMensajeAutor: ultimoMensaje?.autor || null,
      mensajesNoLeidos: noLeidos,
      participantes,
    });
  }

  return resultado;
}

/**
 * Obtener una conversación por ID
 */
export async function getConversacion(
  idConversacion: number,
  idUsuario: number
): Promise<Conversacion & { participantes: Participante[] }> {
  const db = getMasterDb();

  // Verificar acceso y obtener conversación
  const conversacion = await db("conversaciones as c")
    .join("conversacion_participantes as cp", "cp.id_conversacion", "c.id")
    .where("c.id", idConversacion)
    .where("cp.id_usuario", idUsuario)
    .select("c.id", "c.tipo", "c.nombre", "c.created_at as createdAt", "c.updated_at as updatedAt")
    .first();

  if (!conversacion) {
    throw new Error("Conversación no encontrada o sin acceso");
  }

  // Obtener participantes
  const participantes = await db("conversacion_participantes as cp")
    .join("usuarios as u", "u.id", "cp.id_usuario")
    .where("cp.id_conversacion", idConversacion)
    .select(
      "u.id",
      "u.username",
      "u.nombre",
      "cp.ultimo_mensaje_leido as ultimoMensajeLeido",
      "cp.silenciada",
      "cp.fecha_union as fechaUnion"
    );

  return {
    ...conversacion,
    participantes,
  };
}

/**
 * Verificar si dos usuarios pueden comunicarse según permisos de departamento
 */
export async function puedenComunicarse(idUsuario1: number, idUsuario2: number): Promise<boolean> {
  const db = getMasterDb();

  // Obtener departamentos del usuario 1
  const deptos1 = await db("usuarios_departamentos")
    .where("id_usuario", idUsuario1)
    .select("id_departamento");

  // Obtener departamentos del usuario 2
  const deptos2 = await db("usuarios_departamentos")
    .where("id_usuario", idUsuario2)
    .select("id_departamento");

  // Si alguno no tiene departamento, permitir comunicación
  if (deptos1.length === 0 || deptos2.length === 0) {
    return true;
  }

  const idsDep1 = deptos1.map((d: { id_departamento: number }) => d.id_departamento);
  const idsDep2 = deptos2.map((d: { id_departamento: number }) => d.id_departamento);

  // Verificar si hay permiso de chat entre algún par de departamentos
  const permiso = await db("permisos_comunicacion")
    .whereIn("id_departamento_origen", idsDep1)
    .whereIn("id_departamento_destino", idsDep2)
    .where("puede_chat", true)
    .first();

  return !!permiso;
}

/**
 * Obtener usuarios disponibles para chat (según permisos)
 */
export async function getUsuariosDisponiblesChat(idUsuario: number): Promise<
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
    const puedeComunicarse = await puedenComunicarse(idUsuario, u.id);
    if (puedeComunicarse) {
      // Obtener departamentos del usuario
      const departamentos = await db("usuarios_departamentos as ud")
        .join("departamentos as d", "d.id", "ud.id_departamento")
        .where("ud.id_usuario", u.id)
        .where("d.activo", true)
        .select("d.nombre");

      // Obtener empresas (bases de datos) del usuario
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
  }

  return resultado;
}

/**
 * Silenciar/desilenciar una conversación
 */
export async function toggleSilenciar(
  idConversacion: number,
  idUsuario: number,
  silenciada: boolean
): Promise<void> {
  const db = getMasterDb();

  await db("conversacion_participantes")
    .where("id_conversacion", idConversacion)
    .where("id_usuario", idUsuario)
    .update({ silenciada });
}

/**
 * Contar total de mensajes no leídos en todas las conversaciones
 */
export async function contarTotalNoLeidos(idUsuario: number): Promise<number> {
  const db = getMasterDb();

  const conversaciones = await db("conversacion_participantes")
    .where("id_usuario", idUsuario)
    .select("id_conversacion", "ultimo_mensaje_leido");

  let total = 0;

  for (const conv of conversaciones) {
    let query = db("mensajes_chat")
      .where("id_conversacion", conv.id_conversacion)
      .whereNot("id_usuario_autor", idUsuario);

    if (conv.ultimo_mensaje_leido) {
      query = query.where("id", ">", conv.ultimo_mensaje_leido);
    }

    const result = await query.count("* as count").first();
    total += Number((result as { count: number })?.count ?? 0);
  }

  return total;
}
