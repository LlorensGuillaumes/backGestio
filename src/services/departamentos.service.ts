// src/services/departamentos.service.ts
import { getMasterDb } from "../db/masterDb.js";

export interface Departamento {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
}

export interface UsuarioDepartamento {
  idUsuario: number;
  username: string;
  nombre: string | null;
}

export interface PermisoComunicacion {
  idDepartamentoOrigen: number;
  nombreDepartamentoOrigen: string;
  idDepartamentoDestino: number;
  nombreDepartamentoDestino: string;
  puedeChat: boolean;
  puedeMensajeFormal: boolean;
}

/**
 * Obtener todos los departamentos
 */
export async function getDepartamentos(soloActivos: boolean = true): Promise<Departamento[]> {
  const db = getMasterDb();

  let query = db("departamentos")
    .select(
      "id",
      "nombre",
      "descripcion",
      "activo",
      "created_at as createdAt"
    )
    .orderBy("nombre");

  if (soloActivos) {
    query = query.where("activo", true);
  }

  return query;
}

/**
 * Obtener un departamento por ID
 */
export async function getDepartamento(id: number): Promise<Departamento | null> {
  const db = getMasterDb();

  const departamento = await db("departamentos")
    .where("id", id)
    .select(
      "id",
      "nombre",
      "descripcion",
      "activo",
      "created_at as createdAt"
    )
    .first();

  return departamento || null;
}

/**
 * Crear un nuevo departamento
 */
export async function crearDepartamento(
  nombre: string,
  descripcion?: string
): Promise<Departamento> {
  const db = getMasterDb();

  const [departamento] = await db("departamentos")
    .insert({
      nombre,
      descripcion: descripcion || null,
      activo: true,
      created_at: new Date(),
    })
    .returning(["id", "nombre", "descripcion", "activo", "created_at as createdAt"]);

  return departamento;
}

/**
 * Actualizar un departamento
 */
export async function actualizarDepartamento(
  id: number,
  datos: { nombre?: string; descripcion?: string; activo?: boolean }
): Promise<boolean> {
  const db = getMasterDb();

  const updateData: Record<string, unknown> = {};

  if (datos.nombre !== undefined) {
    updateData.nombre = datos.nombre;
  }
  if (datos.descripcion !== undefined) {
    updateData.descripcion = datos.descripcion;
  }
  if (datos.activo !== undefined) {
    updateData.activo = datos.activo;
  }

  if (Object.keys(updateData).length === 0) {
    return false;
  }

  const updated = await db("departamentos").where("id", id).update(updateData);

  return updated > 0;
}

/**
 * Eliminar un departamento (soft delete)
 */
export async function eliminarDepartamento(id: number): Promise<boolean> {
  const db = getMasterDb();

  const updated = await db("departamentos").where("id", id).update({ activo: false });

  return updated > 0;
}

/**
 * Obtener usuarios de un departamento
 */
export async function getUsuariosDepartamento(idDepartamento: number): Promise<UsuarioDepartamento[]> {
  const db = getMasterDb();

  const usuarios = await db("usuarios_departamentos as ud")
    .join("usuarios as u", "u.id", "ud.id_usuario")
    .where("ud.id_departamento", idDepartamento)
    .where("u.activo", true)
    .select(
      "u.id as idUsuario",
      "u.username",
      "u.nombre"
    )
    .orderBy("u.username");

  return usuarios;
}

/**
 * Asignar usuarios a un departamento
 */
export async function asignarUsuarios(
  idDepartamento: number,
  idUsuarios: number[]
): Promise<void> {
  const db = getMasterDb();

  await db.transaction(async (trx) => {
    // Eliminar asignaciones actuales
    await trx("usuarios_departamentos").where("id_departamento", idDepartamento).delete();

    // Insertar nuevas asignaciones
    if (idUsuarios.length > 0) {
      const asignaciones = idUsuarios.map((idUsuario) => ({
        id_usuario: idUsuario,
        id_departamento: idDepartamento,
      }));

      await trx("usuarios_departamentos").insert(asignaciones);
    }
  });
}

/**
 * Agregar un usuario a un departamento
 */
export async function agregarUsuario(idDepartamento: number, idUsuario: number): Promise<void> {
  const db = getMasterDb();

  // Verificar si ya existe
  const existe = await db("usuarios_departamentos")
    .where("id_departamento", idDepartamento)
    .where("id_usuario", idUsuario)
    .first();

  if (!existe) {
    await db("usuarios_departamentos").insert({
      id_departamento: idDepartamento,
      id_usuario: idUsuario,
    });
  }
}

