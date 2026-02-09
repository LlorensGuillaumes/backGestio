// src/controllers/controllersPersonalizados/revisiones.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

// Helper para obtener IdUsuario para auditoría (null para master)
function getUserId(req: Request): number | null {
  const userId = req.user?.userId;
  return typeof userId === "number" ? userId : null;
}

// Helper para limpiar valores: convierte "", undefined, null a null
// y para números, convierte strings vacíos o no numéricos a null
function clean(val: any): any {
  if (val === undefined || val === null || val === "") return null;
  return val;
}

function cleanNum(val: any): number | null {
  if (val === undefined || val === null || val === "") return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

// Formatea fecha a DD/MM/YYYY con padding de ceros
function formatDateDMY(date: Date | string | null): string | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return null;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Convierte DD/MM/YYYY o D/M/YYYY a Date para PostgreSQL
function parseDateDMY(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;

  const s = String(val).trim();
  if (!s) return null;

  // Si ya es formato ISO (YYYY-MM-DD), parsearlo directamente
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Formato DD/MM/YYYY o D/M/YYYY
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;

  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);

  const d = new Date(yyyy, mm - 1, dd);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * GET /revisiones-full/:id
 * Obtiene una revisión completa con todos sus datos relacionados
 */
export async function getRevisionFull(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de revisión inválido" });
    }

    // Revisión base
    const revision = await db("Revisiones")
      .where("IdRevision", id)
      .first();

    if (!revision) {
      return res.status(404).json({ error: "Revisión no encontrada" });
    }

    // Obtener datos relacionados en paralelo
    const [
      agudezaVisual,
      refraccionObjetiva,
      refraccionFinal,
      binocular,
      motilidadPupilas,
      saludOcular,
      queratometriaTopografia
    ] = await Promise.all([
      db("Rev_AgudezaVisual").where("IdRevision", id).first(),
      db("Rev_RefraccionObjetiva").where("IdRevision", id).first(),
      db("Rev_RefraccionFinal").where("IdRevision", id).first(),
      db("Rev_Binocular").where("IdRevision", id).first(),
      db("Rev_MotilidadPupilas").where("IdRevision", id).first(),
      db("Rev_SaludOcular").where("IdRevision", id).first(),
      db("Rev_QueratometriaTopografia").where("IdRevision", id).first()
    ]);

    // Mapear campos de revisión base a camelCase
    const revisionMapped = {
      id: revision.IdRevision,
      idCliente: revision.IdCliente,
      fecha: formatDateDMY(revision.FechaRevision),
      motivoConsulta: revision.MotivoConsulta,
      sintomas: revision.Sintomas,
      profesional: revision.Profesional,
      observaciones: revision.Observaciones,
    };

    // Mapear agudeza visual
    const agudezaVisualMapped = agudezaVisual ? [{
      id: agudezaVisual.IdAgudezaVisual,
      distancia: agudezaVisual.Distancia,
      odSin: agudezaVisual.OD_Sin,
      oiSin: agudezaVisual.OI_Sin,
      binSin: agudezaVisual.BIN_Sin,
      odCon: agudezaVisual.OD_Con,
      oiCon: agudezaVisual.OI_Con,
      binCon: agudezaVisual.BIN_Con,
    }] : [];

    // Mapear refracción objetiva
    const refraccionObjetivaMapped = refraccionObjetiva ? [{
      id: refraccionObjetiva.IdRefraccionObjetiva,
      metodo: refraccionObjetiva.Metodo,
      odEsf: refraccionObjetiva.OD_Esf,
      odCil: refraccionObjetiva.OD_Cil,
      odEje: refraccionObjetiva.OD_Eje,
      oiEsf: refraccionObjetiva.OI_Esf,
      oiCil: refraccionObjetiva.OI_Cil,
      oiEje: refraccionObjetiva.OI_Eje,
    }] : [];

    // Mapear refracción final
    const refraccionFinalMapped = refraccionFinal ? {
      id: refraccionFinal.IdRefraccionFinal,
      odEsf: refraccionFinal.OD_Esf,
      odCil: refraccionFinal.OD_Cil,
      odEje: refraccionFinal.OD_Eje,
      odAdd: refraccionFinal.OD_ADD,
      prismaOd: refraccionFinal.OD_Pr,
      baseOd: refraccionFinal.OD_Base,
      oiEsf: refraccionFinal.OI_Esf,
      oiCil: refraccionFinal.OI_Cil,
      oiEje: refraccionFinal.OI_Eje,
      oiAdd: refraccionFinal.OI_ADD,
      prismaOi: refraccionFinal.OI_Pr,
      baseOi: refraccionFinal.OI_Base,
    } : null;

    // Mapear binocular
    const binocularMapped = binocular ? {
      id: binocular.IdBinocular,
      coverLejos: binocular.CoverTest_Lejos,
      coverCerca: binocular.CoverTest_Cerca,
      convergencia: binocular.Convergencia,
      vergencias: binocular.Vergencias,
      estereopsis: binocular.Estereopsis,
      observaciones: binocular.DisparidadFijacion,
    } : null;

    // Mapear motilidad pupilas
    const motilidadPupilasMapped = motilidadPupilas ? {
      id: motilidadPupilas.IdMotilidadPupilas,
      motilidad: motilidadPupilas.Motilidad,
      pupilas: motilidadPupilas.Pupilas,
      observaciones: motilidadPupilas.Observaciones,
    } : null;

    // Mapear salud ocular
    const saludOcularMapped = saludOcular ? {
      id: saludOcular.IdSaludOcular,
      biomicroscopia: saludOcular.Biomicroscopia,
      fondoOjo: saludOcular.FondoOjo,
      iopOd: saludOcular.IOP_OD,
      iopOi: saludOcular.IOP_OI,
      iopMetodo: saludOcular.IOP_Metodo,
      campoVisual: saludOcular.CampoVisual_Resultado,
      observaciones: saludOcular.Observaciones,
    } : null;

    // Mapear queratometría topografía
    const queratoTopoMapped = queratometriaTopografia ? {
      id: queratometriaTopografia.IdQueratometriaTopografia,
      odK1: queratometriaTopografia.OD_K1,
      odK2: queratometriaTopografia.OD_K2,
      odEje: queratometriaTopografia.OD_Eje,
      oiK1: queratometriaTopografia.OI_K1,
      oiK2: queratometriaTopografia.OI_K2,
      oiEje: queratometriaTopografia.OI_Eje,
      observaciones: queratometriaTopografia.Notas,
    } : null;

    res.json({
      revision: {
        ...revisionMapped,
        agudezaVisual: agudezaVisualMapped,
        refraccionObjetiva: refraccionObjetivaMapped,
        refraccionFinal: refraccionFinalMapped,
        binocular: binocularMapped,
        motilidadPupilas: motilidadPupilasMapped,
        saludOcular: saludOcularMapped,
        queratometriaTopografia: queratoTopoMapped,
      }
    });
  } catch (err) {
    next(err);
  }
}

