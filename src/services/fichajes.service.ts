// src/services/fichajes.service.ts
// Servicio de fichajes - Lógica de negocio para fichajes de entrada/salida

import { getMasterDb } from "../db/masterDb.js";
import { verifyPassword, isMasterCredentials } from "../auth/index.js";

const masterDb = getMasterDb();

// Códigos de advertencia
export const ADVERTENCIAS = {
  ENTRADA_SIN_SALIDA_PREVIA: "ENTRADA_SIN_SALIDA_PREVIA",
  EXCESO_HORAS_24: "EXCESO_HORAS_24",
  EXCESO_HORAS_12: "EXCESO_HORAS_12",
  FUERA_HORARIO: "FUERA_HORARIO",
  SALIDA_SIN_ENTRADA: "SALIDA_SIN_ENTRADA",
} as const;

export type CodigoAdvertencia = typeof ADVERTENCIAS[keyof typeof ADVERTENCIAS];

export interface Fichaje {
  id: number;
  id_usuario: number;
  id_usuario_registro: number;
  fecha: string;
  hora: string;
  tipo: "ENTRADA" | "SALIDA";
  ip_address: string | null;
  es_correccion: boolean;
  id_fichaje_original: number | null;
  motivo_correccion: string | null;
  advertencias: CodigoAdvertencia[];
  observaciones: string | null;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
  // Campos join
  nombre_usuario?: string;
  username?: string;
}

export interface EstadoFichaje {
  ultimoFichaje: Fichaje | null;
  tipoSugerido: "ENTRADA" | "SALIDA";
  horasTrabajadasHoy: number;
  advertencias: CodigoAdvertencia[];
}

export interface ResultadoFichaje {
  success: boolean;
  fichaje?: Fichaje;
  advertencias: CodigoAdvertencia[];
  mensaje: string;
}

export interface ResumenMensualUsuario {
  id_usuario: number;
  nombre: string;
  username: string;
  horas_trabajadas: number;
  dias_trabajados: number;
  fichajes_incompletos: number;
  advertencias_count: number;
}

/**
 * Valida las credenciales de un usuario para fichar
 */
