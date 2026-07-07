// src/controllers/controllersPersonalizados/verifactu.controllers.ts
import type { Request, Response, NextFunction } from "express";
import {
  getVeriFactuConfig,
  updateVeriFactuConfig,
  enviarFacturaVenta,
  enviarFacturaCompra,
  getVeriFactuLogs,
  getVeriFactuLogById,
  reintentarEnvio,
  getFacturasVentaPendientes,
  getFacturasCompraPendientes,
  testConexionAEAT,
} from "../../services/verifactu.service.js";

/**
 * GET /verifactu/config
 * Obtiene la configuracion de VeriFactu
 */
export async function getConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await getVeriFactuConfig();

    if (!config) {
      return res.json({
        modoActivo: false,
        envioAutomatico: false,
        ambienteAEAT: "PRUEBAS",
        certificadoNombre: null,
        certificadoExpiracion: null,
        nombreSIF: "OpticaGest",
        versionSIF: "1.0",
      });
    }

    res.json({
      modoActivo: config.ModoActivo,
      envioAutomatico: config.EnvioAutomatico,
      ambienteAEAT: config.AmbienteAEAT,
      certificadoNombre: config.CertificadoNombre,
      certificadoExpiracion: config.CertificadoExpiracion,
      nombreSIF: config.NombreSIF,
      versionSIF: config.VersionSIF,
      fechaModificacion: config.FechaModificacion,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /verifactu/config
 * Actualiza la configuracion de VeriFactu
 */
export async function putConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      modoActivo,
      envioAutomatico,
      ambienteAEAT,
      certificadoNombre,
      certificadoExpiracion,
      nombreSIF,
      versionSIF,
    } = req.body;

    // Validar ambiente
    if (ambienteAEAT && !["PRUEBAS", "PRODUCCION"].includes(ambienteAEAT)) {
      return res.status(400).json({ error: "Ambiente invalido. Use PRUEBAS o PRODUCCION" });
    }

    const config = await updateVeriFactuConfig({
      ModoActivo: modoActivo,
      EnvioAutomatico: envioAutomatico,
      AmbienteAEAT: ambienteAEAT,
      CertificadoNombre: certificadoNombre,
      CertificadoExpiracion: certificadoExpiracion ? new Date(certificadoExpiracion) : undefined,
      NombreSIF: nombreSIF,
      VersionSIF: versionSIF,
    });

    res.json({
      modoActivo: config.ModoActivo,
      envioAutomatico: config.EnvioAutomatico,
      ambienteAEAT: config.AmbienteAEAT,
      certificadoNombre: config.CertificadoNombre,
      certificadoExpiracion: config.CertificadoExpiracion,
      nombreSIF: config.NombreSIF,
      versionSIF: config.VersionSIF,
      fechaModificacion: config.FechaModificacion,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /verifactu/enviar/venta/:id
 * Envia una factura de venta a VeriFactu
 */
export async function enviarVenta(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de factura invalido" });
    }

    const log = await enviarFacturaVenta(id);

    res.json({
      success: log.EstadoEnvio === "ACEPTADO",
      idLog: log.IdLog,
      estadoEnvio: log.EstadoEnvio,
      csv: log.CSVRespuesta,
      mensaje: log.MensajeRespuestaAEAT || (log.EstadoEnvio === "ACEPTADO" ? "Factura enviada correctamente" : "Error en el envio"),
      huella: log.HuellaHash,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || "Error al enviar factura",
    });
  }
}

/**
 * POST /verifactu/enviar/compra/:id
 * Envia una factura de compra a VeriFactu
 */
export async function enviarCompra(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de factura invalido" });
    }

    const log = await enviarFacturaCompra(id);

    res.json({
      success: log.EstadoEnvio === "ACEPTADO",
      idLog: log.IdLog,
      estadoEnvio: log.EstadoEnvio,
      csv: log.CSVRespuesta,
      mensaje: log.MensajeRespuestaAEAT || (log.EstadoEnvio === "ACEPTADO" ? "Factura enviada correctamente" : "Error en el envio"),
      huella: log.HuellaHash,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || "Error al enviar factura",
    });
  }
}

/**
 * GET /verifactu/log
 * Obtiene el listado de logs con filtros
 */