// Helper para mapear agudeza visual del frontend al formato de la BD
function mapAgudezaVisual(item: any) {
  return {
    Distancia: clean(item.distancia),
    OD_Sin: clean(item.odSin),
    OI_Sin: clean(item.oiSin),
    BIN_Sin: clean(item.binSin),
    OD_Con: clean(item.odCon),
    OI_Con: clean(item.oiCon),
    BIN_Con: clean(item.binCon),
  };
}

// Helper para mapear refraccion objetiva
function mapRefraccionObjetiva(item: any) {
  return {
    Metodo: clean(item.metodo),
    OD_Esf: cleanNum(item.odEsf),
    OD_Cil: cleanNum(item.odCil),
    OD_Eje: cleanNum(item.odEje),
    OI_Esf: cleanNum(item.oiEsf),
    OI_Cil: cleanNum(item.oiCil),
    OI_Eje: cleanNum(item.oiEje),
  };
}

// Helper para mapear refraccion final
function mapRefraccionFinal(item: any) {
  return {
    OD_Esf: cleanNum(item.odEsf),
    OD_Cil: cleanNum(item.odCil),
    OD_Eje: cleanNum(item.odEje),
    OD_ADD: cleanNum(item.odAdd),
    OD_Pr: cleanNum(item.odPr ?? item.prismaOd),
    OD_Base: clean(item.odBase ?? item.baseOd),
    OI_Esf: cleanNum(item.oiEsf),
    OI_Cil: cleanNum(item.oiCil),
    OI_Eje: cleanNum(item.oiEje),
    OI_ADD: cleanNum(item.oiAdd),
    OI_Pr: cleanNum(item.oiPr ?? item.prismaOi),
    OI_Base: clean(item.oiBase ?? item.baseOi),
  };
}

