// src/services/controlHorario.service.ts
// Servicio de control horario - Usa usuarios de gestio_master y festivos de gestio_db

import { getMasterDb } from "../db/masterDb.js";
import db from "../db.js"; // Para FestivosEmpresa

const masterDb = getMasterDb();

interface HorarioDia {
  dia_semana: number;
  hora_inicio: string | null;
  hora_fin: string | null;
  minutos_descanso: number;
}

interface Festivo {
  FechaInicio: Date;
  FechaFin: Date | null;
  Anual: boolean;
  Nombre?: string;
  TipoFestivo?: string;
}

interface Ausencia {
  tipo: string;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  computable: boolean;
}

interface ResumenUsuario {
  id: number;
  nombre: string;
  username: string;
  nombre_convenio: string | null;
  horas_convenio: number;
  dias_vacaciones_convenio: number;
  dias_convenio_extra: number;
  dias_laborables_anyo: number;
  horas_segun_horario: number;
  diferencia_horas: number;
  dias_a_compensar: number;
  dias_vacaciones_usados: number;
  dias_convenio_usados: number;
  dias_vacaciones_pendientes: number;
  dias_convenio_pendientes: number;
  horas_promedio_semanal: number;
}

interface DiaCalendario {
  fecha: string;
  diaSemana: number;
  esFestivo: boolean;
  nombreFestivo: string | null;
  tipoFestivo: string | null;
  esFinDeSemana: boolean;
  esAusencia: boolean;
  tipoAusencia: string | null;
  horaInicio: string | null;
  horaFin: string | null;
  minutosDescanso: number;
  horasTrabajo: number;
  esLaborable: boolean;
}

/**
 * Calcula las horas de trabajo de un día según el horario
 */
function calcularHorasDia(horaInicio: string | null, horaFin: string | null, minutosDescanso: number): number {
  if (!horaInicio || !horaFin) return 0;

  const [hiH, hiM] = horaInicio.split(":").map(Number);
  const [hfH, hfM] = horaFin.split(":").map(Number);

  const inicioMinutos = hiH * 60 + hiM;
  const finMinutos = hfH * 60 + hfM;
  const trabajoMinutos = finMinutos - inicioMinutos - minutosDescanso;

  return Math.max(0, trabajoMinutos / 60);
}

/**
 * Verifica si una fecha cae en un período festivo
 */
function esFechaFestivo(fecha: Date, festivos: Festivo[], anyo: number): { esFestivo: boolean; nombre: string | null; tipo: string | null } {
  for (const f of festivos) {
    let fechaInicioFestivo = new Date(f.FechaInicio);
    let fechaFinFestivo = f.FechaFin ? new Date(f.FechaFin) : fechaInicioFestivo;

    // Si es anual, ajustar al año consultado
    if (f.Anual) {
      fechaInicioFestivo = new Date(anyo, fechaInicioFestivo.getMonth(), fechaInicioFestivo.getDate());
      fechaFinFestivo = new Date(anyo, fechaFinFestivo.getMonth(), fechaFinFestivo.getDate());
    }

    if (fecha >= fechaInicioFestivo && fecha <= fechaFinFestivo) {
      return { esFestivo: true, nombre: f.Nombre || null, tipo: f.TipoFestivo || null };
    }
  }
  return { esFestivo: false, nombre: null, tipo: null };
}

/**
 * Verifica si una fecha cae en un período de ausencia
 */
function esFechaAusencia(fecha: Date, ausencias: Ausencia[]): { esAusencia: boolean; tipo: string | null; computable: boolean } {
  for (const a of ausencias) {
    const fechaInicioAusencia = new Date(a.fecha_inicio);
    const fechaFinAusencia = a.fecha_fin ? new Date(a.fecha_fin) : fechaInicioAusencia;

    if (fecha >= fechaInicioAusencia && fecha <= fechaFinAusencia) {
      return { esAusencia: true, tipo: a.tipo, computable: a.computable };
    }
  }
  return { esAusencia: false, tipo: null, computable: false };
}

/**
 * Cuenta días de ausencia por tipo para un usuario en un año
 */
