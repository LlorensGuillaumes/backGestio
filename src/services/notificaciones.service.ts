// src/services/notificaciones.service.ts
import { getMasterDb } from "../db/masterDb.js";

export interface Notificacion {
  id: number;
  idTipo: number;
  tipoNombre: string;
  tipoCodigo: string;
  titulo: string;
  mensaje: string;
  datos: Record<string, unknown>;
  leida: boolean;
  fechaLectura: string | null;
  createdAt: string;
}

export interface TipoNotificacion {
  id: number;
  codigo: string;
  nombreEs: string;
  nombreCa: string;
  descripcion: string | null;
  permisoRequerido: string | null;
  activo: boolean;
}

export interface PreferenciaNotificacion {
  idTipoNotificacion: number;
  tipoCodigo: string;
  tipoNombreEs: string;
  tipoNombreCa: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
}

/**
 * Crear una notificación para todos los usuarios que tengan el permiso requerido
 * y que tengan habilitadas las notificaciones push para ese tipo
 */
export async function crearNotificacionPorPermiso(
  tipo: string,
  titulo: string,
  mensaje: string,
  datos?: Record<string, unknown>
): Promise<void> {
  const db = getMasterDb();

  // Obtener el tipo de notificación
  const tipoNotif = await db("tipos_notificacion")
    .where("codigo", tipo)
    .where("activo", true)
    .first();

  if (!tipoNotif) {
    console.warn(`Tipo de notificación no encontrado: ${tipo}`);
    return;
  }

  // Obtener usuarios que deben recibir la notificación
  // - Si hay permiso requerido, solo los que lo tienen
  // - Si no hay permiso requerido, todos los usuarios activos
  let usuariosQuery = db("usuarios as u")
    .select("u.id")
    .where("u.activo", true);

  if (tipoNotif.permiso_requerido) {
    // Solo usuarios con el permiso requerido
    usuariosQuery = usuariosQuery
      .join("usuarios_menus as um", "um.id_usuario", "u.id")
      .join("menus as m", "m.id", "um.id_menu")
      .where("m.codigo", tipoNotif.permiso_requerido)
      .where("um.puede_ver", true);
  }

  const usuarios = await usuariosQuery;

  if (usuarios.length === 0) {
    return;
  }

  // Obtener preferencias de los usuarios
  const preferencias = await db("preferencias_notificacion")
    .whereIn(
      "id_usuario",
      usuarios.map((u: { id: number }) => u.id)
    )
    .where("id_tipo_notificacion", tipoNotif.id)
    .where("push_enabled", true);

  const usuariosConPref = new Set(preferencias.map((p: { id_usuario: number }) => p.id_usuario));

  // Usuarios sin preferencias configuradas reciben por defecto
  const usuariosParaNotificar = usuarios.filter(
    (u: { id: number }) =>
      usuariosConPref.has(u.id) ||
      !preferencias.some((p: { id_usuario: number }) => p.id_usuario === u.id)
  );

  if (usuariosParaNotificar.length === 0) {
    return;
  }

  // Crear las notificaciones
  const notificaciones = usuariosParaNotificar.map((u: { id: number }) => ({
    id_tipo: tipoNotif.id,
    id_usuario_destino: u.id,
    titulo,
    mensaje,
    datos: JSON.stringify(datos || {}),
    leida: false,
    created_at: new Date(),
  }));

  await db("notificaciones").insert(notificaciones);
}

/**
 * Crear una notificación para un usuario específico
 */
export async function crearNotificacionUsuario(
  idUsuario: number,
  tipo: string,
  titulo: string,
  mensaje: string,
  datos?: Record<string, unknown>
): Promise<void> {
  const db = getMasterDb();

  const tipoNotif = await db("tipos_notificacion")
    .where("codigo", tipo)
    .where("activo", true)
    .first();

  if (!tipoNotif) {
    console.warn(`Tipo de notificación no encontrado: ${tipo}`);
    return;
  }

  // Verificar preferencias del usuario
  const preferencia = await db("preferencias_notificacion")
    .where("id_usuario", idUsuario)
    .where("id_tipo_notificacion", tipoNotif.id)
    .first();

  // Si tiene preferencias configuradas y push está deshabilitado, no crear
  if (preferencia && !preferencia.push_enabled) {
    return;
  }

  await db("notificaciones").insert({
    id_tipo: tipoNotif.id,
    id_usuario_destino: idUsuario,
    titulo,
    mensaje,
    datos: JSON.stringify(datos || {}),
    leida: false,
    created_at: new Date(),
  });
}

/**
 * Obtener notificaciones de un usuario
 */