export async function getLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const tipoDocumento = req.query.tipoDocumento as "FACTURA_VENTA" | "FACTURA_COMPRA" | undefined;
    const estadoEnvio = req.query.estadoEnvio as string | undefined;
    const desdeFecha = req.query.desdeFecha as string | undefined;
    const hastaFecha = req.query.hastaFecha as string | undefined;
    const pagina = Number(req.query.pagina) || 1;
    const porPagina = Number(req.query.porPagina) || 20;

    const { logs, total } = await getVeriFactuLogs({
      tipoDocumento,
      estadoEnvio,
      desdeFecha,
      hastaFecha,
      pagina,
      porPagina,
    });

    // Transformar a formato camelCase
    const logsTransformados = logs.map((log) => ({
      id: log.IdLog,
      tipoDocumento: log.TipoDocumento,
      idFactura: log.IdFactura,
      idFacturaCompra: log.IdFacturaCompra,
      serieFactura: log.SerieFactura,
      numeroFactura: log.NumeroFactura,
      tipoRegistro: log.TipoRegistro,
      huellaHash: log.HuellaHash,
      estadoEnvio: log.EstadoEnvio,
      fechaEnvio: log.FechaEnvio,
      intentoEnvio: log.IntentoEnvio,
      codigoRespuestaAEAT: log.CodigoRespuestaAEAT,
      mensajeRespuestaAEAT: log.MensajeRespuestaAEAT,
      csvRespuesta: log.CSVRespuesta,
      fechaRespuesta: log.FechaRespuesta,
      ultimoError: log.UltimoError,
      fechaCreacion: log.FechaCreacion,
    }));

    res.json({
      logs: logsTransformados,
      total,
      pagina,
      porPagina,
      totalPaginas: Math.ceil(total / porPagina),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /verifactu/log/:id
 * Obtiene el detalle de un log
 */
export async function getLogDetalle(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: "Id de log invalido" });
    }

    const log = await getVeriFactuLogById(id);

    if (!log) {
      return res.status(404).json({ error: "Log no encontrado" });
    }

    res.json({
      id: log.IdLog,
      tipoDocumento: log.TipoDocumento,
      idFactura: log.IdFactura,
      idFacturaCompra: log.IdFacturaCompra,
      serieFactura: log.SerieFactura,
      numeroFactura: log.NumeroFactura,
      tipoRegistro: log.TipoRegistro,
      huellaHash: log.HuellaHash,
      estadoEnvio: log.EstadoEnvio,
      fechaEnvio: log.FechaEnvio,
      intentoEnvio: log.IntentoEnvio,
      codigoRespuestaAEAT: log.CodigoRespuestaAEAT,
      mensajeRespuestaAEAT: log.MensajeRespuestaAEAT,
      csvRespuesta: log.CSVRespuesta,
      fechaRespuesta: log.FechaRespuesta,
      xmlEnviado: log.XMLEnviado,
      xmlRespuesta: log.XMLRespuesta,
      qrCodeData: log.QRCodeData,
      ultimoError: log.UltimoError,
      fechaCreacion: log.FechaCreacion,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /verifactu/reintentar/:idLog
 * Reintenta el envio de un registro fallido
 */
export async function reintentar(req: Request, res: Response, next: NextFunction) {
  try {
    const idLog = Number(req.params.idLog);
    if (!Number.isFinite(idLog) || idLog <= 0) {
      return res.status(400).json({ error: "Id de log invalido" });
    }

    const log = await reintentarEnvio(idLog);

    res.json({
      success: log.EstadoEnvio === "ACEPTADO",
      idLog: log.IdLog,
      estadoEnvio: log.EstadoEnvio,
      csv: log.CSVRespuesta,
      mensaje: log.MensajeRespuestaAEAT || (log.EstadoEnvio === "ACEPTADO" ? "Reenvio exitoso" : "Error en el reenvio"),
      intentos: log.IntentoEnvio,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || "Error al reintentar envio",
    });
  }
}

/**
 * GET /verifactu/pendientes
 * Obtiene facturas pendientes de enviar
 */
export async function getPendientes(req: Request, res: Response, next: NextFunction) {
  try {
    const tipo = req.query.tipo as string | undefined;

    let ventas: any[] = [];
    let compras: any[] = [];

    if (!tipo || tipo === "venta" || tipo === "todas") {
      ventas = await getFacturasVentaPendientes();
    }

    if (!tipo || tipo === "compra" || tipo === "todas") {
      compras = await getFacturasCompraPendientes();
    }

    res.json({
      ventas,
      compras,
      totalVentas: ventas.length,
      totalCompras: compras.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /verifactu/test-conexion
 * Prueba la conexion con AEAT
 */
export async function testConexion(req: Request, res: Response, next: NextFunction) {
  try {
    const resultado = await testConexionAEAT();

    res.json({
      success: resultado.success,
      mensaje: resultado.mensaje,
    });
  } catch (err: any) {
    res.json({
      success: false,
      mensaje: err.message || "Error al probar conexion",
    });
  }
}