function contarDiasAusencia(ausencias: Ausencia[], tipo: string, anyo: number): number {
  let dias = 0;
  for (const a of ausencias) {
    if (a.tipo !== tipo) continue;

    const inicio = new Date(a.fecha_inicio);
    const fin = a.fecha_fin ? new Date(a.fecha_fin) : inicio;

    // Solo contar días dentro del año
    const inicioAnyo = new Date(anyo, 0, 1);
    const finAnyo = new Date(anyo, 11, 31);

    const inicioReal = inicio < inicioAnyo ? inicioAnyo : inicio;
    const finReal = fin > finAnyo ? finAnyo : fin;

    if (inicioReal <= finReal) {
      const diffTime = finReal.getTime() - inicioReal.getTime();
      dias += Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  return dias;
}

/**
 * Calcula el resumen de horas anuales para todos los usuarios
 */
export async function calcularHorasAnuales(anyo: number): Promise<ResumenUsuario[]> {
  // Obtener usuarios activos con convenio (de gestio_master)
  const usuarios = await masterDb("usuarios as u")
    .leftJoin("convenios as c", "u.id_convenio", "c.id")
    .where("u.activo", true)
    .select(
      "u.id",
      "u.nombre",
      "u.username",
      "c.nombre as nombre_convenio",
      "c.horas_anuales",
      "c.dias_vacaciones",
      "c.dias_convenio"
    );

  // Obtener festivos del año (de gestio_db - por empresa)
  const festivos: Festivo[] = await db("FestivosEmpresa")
    .where("Activo", 1)
    .andWhere(function () {
      this.where("Anyo", anyo).orWhere("Anual", true);
    });

  const resultados: ResumenUsuario[] = [];

  for (const u of usuarios) {
    // Obtener horario del usuario (de gestio_master)
    const horarios: HorarioDia[] = await masterDb("horarios_usuario")
      .where("id_usuario", u.id)
      .where("activo", true);

    // Obtener ausencias del usuario en el año (de gestio_master)
    const ausencias: Ausencia[] = await masterDb("ausencias_usuario")
      .where("id_usuario", u.id)
      .where("activo", true)
      .whereRaw(`EXTRACT(YEAR FROM "fecha_inicio") = ?`, [anyo]);

    // Crear mapa de horario por día de semana
    const horarioMap = new Map<number, HorarioDia>();
    for (const h of horarios) {
      horarioMap.set(h.dia_semana, h);
    }

    // Calcular días laborables y horas según horario
    let diasLaborables = 0;
    let horasSegunHorario = 0;
    let horasPorSemana = 0;

    // Calcular horas promedio semanal
    for (let dia = 0; dia < 7; dia++) {
      const horario = horarioMap.get(dia);
      if (horario && horario.hora_inicio && horario.hora_fin) {
        horasPorSemana += calcularHorasDia(
          horario.hora_inicio,
          horario.hora_fin,
          horario.minutos_descanso
        );
      }
    }

    // Iterar por todos los días del año
    const inicioAnyo = new Date(anyo, 0, 1);
    const finAnyo = new Date(anyo, 11, 31);

    for (let d = new Date(inicioAnyo); d <= finAnyo; d.setDate(d.getDate() + 1)) {
      const diaSemana = (d.getDay() + 6) % 7; // Convertir: Dom=0 -> 6, Lun=1 -> 0
      const horario = horarioMap.get(diaSemana);

      // Si no tiene horario asignado ese día, no es laborable
      if (!horario || !horario.hora_inicio) continue;

      // Verificar si es festivo
      const festivo = esFechaFestivo(new Date(d), festivos, anyo);
      if (festivo.esFestivo) continue;

      // Este día es laborable
      diasLaborables++;
      horasSegunHorario += calcularHorasDia(
        horario.hora_inicio,
        horario.hora_fin,
        horario.minutos_descanso
      );
    }

    // Cálculos finales
    const horasConvenio = Number(u.horas_anuales) || 0;
    const diasVacaciones = Number(u.dias_vacaciones) || 22;
    const diasConvenioExtra = Number(u.dias_convenio) || 0;

    const diferenciaHoras = horasSegunHorario - horasConvenio;
    const horasPromedioDia = diasLaborables > 0 ? horasSegunHorario / diasLaborables : 0;
    const diasACompensar = horasPromedioDia > 0 ? Math.round(diferenciaHoras / horasPromedioDia) : 0;

    // Contar días de ausencia usados
    const diasVacacionesUsados = contarDiasAusencia(ausencias, "VACACIONES", anyo);
    const diasConvenioUsados = contarDiasAusencia(ausencias, "CONVENIO", anyo);

    resultados.push({
      id: u.id,
      nombre: u.nombre,
      username: u.username,
      nombre_convenio: u.nombre_convenio,
      horas_convenio: horasConvenio,
      dias_vacaciones_convenio: diasVacaciones,
      dias_convenio_extra: diasConvenioExtra,
      dias_laborables_anyo: diasLaborables,
      horas_segun_horario: Math.round(horasSegunHorario * 100) / 100,
      diferencia_horas: Math.round(diferenciaHoras * 100) / 100,
      dias_a_compensar: diasACompensar,
      dias_vacaciones_usados: diasVacacionesUsados,
      dias_convenio_usados: diasConvenioUsados,
      dias_vacaciones_pendientes: diasVacaciones - diasVacacionesUsados,
      dias_convenio_pendientes: diasConvenioExtra - diasConvenioUsados,
      horas_promedio_semanal: Math.round(horasPorSemana * 100) / 100,
    });
  }

  return resultados;
}

/**
 * Genera el calendario de un mes para un usuario específico o todos
 */
export async function generarCalendarioMes(
  anyo: number,
  mes: number,
  idUsuario?: number
): Promise<{ usuarios: Array<{ id: number; nombre: string; dias: DiaCalendario[] }> }> {
  // Obtener festivos (de gestio_db)
  const festivos: Festivo[] = await db("FestivosEmpresa")
    .where("Activo", 1)
    .andWhere(function () {
      this.where("Anyo", anyo).orWhere("Anual", true);
    });

  // Obtener usuarios (de gestio_master)
  let usuariosQuery = masterDb("usuarios").where("activo", true);
  if (idUsuario) {
    usuariosQuery = usuariosQuery.where("id", idUsuario);
  }
  const usuarios = await usuariosQuery.select("id", "nombre");

  const resultado: Array<{ id: number; nombre: string; dias: DiaCalendario[] }> = [];

  for (const u of usuarios) {
    // Obtener horario del usuario (de gestio_master)
    const horarios: HorarioDia[] = await masterDb("horarios_usuario")
      .where("id_usuario", u.id)
      .where("activo", true);

    // Obtener ausencias del mes (de gestio_master)
    const primerDiaMes = new Date(anyo, mes - 1, 1);
    const ultimoDiaMes = new Date(anyo, mes, 0);

    const ausencias: Ausencia[] = await masterDb("ausencias_usuario")
      .where("id_usuario", u.id)
      .where("activo", true)
      .where(function () {
        this.whereBetween("fecha_inicio", [primerDiaMes, ultimoDiaMes])
          .orWhereBetween("fecha_fin", [primerDiaMes, ultimoDiaMes])
          .orWhere(function () {
            this.where("fecha_inicio", "<=", primerDiaMes)
              .where("fecha_fin", ">=", ultimoDiaMes);
          });
      });

    // Crear mapa de horario
    const horarioMap = new Map<number, HorarioDia>();
    for (const h of horarios) {
      horarioMap.set(h.dia_semana, h);
    }

    const dias: DiaCalendario[] = [];

    // Iterar por todos los días del mes
    for (let d = new Date(primerDiaMes); d <= ultimoDiaMes; d.setDate(d.getDate() + 1)) {
      const fecha = new Date(d);
      const diaSemana = (fecha.getDay() + 6) % 7;
      const esFinDeSemana = diaSemana === 5 || diaSemana === 6; // Sábado o Domingo

      const horario = horarioMap.get(diaSemana);
      const festivo = esFechaFestivo(fecha, festivos, anyo);
      const ausencia = esFechaAusencia(fecha, ausencias);

      const horasTrabajo = horario && !festivo.esFestivo && !esFinDeSemana && !ausencia.esAusencia
        ? calcularHorasDia(horario.hora_inicio, horario.hora_fin, horario.minutos_descanso)
        : 0;

      const esLaborable = !esFinDeSemana && !festivo.esFestivo && horario?.hora_inicio !== null;

      dias.push({
        fecha: fecha.toISOString().split("T")[0],
        diaSemana,
        esFestivo: festivo.esFestivo,
        nombreFestivo: festivo.nombre,
        tipoFestivo: festivo.tipo,
        esFinDeSemana,
        esAusencia: ausencia.esAusencia,
        tipoAusencia: ausencia.tipo,
        horaInicio: horario?.hora_inicio || null,
        horaFin: horario?.hora_fin || null,
        minutosDescanso: horario?.minutos_descanso || 0,
        horasTrabajo,
        esLaborable,
      });
    }

    resultado.push({
      id: u.id,
      nombre: u.nombre,
      dias,
    });
  }

  return { usuarios: resultado };
}

/**
 * Obtiene el resumen de horas para un usuario específico
 */
export async function getResumenUsuario(idUsuario: number, anyo: number): Promise<ResumenUsuario | null> {
  const resultados = await calcularHorasAnuales(anyo);
  return resultados.find(r => r.id === idUsuario) || null;
}