/**
 * Quitar un usuario de un departamento
 */
export async function quitarUsuario(idDepartamento: number, idUsuario: number): Promise<void> {
  const db = getMasterDb();

  await db("usuarios_departamentos")
    .where("id_departamento", idDepartamento)
    .where("id_usuario", idUsuario)
    .delete();
}

/**
 * Obtener permisos de comunicación entre departamentos
 */
export async function getPermisosComunicacion(): Promise<PermisoComunicacion[]> {
  const db = getMasterDb();

  const permisos = await db("permisos_comunicacion as pc")
    .join("departamentos as do", "do.id", "pc.id_departamento_origen")
    .join("departamentos as dd", "dd.id", "pc.id_departamento_destino")
    .select(
      "pc.id_departamento_origen as idDepartamentoOrigen",
      "do.nombre as nombreDepartamentoOrigen",
      "pc.id_departamento_destino as idDepartamentoDestino",
      "dd.nombre as nombreDepartamentoDestino",
      "pc.puede_chat as puedeChat",
      "pc.puede_mensaje_formal as puedeMensajeFormal"
    )
    .orderBy(["do.nombre", "dd.nombre"]);

  return permisos;
}

/**
 * Configurar permiso de comunicación entre departamentos
 */
export async function configurarPermiso(
  idDepartamentoOrigen: number,
  idDepartamentoDestino: number,
  puedeChat: boolean,
  puedeMensajeFormal: boolean
): Promise<void> {
  const db = getMasterDb();

  const existe = await db("permisos_comunicacion")
    .where("id_departamento_origen", idDepartamentoOrigen)
    .where("id_departamento_destino", idDepartamentoDestino)
    .first();

  if (existe) {
    await db("permisos_comunicacion")
      .where("id_departamento_origen", idDepartamentoOrigen)
      .where("id_departamento_destino", idDepartamentoDestino)
      .update({
        puede_chat: puedeChat,
        puede_mensaje_formal: puedeMensajeFormal,
      });
  } else {
    await db("permisos_comunicacion").insert({
      id_departamento_origen: idDepartamentoOrigen,
      id_departamento_destino: idDepartamentoDestino,
      puede_chat: puedeChat,
      puede_mensaje_formal: puedeMensajeFormal,
    });
  }
}

/**
 * Eliminar permiso de comunicación
 */
export async function eliminarPermiso(
  idDepartamentoOrigen: number,
  idDepartamentoDestino: number
): Promise<void> {
  const db = getMasterDb();

  await db("permisos_comunicacion")
    .where("id_departamento_origen", idDepartamentoOrigen)
    .where("id_departamento_destino", idDepartamentoDestino)
    .delete();
}

/**
 * Obtener departamentos de un usuario
 */
export async function getDepartamentosUsuario(idUsuario: number): Promise<Departamento[]> {
  const db = getMasterDb();

  const departamentos = await db("usuarios_departamentos as ud")
    .join("departamentos as d", "d.id", "ud.id_departamento")
    .where("ud.id_usuario", idUsuario)
    .where("d.activo", true)
    .select(
      "d.id",
      "d.nombre",
      "d.descripcion",
      "d.activo",
      "d.created_at as createdAt"
    )
    .orderBy("d.nombre");

  return departamentos;
}

/**
 * Obtener todos los usuarios con sus departamentos
 */
export async function getUsuariosConDepartamentos(): Promise<
  Array<{
    id: number;
    username: string;
    nombre: string | null;
    departamentos: string[];
  }>
> {
  const db = getMasterDb();

  const usuarios = await db("usuarios")
    .where("activo", true)
    .select("id", "username", "nombre")
    .orderBy("username");

  const resultado = [];

  for (const u of usuarios) {
    const departamentos = await db("usuarios_departamentos as ud")
      .join("departamentos as d", "d.id", "ud.id_departamento")
      .where("ud.id_usuario", u.id)
      .where("d.activo", true)
      .select("d.nombre");

    resultado.push({
      id: u.id,
      username: u.username,
      nombre: u.nombre,
      departamentos: departamentos.map((d: { nombre: string }) => d.nombre),
    });
  }

  return resultado;
}