export async function getNotificacionesUsuario(
  idUsuario: number,
  soloNoLeidas: boolean = false,
  limit: number = 50,
  offset: number = 0
): Promise<{ notificaciones: Notificacion[]; total: number }> {
  const db = getMasterDb();

  let query = db("notificaciones as n")
    .leftJoin("tipos_notificacion as t", "t.id", "n.id_tipo")
    .select(
      "n.id",
      "n.id_tipo as idTipo",
      db.raw("COALESCE(t.nombre_es, 'Sistema') as \"tipoNombre\""),
      db.raw("COALESCE(t.codigo, 'sistema') as \"tipoCodigo\""),
      "n.titulo",
      "n.mensaje",
      "n.datos",
      "n.leida",
      "n.fecha_lectura as fechaLectura",
      "n.created_at as createdAt"
    )
    .where("n.id_usuario_destino", idUsuario)
    .orderBy("n.created_at", "desc");

  if (soloNoLeidas) {
    query = query.where("n.leida", false);
  }

  const countQuery = query.clone().clearSelect().clearOrder().count("* as total").first();
  const totalResult = await countQuery;
  const total = Number((totalResult as { total: number })?.total ?? 0);

  const notificaciones = await query.limit(limit).offset(offset);

  return {
    notificaciones: notificaciones.map((n: Record<string, unknown>) => ({
      ...n,
      datos: typeof n.datos === "string" ? JSON.parse(n.datos) : n.datos,
    })) as Notificacion[],
    total,
  };
}

/**
 * Marcar una notificación como leída
 */
export async function marcarLeida(id: number, idUsuario: number): Promise<boolean> {
  const db = getMasterDb();

  const updated = await db("notificaciones")
    .where("id", id)
    .where("id_usuario_destino", idUsuario)
    .update({
      leida: true,
      fecha_lectura: new Date(),
    });

  return updated > 0;
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function marcarTodasLeidas(idUsuario: number): Promise<number> {
  const db = getMasterDb();

  const updated = await db("notificaciones")
    .where("id_usuario_destino", idUsuario)
    .where("leida", false)
    .update({
      leida: true,
      fecha_lectura: new Date(),
    });

  return updated;
}

/**
 * Contar notificaciones no leídas
 */
export async function contarNoLeidas(idUsuario: number): Promise<number> {
  const db = getMasterDb();

  const result = await db("notificaciones")
    .where("id_usuario_destino", idUsuario)
    .where("leida", false)
    .count("* as count")
    .first();

  return Number((result as { count: number })?.count ?? 0);
}

/**
 * Obtener tipos de notificación activos
 */
export async function getTiposNotificacion(): Promise<TipoNotificacion[]> {
  const db = getMasterDb();

  const tipos = await db("tipos_notificacion")
    .select(
      "id",
      "codigo",
      "nombre_es as nombreEs",
      "nombre_ca as nombreCa",
      "descripcion",
      "permiso_requerido as permisoRequerido",
      "activo"
    )
    .where("activo", true)
    .orderBy("id");

  return tipos;
}

/**
 * Obtener preferencias de notificación de un usuario
 */
export async function getPreferenciasUsuario(
  idUsuario: number
): Promise<PreferenciaNotificacion[]> {
  const db = getMasterDb();

  // Obtener todos los tipos de notificación activos
  const tipos = await db("tipos_notificacion")
    .select("id", "codigo", "nombre_es", "nombre_ca")
    .where("activo", true);

  // Obtener preferencias existentes del usuario
  const preferencias = await db("preferencias_notificacion")
    .where("id_usuario", idUsuario);

  const prefMap = new Map(
    preferencias.map((p: { id_tipo_notificacion: number; email_enabled: boolean; push_enabled: boolean }) => [
      p.id_tipo_notificacion,
      p,
    ])
  );

  // Combinar tipos con preferencias (usar defaults si no hay preferencia)
  return tipos.map((t: { id: number; codigo: string; nombre_es: string; nombre_ca: string }) => {
    const pref = prefMap.get(t.id);
    return {
      idTipoNotificacion: t.id,
      tipoCodigo: t.codigo,
      tipoNombreEs: t.nombre_es,
      tipoNombreCa: t.nombre_ca,
      emailEnabled: pref ? pref.email_enabled : false,
      pushEnabled: pref ? pref.push_enabled : true,
    };
  });
}

/**
 * Actualizar preferencias de notificación de un usuario
 */
export async function actualizarPreferenciasUsuario(
  idUsuario: number,
  preferencias: Array<{
    idTipoNotificacion: number;
    emailEnabled: boolean;
    pushEnabled: boolean;
  }>
): Promise<void> {
  const db = getMasterDb();

  await db.transaction(async (trx) => {
    for (const pref of preferencias) {
      const existing = await trx("preferencias_notificacion")
        .where("id_usuario", idUsuario)
        .where("id_tipo_notificacion", pref.idTipoNotificacion)
        .first();

      if (existing) {
        await trx("preferencias_notificacion")
          .where("id_usuario", idUsuario)
          .where("id_tipo_notificacion", pref.idTipoNotificacion)
          .update({
            email_enabled: pref.emailEnabled,
            push_enabled: pref.pushEnabled,
          });
      } else {
        await trx("preferencias_notificacion").insert({
          id_usuario: idUsuario,
          id_tipo_notificacion: pref.idTipoNotificacion,
          email_enabled: pref.emailEnabled,
          push_enabled: pref.pushEnabled,
        });
      }
    }
  });
}

/**
 * Eliminar una notificación
 */
export async function eliminarNotificacion(id: number, idUsuario: number): Promise<boolean> {
  const db = getMasterDb();

  const deleted = await db("notificaciones")
    .where("id", id)
    .where("id_usuario_destino", idUsuario)
    .delete();

  return deleted > 0;
}