/**
 * POST /revisiones-full
 * Crea una revisión completa con todos sus datos relacionados
 */
export async function createRevisionFull(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body.input || req.body;
    console.log("createRevisionFull input:", JSON.stringify(input, null, 2));

    const trx = await db.transaction();

    try {
      // 1. Crear revisión base
      const idUsuario = getUserId(req);
      const revisionData = {
        IdCliente: input.idCliente,
        FechaRevision: parseDateDMY(input.fecha || input.fechaRevision) || new Date(),
        MotivoConsulta: input.motivoConsulta || null,
        Sintomas: input.sintomas || null,
        Profesional: input.profesional || null,
        Observaciones: input.observaciones || null,
        IdUsuario: idUsuario,
      };

      const [idRevision] = await trx("Revisiones").insert(revisionData).returning("IdRevision");
      const newId = typeof idRevision === "object" ? idRevision.IdRevision : idRevision;

      // 2. Insertar datos relacionados si existen
      // AgudezaVisual - puede ser array, tomamos el primero (la tabla solo permite 1 por revision)
      if (input.agudezaVisual) {
        const avData = Array.isArray(input.agudezaVisual) ? input.agudezaVisual[0] : input.agudezaVisual;
        if (avData) {
          await trx("Rev_AgudezaVisual").insert({ IdRevision: newId, ...mapAgudezaVisual(avData) });
        }
      }

      // RefraccionObjetiva - puede ser array, tomamos el primero
      if (input.refraccionObjetiva) {
        const roData = Array.isArray(input.refraccionObjetiva) ? input.refraccionObjetiva[0] : input.refraccionObjetiva;
        if (roData) {
          await trx("Rev_RefraccionObjetiva").insert({ IdRevision: newId, ...mapRefraccionObjetiva(roData) });
        }
      }

      // RefraccionFinal - objeto simple
      if (input.refraccionFinal && typeof input.refraccionFinal === "object" && !Array.isArray(input.refraccionFinal)) {
        await trx("Rev_RefraccionFinal").insert({ IdRevision: newId, ...mapRefraccionFinal(input.refraccionFinal) });
      }

      // Binocular
      if (input.binocular && typeof input.binocular === "object" && !Array.isArray(input.binocular)) {
        await trx("Rev_Binocular").insert({
          IdRevision: newId,
          CoverTest_Lejos: clean(input.binocular.coverTestLejos ?? input.binocular.coverLejos),
          CoverTest_Cerca: clean(input.binocular.coverTestCerca ?? input.binocular.coverCerca),
          Convergencia: clean(input.binocular.convergencia),
          Vergencias: clean(input.binocular.vergencias),
          Estereopsis: clean(input.binocular.estereopsis),
          DisparidadFijacion: clean(input.binocular.disparidadFijacion),
        });
      }

      // MotilidadPupilas
      if (input.motilidadPupilas && typeof input.motilidadPupilas === "object" && !Array.isArray(input.motilidadPupilas)) {
        await trx("Rev_MotilidadPupilas").insert({
          IdRevision: newId,
          Motilidad: clean(input.motilidadPupilas.motilidad),
          Pupilas: clean(input.motilidadPupilas.pupilas),
        });
      }

      // SaludOcular
      if (input.saludOcular && typeof input.saludOcular === "object" && !Array.isArray(input.saludOcular)) {
        await trx("Rev_SaludOcular").insert({
          IdRevision: newId,
          Biomicroscopia: clean(input.saludOcular.biomicroscopia),
          FondoOjo: clean(input.saludOcular.fondoOjo),
          IOP_OD: cleanNum(input.saludOcular.iopOd),
          IOP_OI: cleanNum(input.saludOcular.iopOi),
          IOP_Metodo: clean(input.saludOcular.iopMetodo),
          CampoVisual_Tipo: clean(input.saludOcular.campoVisualTipo),
          CampoVisual_Resultado: clean(input.saludOcular.campoVisualResultado ?? input.saludOcular.campoVisual),
        });
      }

      // QueratometriaTopografia
      if (input.queratometriaTopografia && typeof input.queratometriaTopografia === "object" && !Array.isArray(input.queratometriaTopografia)) {
        await trx("Rev_QueratometriaTopografia").insert({
          IdRevision: newId,
          OD_K1: cleanNum(input.queratometriaTopografia.odK1),
          OD_K2: cleanNum(input.queratometriaTopografia.odK2),
          OD_Eje: cleanNum(input.queratometriaTopografia.odEje),
          OI_K1: cleanNum(input.queratometriaTopografia.oiK1),
          OI_K2: cleanNum(input.queratometriaTopografia.oiK2),
          OI_Eje: cleanNum(input.queratometriaTopografia.oiEje),
          Notas: clean(input.queratometriaTopografia.notas ?? input.queratometriaTopografia.observaciones),
        });
      }

      await trx.commit();

      // Devolver la revisión creada completa
      req.params.id = String(newId);
      return getRevisionFull(req, res, next);
    } catch (err: any) {
      await trx.rollback();
      // Manejar errores de base de datos comunes
      if (err.code === '22003') {
        return res.status(400).json({
          error: "Valor numérico fuera de rango. Los valores deben estar entre -999.99 y 999.99"
        });
      }
      throw err;
    }
  } catch (err: any) {
    console.error("Error en createRevisionFull:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
}

/**
 * PUT /revisiones-full/:id
 * Actualiza una revisión completa
 */
export async function updateRevisionFull(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de revisión inválido" });
    }

    const input = req.body.input || req.body;

    const trx = await db.transaction();

    try {
      // 1. Actualizar revisión base
      const revisionData: Record<string, any> = {};
      if (input.motivoConsulta !== undefined) revisionData.MotivoConsulta = input.motivoConsulta;
      if (input.sintomas !== undefined) revisionData.Sintomas = input.sintomas;
      if (input.profesional !== undefined) revisionData.Profesional = input.profesional;
      if (input.observaciones !== undefined) revisionData.Observaciones = input.observaciones;
      if (input.fechaRevision !== undefined || input.fecha !== undefined) {
        revisionData.FechaRevision = parseDateDMY(input.fechaRevision || input.fecha);
      }

      if (Object.keys(revisionData).length > 0) {
        await trx("Revisiones").where("IdRevision", id).update(revisionData);
      }

      // 2. Actualizar/insertar datos relacionados (upsert)
      // AgudezaVisual
      if (input.agudezaVisual) {
        const avData = Array.isArray(input.agudezaVisual) ? input.agudezaVisual[0] : input.agudezaVisual;
        if (avData) {
          const mappedData = mapAgudezaVisual(avData);
          const exists = await trx("Rev_AgudezaVisual").where("IdRevision", id).first();
          if (exists) {
            await trx("Rev_AgudezaVisual").where("IdRevision", id).update(mappedData);
          } else {
            await trx("Rev_AgudezaVisual").insert({ IdRevision: id, ...mappedData });
          }
        }
      }

      // RefraccionObjetiva
      if (input.refraccionObjetiva) {
        const roData = Array.isArray(input.refraccionObjetiva) ? input.refraccionObjetiva[0] : input.refraccionObjetiva;
        if (roData) {
          const mappedData = mapRefraccionObjetiva(roData);
          const exists = await trx("Rev_RefraccionObjetiva").where("IdRevision", id).first();
          if (exists) {
            await trx("Rev_RefraccionObjetiva").where("IdRevision", id).update(mappedData);
          } else {
            await trx("Rev_RefraccionObjetiva").insert({ IdRevision: id, ...mappedData });
          }
        }
      }

      // RefraccionFinal
      if (input.refraccionFinal && typeof input.refraccionFinal === "object" && !Array.isArray(input.refraccionFinal)) {
        const mappedData = mapRefraccionFinal(input.refraccionFinal);
        const exists = await trx("Rev_RefraccionFinal").where("IdRevision", id).first();
        if (exists) {
          await trx("Rev_RefraccionFinal").where("IdRevision", id).update(mappedData);
        } else {
          await trx("Rev_RefraccionFinal").insert({ IdRevision: id, ...mappedData });
        }
      }

      // Binocular
      if (input.binocular && typeof input.binocular === "object" && !Array.isArray(input.binocular)) {
        const mappedData = {
          CoverTest_Lejos: clean(input.binocular.coverTestLejos ?? input.binocular.coverLejos),
          CoverTest_Cerca: clean(input.binocular.coverTestCerca ?? input.binocular.coverCerca),
          Convergencia: clean(input.binocular.convergencia),
          Vergencias: clean(input.binocular.vergencias),
          Estereopsis: clean(input.binocular.estereopsis),
          DisparidadFijacion: clean(input.binocular.disparidadFijacion),
        };
        const exists = await trx("Rev_Binocular").where("IdRevision", id).first();
        if (exists) {
          await trx("Rev_Binocular").where("IdRevision", id).update(mappedData);
        } else {
          await trx("Rev_Binocular").insert({ IdRevision: id, ...mappedData });
        }
      }

      // MotilidadPupilas
      if (input.motilidadPupilas && typeof input.motilidadPupilas === "object" && !Array.isArray(input.motilidadPupilas)) {
        const mappedData = {
          Motilidad: clean(input.motilidadPupilas.motilidad),
          Pupilas: clean(input.motilidadPupilas.pupilas),
        };
        const exists = await trx("Rev_MotilidadPupilas").where("IdRevision", id).first();
        if (exists) {
          await trx("Rev_MotilidadPupilas").where("IdRevision", id).update(mappedData);
        } else {
          await trx("Rev_MotilidadPupilas").insert({ IdRevision: id, ...mappedData });
        }
      }

      // SaludOcular
      if (input.saludOcular && typeof input.saludOcular === "object" && !Array.isArray(input.saludOcular)) {
        const mappedData = {
          Biomicroscopia: clean(input.saludOcular.biomicroscopia),
          FondoOjo: clean(input.saludOcular.fondoOjo),
          IOP_OD: cleanNum(input.saludOcular.iopOd),
          IOP_OI: cleanNum(input.saludOcular.iopOi),
          IOP_Metodo: clean(input.saludOcular.iopMetodo),
          CampoVisual_Tipo: clean(input.saludOcular.campoVisualTipo),
          CampoVisual_Resultado: clean(input.saludOcular.campoVisualResultado ?? input.saludOcular.campoVisual),
        };
        const exists = await trx("Rev_SaludOcular").where("IdRevision", id).first();
        if (exists) {
          await trx("Rev_SaludOcular").where("IdRevision", id).update(mappedData);
        } else {
          await trx("Rev_SaludOcular").insert({ IdRevision: id, ...mappedData });
        }
      }

      // QueratometriaTopografia
      if (input.queratometriaTopografia && typeof input.queratometriaTopografia === "object" && !Array.isArray(input.queratometriaTopografia)) {
        const mappedData = {
          OD_K1: cleanNum(input.queratometriaTopografia.odK1),
          OD_K2: cleanNum(input.queratometriaTopografia.odK2),
          OD_Eje: cleanNum(input.queratometriaTopografia.odEje),
          OI_K1: cleanNum(input.queratometriaTopografia.oiK1),
          OI_K2: cleanNum(input.queratometriaTopografia.oiK2),
          OI_Eje: cleanNum(input.queratometriaTopografia.oiEje),
          Notas: clean(input.queratometriaTopografia.notas ?? input.queratometriaTopografia.observaciones),
        };
        const exists = await trx("Rev_QueratometriaTopografia").where("IdRevision", id).first();
        if (exists) {
          await trx("Rev_QueratometriaTopografia").where("IdRevision", id).update(mappedData);
        } else {
          await trx("Rev_QueratometriaTopografia").insert({ IdRevision: id, ...mappedData });
        }
      }

      await trx.commit();

      // Devolver la revisión actualizada
      return getRevisionFull(req, res, next);
    } catch (err: any) {
      await trx.rollback();
      if (err.code === '22003') {
        return res.status(400).json({
          error: "Valor numérico fuera de rango. Los valores deben estar entre -999.99 y 999.99"
        });
      }
      throw err;
    }
  } catch (err: any) {
    console.error("Error en updateRevisionFull:", err);
    res.status(500).json({ error: err.message || "Error interno del servidor" });
  }
}

