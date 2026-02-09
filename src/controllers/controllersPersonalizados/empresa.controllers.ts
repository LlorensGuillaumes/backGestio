// src/controllers/controllersPersonalizados/empresa.controllers.ts
import type { Request, Response, NextFunction } from "express";
import db from "../../db.js";

/**
 * GET /empresa/datos
 * Obtiene los datos de la empresa (solo hay un registro)
 */
export async function getDatosEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    // Intentar obtener el registro existente
    let datos = await db("datos_empresa").first();

    // Si no existe, crear uno por defecto
    if (!datos) {
      const [nuevo] = await db("datos_empresa")
        .insert({
          nombre_empresa: "Mi Empresa",
          nombre_comercial: "",
          cif: "",
          direccion: "",
          codigo_postal: "",
          poblacion: "",
          provincia: "",
          pais: "España",
          telefono: "",
          email: "",
          web: "",
          logo_url: "",
          plazo_confirmacion_dias: 30,
          texto_pie_documento: "",
          fecha_creacion: new Date(),
        })
        .returning("*");
      datos = nuevo;
    }

    // Mapear a formato camelCase para el frontend
    const response = {
      IdDatosEmpresa: datos.id,
      NombreEmpresa: datos.nombre_empresa,
      NombreComercial: datos.nombre_comercial,
      CIF: datos.cif,
      Direccion: datos.direccion,
      CodigoPostal: datos.codigo_postal,
      Poblacion: datos.poblacion,
      Provincia: datos.provincia,
      Pais: datos.pais,
      Telefono: datos.telefono,
      Email: datos.email,
      Web: datos.web,
      LogoUrl: datos.logo_url,
      PlazoConfirmacionDias: datos.plazo_confirmacion_dias,
      TextoPieDocumento: datos.texto_pie_documento,
      FechaCreacion: datos.fecha_creacion,
      FechaModificacion: datos.fecha_modificacion,
    };

    res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /empresa/datos
 * Actualiza los datos de la empresa
 */
export async function putDatosEmpresa(req: Request, res: Response, next: NextFunction) {
  try {
    const input = req.body;

    // Verificar que existe
    const existente = await db("datos_empresa").first();

    // Mapeo de campos del frontend (PascalCase) a DB (snake_case)
    const fieldMapping: Record<string, string> = {
      NombreEmpresa: "nombre_empresa",
      NombreComercial: "nombre_comercial",
      CIF: "cif",
      Direccion: "direccion",
      CodigoPostal: "codigo_postal",
      Poblacion: "poblacion",
      Provincia: "provincia",
      Pais: "pais",
      Telefono: "telefono",
      Email: "email",
      Web: "web",
      LogoUrl: "logo_url",
      PlazoConfirmacionDias: "plazo_confirmacion_dias",
      TextoPieDocumento: "texto_pie_documento",
    };

    const datosActualizados: Record<string, any> = {
      fecha_modificacion: new Date(),
    };

    for (const [frontendField, dbField] of Object.entries(fieldMapping)) {
      if (input[frontendField] !== undefined) {
        datosActualizados[dbField] = input[frontendField];
      }
    }

    if (existente) {
      await db("datos_empresa")
        .where("id", existente.id)
        .update(datosActualizados);
    } else {
      // Crear si no existe
      await db("datos_empresa").insert({
        ...datosActualizados,
        fecha_creacion: new Date(),
      });
    }

    return getDatosEmpresa(req, res, next);
  } catch (err) {
    next(err);
  }
}