export async function validarCredencialesFichaje(
  username: string,
  password: string
): Promise<{ valido: boolean; usuario?: { id: number; nombre: string; username: string } }> {
  // El usuario Master no puede fichar
  if (isMasterCredentials(username, password)) {
    return { valido: false };
  }

  // Detectar estructura de la tabla usuarios
  const columns = await masterDb.raw(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios' AND table_schema = 'public'
  `);
  const columnNames = columns.rows.map((r: { column_name: string }) => r.column_name.toLowerCase());
  const hasNombreUsuario = columnNames.includes('nombreusuario');
  const usernameColumn = hasNombreUsuario ? 'nombreUsuario' : 'username';

  // Buscar usuario
  const usuario = await masterDb("usuarios")
    .where(usernameColumn, username)
    .where("activo", true)
    .first();

  if (!usuario) {
    return { valido: false };
  }

  // Obtener el hash de la contraseña
  const passwordHash = (usuario as Record<string, unknown>)['passwordHash'] as string ||
                       (usuario as Record<string, unknown>)['password_hash'] as string;

  // Verificar contraseña
  const passwordValid = await verifyPassword(password, passwordHash);
  if (!passwordValid) {
    return { valido: false };
  }

  return {
    valido: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username || usuario.nombreUsuario,
    },
  };
}

/**
 * Obtiene el último fichaje de un usuario
 */
export async function getUltimoFichaje(idUsuario: number): Promise<Fichaje | null> {
  const fichaje = await masterDb("fichajes")
    .where("id_usuario", idUsuario)
    .where("activo", true)
    .orderBy("fecha", "desc")
    .orderBy("hora", "desc")
    .first();

  return fichaje || null;
}

/**
 * Obtiene los fichajes de hoy de un usuario
 */
export async function getFichajesHoy(idUsuario: number): Promise<Fichaje[]> {
  const hoy = new Date().toISOString().split("T")[0];

  return masterDb("fichajes")
    .where("id_usuario", idUsuario)
    .where("fecha", hoy)
    .where("activo", true)
    .orderBy("hora", "asc");
}

/**
 * Calcula las horas trabajadas hoy
 */
export async function calcularHorasTrabajadasHoy(idUsuario: number): Promise<number> {
  const fichajes = await getFichajesHoy(idUsuario);

  let horasTotales = 0;
  let entradaActual: string | null = null;

  for (const f of fichajes) {
    if (f.tipo === "ENTRADA") {
      entradaActual = f.hora;
    } else if (f.tipo === "SALIDA" && entradaActual) {
      const [hE, mE] = entradaActual.split(":").map(Number);
      const [hS, mS] = f.hora.split(":").map(Number);

      const minutosEntrada = hE * 60 + mE;
      const minutosSalida = hS * 60 + mS;
      const minutosTrabajados = minutosSalida - minutosEntrada;

      horasTotales += minutosTrabajados / 60;
      entradaActual = null;
    }
  }

  // Si hay una entrada sin salida, calcular hasta ahora
  if (entradaActual) {
    const ahora = new Date();
    const [hE, mE] = entradaActual.split(":").map(Number);
    const minutosEntrada = hE * 60 + mE;
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    horasTotales += (minutosAhora - minutosEntrada) / 60;
  }

  return Math.round(horasTotales * 100) / 100;
}

/**
 * Detecta qué tipo de fichaje debería ser (ENTRADA o SALIDA)
 * y genera advertencias si hay situaciones anómalas
 */
export async function detectarTipoFichaje(idUsuario: number): Promise<EstadoFichaje> {
  const ultimoFichaje = await getUltimoFichaje(idUsuario);
  const horasTrabajadasHoy = await calcularHorasTrabajadasHoy(idUsuario);
  const advertencias: CodigoAdvertencia[] = [];

  let tipoSugerido: "ENTRADA" | "SALIDA" = "ENTRADA";

  if (ultimoFichaje) {
    // Si el último fue ENTRADA, sugerir SALIDA
    if (ultimoFichaje.tipo === "ENTRADA") {
      tipoSugerido = "SALIDA";

      // Verificar tiempo desde última entrada
      const fechaUltimo = new Date(`${ultimoFichaje.fecha}T${ultimoFichaje.hora}`);
      const ahora = new Date();
      const horasTranscurridas = (ahora.getTime() - fechaUltimo.getTime()) / (1000 * 60 * 60);

      if (horasTranscurridas > 24) {
        advertencias.push(ADVERTENCIAS.EXCESO_HORAS_24);
      } else if (horasTranscurridas > 12) {
        advertencias.push(ADVERTENCIAS.EXCESO_HORAS_12);
      }
    } else {
      // Si el último fue SALIDA, sugerir ENTRADA
      tipoSugerido = "ENTRADA";
    }
  }

  return {
    ultimoFichaje,
    tipoSugerido,
    horasTrabajadasHoy,
    advertencias,
  };
}

/**
 * Valida el fichaje contra el horario teórico del usuario
 */
export async function validarContraHorario(
  idUsuario: number,
  tipo: "ENTRADA" | "SALIDA",
  hora: string
): Promise<CodigoAdvertencia[]> {
  const advertencias: CodigoAdvertencia[] = [];

  // Obtener horario del día actual
  const hoy = new Date();
  const diaSemana = (hoy.getDay() + 6) % 7; // Convertir: Dom=0 -> 6, Lun=1 -> 0

  const horario = await masterDb("horarios_usuario")
    .where("id_usuario", idUsuario)
    .where("dia_semana", diaSemana)
    .where("activo", true)
    .first();

  if (horario && horario.hora_inicio && horario.hora_fin) {
    const [hFichaje, mFichaje] = hora.split(":").map(Number);
    const minutosFichaje = hFichaje * 60 + mFichaje;

    if (tipo === "ENTRADA") {
      const [hInicio, mInicio] = horario.hora_inicio.split(":").map(Number);
      const minutosInicio = hInicio * 60 + mInicio;
      const diferenciaMinutos = Math.abs(minutosFichaje - minutosInicio);

      // Si la diferencia es mayor a 30 minutos, advertir
      if (diferenciaMinutos > 30) {
        advertencias.push(ADVERTENCIAS.FUERA_HORARIO);
      }
    } else {
      const [hFin, mFin] = horario.hora_fin.split(":").map(Number);
      const minutosFin = hFin * 60 + mFin;
      const diferenciaMinutos = Math.abs(minutosFichaje - minutosFin);

      if (diferenciaMinutos > 30) {
        advertencias.push(ADVERTENCIAS.FUERA_HORARIO);
      }
    }
  }

  return advertencias;
}

/**
 * Registra un fichaje
 */
export async function registrarFichaje(
  idUsuario: number,
  idUsuarioRegistro: number,
  tipo: "ENTRADA" | "SALIDA",
  ipAddress?: string,
  observaciones?: string
): Promise<ResultadoFichaje> {
  const ahora = new Date();
  const fecha = ahora.toISOString().split("T")[0];
  const hora = ahora.toTimeString().split(" ")[0].substring(0, 5); // HH:MM

  // Detectar estado actual y obtener advertencias
  const estado = await detectarTipoFichaje(idUsuario);
  const advertenciasHorario = await validarContraHorario(idUsuario, tipo, hora);
  const advertencias = [...estado.advertencias, ...advertenciasHorario];

  // Verificar coherencia del fichaje
  if (tipo === "ENTRADA" && estado.ultimoFichaje?.tipo === "ENTRADA") {
    advertencias.push(ADVERTENCIAS.ENTRADA_SIN_SALIDA_PREVIA);
  }

  if (tipo === "SALIDA") {
    const fichajesHoy = await getFichajesHoy(idUsuario);
    const tieneEntradaHoy = fichajesHoy.some(f => f.tipo === "ENTRADA");
    if (!tieneEntradaHoy) {
      advertencias.push(ADVERTENCIAS.SALIDA_SIN_ENTRADA);
    }
  }

  // Registrar fichaje
  const [fichaje] = await masterDb("fichajes")
    .insert({
      id_usuario: idUsuario,
      id_usuario_registro: idUsuarioRegistro,
      fecha,
      hora,
      tipo,
      ip_address: ipAddress || null,
      es_correccion: false,
      advertencias: JSON.stringify(advertencias),
      observaciones: observaciones || null,
      activo: true,
    })
    .returning("*");

  return {
    success: true,
    fichaje,
    advertencias,
    mensaje: `${tipo === "ENTRADA" ? "Entrada" : "Salida"} registrada a las ${hora}`,
  };
}

/**
 * Crea un fichaje manual (corrección por admin)
 */
export async function crearFichajeManual(
  idUsuario: number,
  idUsuarioRegistro: number,
  fecha: string,
  hora: string,
  tipo: "ENTRADA" | "SALIDA",
  motivo: string,
  ipAddress?: string
): Promise<ResultadoFichaje> {
  const [fichaje] = await masterDb("fichajes")
    .insert({
      id_usuario: idUsuario,
      id_usuario_registro: idUsuarioRegistro,
      fecha,
      hora,
      tipo,
      ip_address: ipAddress || null,
      es_correccion: true,
      motivo_correccion: motivo,
      advertencias: JSON.stringify([]),
      activo: true,
    })
    .returning("*");

  return {
    success: true,
    fichaje,
    advertencias: [],
    mensaje: `Fichaje manual creado para ${fecha} a las ${hora}`,
  };
}

/**
 * Corrige un fichaje existente (crea nuevo registro vinculado)
 */
export async function corregirFichaje(
  idFichajeOriginal: number,
  idUsuarioRegistro: number,
  nuevaHora: string,
  nuevoTipo: "ENTRADA" | "SALIDA",
  motivo: string
): Promise<ResultadoFichaje> {
  // Obtener fichaje original
  const original = await masterDb("fichajes")
    .where("id", idFichajeOriginal)
    .first();

  if (!original) {
    return {
      success: false,
      advertencias: [],
      mensaje: "Fichaje original no encontrado",
    };
  }

  // Desactivar el fichaje original
  await masterDb("fichajes")
    .where("id", idFichajeOriginal)
    .update({ activo: false, updated_at: new Date() });

  // Crear nuevo fichaje como corrección
  const [fichaje] = await masterDb("fichajes")
    .insert({
      id_usuario: original.id_usuario,
      id_usuario_registro: idUsuarioRegistro,
      fecha: original.fecha,
      hora: nuevaHora,
      tipo: nuevoTipo,
      ip_address: null,
      es_correccion: true,
      id_fichaje_original: idFichajeOriginal,
      motivo_correccion: motivo,
      advertencias: JSON.stringify([]),
      activo: true,
    })
    .returning("*");

  return {
    success: true,
    fichaje,
    advertencias: [],
    mensaje: `Fichaje corregido: ${nuevoTipo} a las ${nuevaHora}`,
  };
}

/**
 * Elimina (soft delete) un fichaje
 */
export async function eliminarFichaje(idFichaje: number): Promise<boolean> {
  const result = await masterDb("fichajes")
    .where("id", idFichaje)
    .update({ activo: false, updated_at: new Date() });

  return result > 0;
}

/**
 * Obtiene fichajes con filtros
 */
export async function getFichajes(filtros: {
  idUsuario?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  tipo?: "ENTRADA" | "SALIDA";
  soloConAdvertencias?: boolean;
  incluirInactivos?: boolean;
}): Promise<Fichaje[]> {
  let query = masterDb("fichajes as f")
    .join("usuarios as u", "f.id_usuario", "u.id")
    .select(
      "f.*",
      "u.nombre as nombre_usuario",
      "u.username"
    )
    .orderBy("f.fecha", "desc")
    .orderBy("f.hora", "desc");

  if (!filtros.incluirInactivos) {
    query = query.where("f.activo", true);
  }

  if (filtros.idUsuario) {
    query = query.where("f.id_usuario", filtros.idUsuario);
  }

  if (filtros.fechaDesde) {
    query = query.where("f.fecha", ">=", filtros.fechaDesde);
  }

  if (filtros.fechaHasta) {
    query = query.where("f.fecha", "<=", filtros.fechaHasta);
  }

  if (filtros.tipo) {
    query = query.where("f.tipo", filtros.tipo);
  }

  if (filtros.soloConAdvertencias) {
    query = query.whereRaw("jsonb_array_length(f.advertencias) > 0");
  }

  return query;
}

/**
 * Calcula el resumen mensual de fichajes
 */
export async function getResumenMensual(
  anyo: number,
  mes: number
): Promise<ResumenMensualUsuario[]> {
  const primerDia = `${anyo}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(anyo, mes, 0).toISOString().split("T")[0];

  // Obtener todos los usuarios activos
  const usuarios = await masterDb("usuarios")
    .where("activo", true)
    .select("id", "nombre", "username");

  const resultado: ResumenMensualUsuario[] = [];

  for (const u of usuarios) {
    // Obtener fichajes del mes
    const fichajes = await masterDb("fichajes")
      .where("id_usuario", u.id)
      .where("activo", true)
      .whereBetween("fecha", [primerDia, ultimoDia])
      .orderBy("fecha", "asc")
      .orderBy("hora", "asc");

    // Calcular horas trabajadas y días
    let horasTotales = 0;
    const diasTrabajados = new Set<string>();
    let fichajesIncompletos = 0;
    let advertenciasCount = 0;

    // Agrupar por día
    const fichajesPorDia: Record<string, Fichaje[]> = {};
    for (const f of fichajes) {
      if (!fichajesPorDia[f.fecha]) {
        fichajesPorDia[f.fecha] = [];
      }
      fichajesPorDia[f.fecha].push(f);
      if (f.advertencias && Array.isArray(f.advertencias)) {
        advertenciasCount += f.advertencias.length;
      }
    }

    // Calcular horas por día
    for (const [fecha, fichajesDia] of Object.entries(fichajesPorDia)) {
      diasTrabajados.add(fecha);
      let entradaActual: string | null = null;

      for (const f of fichajesDia) {
        if (f.tipo === "ENTRADA") {
          entradaActual = f.hora;
        } else if (f.tipo === "SALIDA" && entradaActual) {
          const [hE, mE] = entradaActual.split(":").map(Number);
          const [hS, mS] = f.hora.split(":").map(Number);

          const minutosEntrada = hE * 60 + mE;
          const minutosSalida = hS * 60 + mS;
          horasTotales += (minutosSalida - minutosEntrada) / 60;
          entradaActual = null;
        }
      }

      // Si quedó entrada sin salida, contar como incompleto
      if (entradaActual) {
        fichajesIncompletos++;
      }
    }

    resultado.push({
      id_usuario: u.id,
      nombre: u.nombre,
      username: u.username,
      horas_trabajadas: Math.round(horasTotales * 100) / 100,
      dias_trabajados: diasTrabajados.size,
      fichajes_incompletos: fichajesIncompletos,
      advertencias_count: advertenciasCount,
    });
  }

  return resultado;
}