/**
 * DELETE /revisiones-full/:id
 * Elimina una revisión y todos sus datos relacionados
 */
export async function deleteRevisionFull(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de revisión inválido" });
    }

    // Verificar que existe
    const revision = await db("Revisiones").where("IdRevision", id).first();
    if (!revision) {
      return res.status(404).json({ error: "Revisión no encontrada" });
    }

    const trx = await db.transaction();

    try {
      // Eliminar datos relacionados primero (por las foreign keys)
      await trx("Rev_AgudezaVisual").where("IdRevision", id).del();
      await trx("Rev_RefraccionObjetiva").where("IdRevision", id).del();
      await trx("Rev_RefraccionFinal").where("IdRevision", id).del();
      await trx("Rev_Binocular").where("IdRevision", id).del();
      await trx("Rev_MotilidadPupilas").where("IdRevision", id).del();
      await trx("Rev_SaludOcular").where("IdRevision", id).del();
      await trx("Rev_QueratometriaTopografia").where("IdRevision", id).del();

      // Eliminar la revisión principal
      await trx("Revisiones").where("IdRevision", id).del();

      await trx.commit();

      res.json({ success: true, message: "Revisión eliminada correctamente" });
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /historia-clinica-full/:idCliente
 * Obtiene la historia clínica completa de un cliente
 */
export async function getHistoriaClinicaFull(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.params.idCliente);
    if (!Number.isFinite(idCliente) || idCliente <= 0) {
      return res.status(400).json({ error: "Id de cliente inválido" });
    }

    // Obtener datos en paralelo
    const [
      historiaClinica,
      antecedentes,
      medicacion,
      alergias,
      habitos,
      revisiones
    ] = await Promise.all([
      db("HistoriaClinicaCliente").where("IdCliente", idCliente).first(),
      db("HC_Antecedentes").where("IdCliente", idCliente).where("Activo", 1),
      db("HC_Medicacion").where("IdCliente", idCliente).where("Activo", 1),
      db("HC_Alergias").where("IdCliente", idCliente).where("Activo", 1),
      db("HC_Habitos").where("IdCliente", idCliente).first(),
      db("Revisiones").where("IdCliente", idCliente).orderBy("FechaRevision", "desc")
    ]);

    res.json({
      historiaClinica: historiaClinica || null,
      antecedentes: antecedentes || [],
      medicacion: medicacion || [],
      alergias: alergias || [],
      habitos: habitos || null,
      revisiones: revisiones || []
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /historia-clinica-full/:idCliente
 * Actualiza la historia clínica completa de un cliente
 */
export async function updateHistoriaClinicaFull(req: Request, res: Response, next: NextFunction) {
  try {
    const idCliente = Number(req.params.idCliente);
    if (!Number.isFinite(idCliente) || idCliente <= 0) {
      return res.status(400).json({ error: "Id de cliente inválido" });
    }

    const input = req.body.input || req.body;
    const trx = await db.transaction();

    try {
      // 1. Actualizar o crear HistoriaClinicaCliente
      if (input.historiaClinica !== undefined) {
        const exists = await trx("HistoriaClinicaCliente").where("IdCliente", idCliente).first();
        if (exists) {
          await trx("HistoriaClinicaCliente").where("IdCliente", idCliente).update({
            NotasGenerales: input.historiaClinica.notasGenerales ?? input.historiaClinica.NotasGenerales ?? null,
            FechaUltimaModificacion: new Date()
          });
        } else {
          await trx("HistoriaClinicaCliente").insert({
            IdCliente: idCliente,
            NotasGenerales: input.historiaClinica.notasGenerales ?? input.historiaClinica.NotasGenerales ?? null
          });
        }
      }

      // 2. Actualizar Antecedentes (replace strategy)
      if (input.antecedentes !== undefined) {
        // Marcar todos como inactivos
        await trx("HC_Antecedentes").where("IdCliente", idCliente).update({ Activo: 0 });

        // Insertar/actualizar los nuevos
        for (const ant of input.antecedentes) {
          if (ant.IdAntecedente || ant.id) {
            // Actualizar existente
            await trx("HC_Antecedentes").where("IdAntecedente", ant.IdAntecedente || ant.id).update({
              Tipo: ant.Tipo || ant.tipo || 'GENERAL',
              Descripcion: ant.Descripcion || ant.descripcion,
              FechaInicio: ant.FechaInicio || ant.fechaInicio || null,
              FechaFin: ant.FechaFin || ant.fechaFin || null,
              Activo: 1
            });
          } else {
            // Insertar nuevo
            await trx("HC_Antecedentes").insert({
              IdCliente: idCliente,
              Tipo: ant.Tipo || ant.tipo || 'GENERAL',
              Descripcion: ant.Descripcion || ant.descripcion,
              FechaInicio: ant.FechaInicio || ant.fechaInicio || null,
              FechaFin: ant.FechaFin || ant.fechaFin || null,
              Activo: 1
            });
          }
        }
      }

      // 3. Actualizar Medicación (replace strategy)
      if (input.medicacion !== undefined) {
        await trx("HC_Medicacion").where("IdCliente", idCliente).update({ Activo: 0 });

        for (const med of input.medicacion) {
          if (med.IdMedicacion || med.id) {
            await trx("HC_Medicacion").where("IdMedicacion", med.IdMedicacion || med.id).update({
              Medicamento: med.Medicamento || med.medicamento,
              Dosis: med.Dosis || med.dosis || null,
              Frecuencia: med.Frecuencia || med.frecuencia || null,
              FechaInicio: med.FechaInicio || med.fechaInicio || null,
              FechaFin: med.FechaFin || med.fechaFin || null,
              Activo: 1
            });
          } else {
            await trx("HC_Medicacion").insert({
              IdCliente: idCliente,
              Medicamento: med.Medicamento || med.medicamento,
              Dosis: med.Dosis || med.dosis || null,
              Frecuencia: med.Frecuencia || med.frecuencia || null,
              FechaInicio: med.FechaInicio || med.fechaInicio || null,
              FechaFin: med.FechaFin || med.fechaFin || null,
              Activo: 1
            });
          }
        }
      }

      // 4. Actualizar Alergias (replace strategy)
      if (input.alergias !== undefined) {
        await trx("HC_Alergias").where("IdCliente", idCliente).update({ Activo: 0 });

        for (const ale of input.alergias) {
          if (ale.IdAlergia || ale.id) {
            await trx("HC_Alergias").where("IdAlergia", ale.IdAlergia || ale.id).update({
              Sustancia: ale.Sustancia || ale.sustancia,
              Reaccion: ale.Reaccion || ale.reaccion || null,
              Activo: 1
            });
          } else {
            await trx("HC_Alergias").insert({
              IdCliente: idCliente,
              Sustancia: ale.Sustancia || ale.sustancia,
              Reaccion: ale.Reaccion || ale.reaccion || null,
              Activo: 1
            });
          }
        }
      }

      // 5. Actualizar o crear Hábitos
      if (input.habitos !== undefined) {
        const existsHabitos = await trx("HC_Habitos").where("IdCliente", idCliente).first();
        if (existsHabitos) {
          await trx("HC_Habitos").where("IdCliente", idCliente).update({
            Fumador: input.habitos.Fumador ?? input.habitos.fumador ?? 0,
            Observaciones: input.habitos.Observaciones ?? input.habitos.observaciones ?? null
          });
        } else {
          await trx("HC_Habitos").insert({
            IdCliente: idCliente,
            Fumador: input.habitos.Fumador ?? input.habitos.fumador ?? 0,
            Observaciones: input.habitos.Observaciones ?? input.habitos.observaciones ?? null
          });
        }
      }

      await trx.commit();

      // Devolver la historia clínica actualizada
      return getHistoriaClinicaFull(req, res, next);
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  } catch (err) {
    next(err);
  }
}
