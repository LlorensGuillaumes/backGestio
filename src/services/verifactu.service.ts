// src/services/verifactu.service.ts
import crypto from "crypto";
import db from "../db.js";

// =============================================
// TIPOS
// =============================================

export interface VeriFactuConfig {
  IdConfig: number;
  ModoActivo: boolean;
  EnvioAutomatico: boolean;
  AmbienteAEAT: "PRUEBAS" | "PRODUCCION";
  CertificadoNombre: string | null;
  CertificadoExpiracion: Date | null;
  NombreSIF: string;
  VersionSIF: string;
  UltimoHashVentas: string | null;
  UltimoHashCompras: string | null;
  FechaCreacion: Date;
  FechaModificacion: Date | null;
}

export interface VeriFactuLog {
  IdLog: number;
  TipoDocumento: "FACTURA_VENTA" | "FACTURA_COMPRA";
  IdFactura: number | null;
  IdFacturaCompra: number | null;
  SerieFactura: string | null;
  NumeroFactura: string | null;
  TipoRegistro: "ALTA" | "ANULACION";
  HuellaHash: string;
  EstadoEnvio: "PENDIENTE" | "ENVIADO" | "ACEPTADO" | "RECHAZADO" | "ERROR";
  FechaEnvio: Date | null;
  IntentoEnvio: number;
  CodigoRespuestaAEAT: string | null;
  MensajeRespuestaAEAT: string | null;
  CSVRespuesta: string | null;
  FechaRespuesta: Date | null;
  XMLEnviado: string | null;
  XMLRespuesta: string | null;
  QRCodeData: string | null;
  UltimoError: string | null;
  FechaCreacion: Date;
}

interface DatosFacturaVenta {
  IdFactura: number;
  Serie: string;
  Numero: number;
  FechaFactura: Date;
  TotalBaseImponible: number;
  TotalCuotaIva: number;
  TotalFactura: number;
  TipoFactura: string;
  Estado: string;
  CifEmisor?: string;
  NombreEmisor?: string;
}

interface DatosFacturaCompra {
  IdFacturaCompra: number;
  SerieFactura: string | null;
  NumeroFactura: string;
  FechaFactura: Date;
  TotalBaseImponible: number;
  TotalCuotaIva: number;
  TotalFactura: number;
  Estado: string;
  CifProveedor?: string;
  NombreProveedor?: string;
}

// =============================================
// CONFIGURACION
// =============================================

/**
 * Obtiene la configuracion de VeriFactu
 */
export async function getVeriFactuConfig(): Promise<VeriFactuConfig | null> {
  const config = await db("VeriFactuConfig").first();
  return config || null;
}

/**
 * Actualiza la configuracion de VeriFactu
 */
export async function updateVeriFactuConfig(data: Partial<VeriFactuConfig>): Promise<VeriFactuConfig> {
  const existingConfig = await db("VeriFactuConfig").first();

  const updateData: Record<string, any> = {
    FechaModificacion: new Date(),
  };

  if (data.ModoActivo !== undefined) updateData.ModoActivo = data.ModoActivo;
  if (data.EnvioAutomatico !== undefined) updateData.EnvioAutomatico = data.EnvioAutomatico;
  if (data.AmbienteAEAT !== undefined) updateData.AmbienteAEAT = data.AmbienteAEAT;
  if (data.CertificadoNombre !== undefined) updateData.CertificadoNombre = data.CertificadoNombre;
  if (data.CertificadoExpiracion !== undefined) updateData.CertificadoExpiracion = data.CertificadoExpiracion;
  if (data.NombreSIF !== undefined) updateData.NombreSIF = data.NombreSIF;
  if (data.VersionSIF !== undefined) updateData.VersionSIF = data.VersionSIF;

  if (existingConfig) {
    await db("VeriFactuConfig")
      .where("IdConfig", existingConfig.IdConfig)
      .update(updateData);
  } else {
    await db("VeriFactuConfig").insert({
      ...updateData,
      ModoActivo: data.ModoActivo ?? false,
      EnvioAutomatico: data.EnvioAutomatico ?? false,
      AmbienteAEAT: data.AmbienteAEAT ?? "PRUEBAS",
      FechaCreacion: new Date(),
    });
  }

  return (await getVeriFactuConfig())!;
}

// =============================================
// HASH SHA-256 (segun especificacion AEAT)
// =============================================

/**
 * Genera el hash SHA-256 para una factura segun especificacion VeriFactu AEAT
 * El hash se calcula sobre una cadena concatenada de campos clave
 */
export function calcularHashFactura(
  nifEmisor: string,
  numeroFactura: string,
  fechaFactura: Date,
  tipoFactura: string,
  cuotaTotal: number,
  importeTotal: number,
  hashAnterior: string | null
): string {
  // Formato fecha: YYYY-MM-DD
  const fechaStr = fechaFactura.toISOString().split("T")[0];

  // Cadena a hashear segun especificacion AEAT
  // NIF + NumSerieFactura + FechaExpedicion + TipoFactura + CuotaTotal + ImporteTotal + Huella anterior
  const cadena = [
    nifEmisor.toUpperCase().replace(/[^A-Z0-9]/g, ""),
    numeroFactura,
    fechaStr,
    tipoFactura,
    cuotaTotal.toFixed(2),
    importeTotal.toFixed(2),
    hashAnterior || ""
  ].join("|");

  // SHA-256 en base64
  const hash = crypto.createHash("sha256").update(cadena, "utf8").digest("hex");
  return hash;
}

/**
 * Obtiene el ultimo hash de la cadena de facturas
 */
async function getUltimoHash(tipo: "VENTAS" | "COMPRAS"): Promise<string | null> {
  const config = await getVeriFactuConfig();
  if (!config) return null;

  return tipo === "VENTAS" ? config.UltimoHashVentas : config.UltimoHashCompras;
}

/**
 * Actualiza el ultimo hash en la configuracion
 */
async function actualizarUltimoHash(tipo: "VENTAS" | "COMPRAS", hash: string): Promise<void> {
  const campo = tipo === "VENTAS" ? "UltimoHashVentas" : "UltimoHashCompras";
  await db("VeriFactuConfig").update({
    [campo]: hash,
    FechaModificacion: new Date(),
  });
}

// =============================================
// GENERACION XML
// =============================================

/**
 * Genera el XML para enviar a AEAT (estructura simplificada)
 * En produccion real se deberia usar una libreria de XML mas robusta
 */
export function generarXMLFacturaVenta(
  factura: DatosFacturaVenta,
  hash: string,
  empresa: { nif: string; nombre: string }
): string {
  const fechaStr = new Date(factura.FechaFactura).toISOString().split("T")[0];
  const fechaHoraStr = new Date().toISOString();

  // Estructura basica del XML VeriFactu
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:siiLR="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SusistroLR.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <siiLR:SuministroLRFacturasEmitidas>
      <siiLR:Cabecera>
        <siiLR:IDVersionSii>1.1</siiLR:IDVersionSii>
        <siiLR:Titular>
          <siiLR:NombreRazon>${escapeXml(empresa.nombre)}</siiLR:NombreRazon>
          <siiLR:NIF>${empresa.nif}</siiLR:NIF>
        </siiLR:Titular>
        <siiLR:TipoComunicacion>A0</siiLR:TipoComunicacion>
      </siiLR:Cabecera>
      <siiLR:RegistroLRFacturasEmitidas>
        <siiLR:PeriodoLiquidacion>
          <siiLR:Ejercicio>${new Date(factura.FechaFactura).getFullYear()}</siiLR:Ejercicio>
          <siiLR:Periodo>${String(new Date(factura.FechaFactura).getMonth() + 1).padStart(2, "0")}</siiLR:Periodo>
        </siiLR:PeriodoLiquidacion>
        <siiLR:IDFactura>
          <siiLR:IDEmisorFactura>
            <siiLR:NIF>${empresa.nif}</siiLR:NIF>
          </siiLR:IDEmisorFactura>
          <siiLR:NumSerieFacturaEmisor>${factura.Serie}-${factura.Numero}</siiLR:NumSerieFacturaEmisor>
          <siiLR:FechaExpedicionFacturaEmisor>${fechaStr}</siiLR:FechaExpedicionFacturaEmisor>
        </siiLR:IDFactura>
        <siiLR:FacturaExpedida>
          <siiLR:TipoFactura>${mapTipoFactura(factura.TipoFactura)}</siiLR:TipoFactura>
          <siiLR:DescripcionOperacion>Factura de venta</siiLR:DescripcionOperacion>
          <siiLR:ImporteTotal>${factura.TotalFactura.toFixed(2)}</siiLR:ImporteTotal>
          <siiLR:BaseImponibleACoste>${factura.TotalBaseImponible.toFixed(2)}</siiLR:BaseImponibleACoste>
          <siiLR:Huella>${hash}</siiLR:Huella>
          <siiLR:FechaHoraHusoGenRegistro>${fechaHoraStr}</siiLR:FechaHoraHusoGenRegistro>
        </siiLR:FacturaExpedida>
      </siiLR:RegistroLRFacturasEmitidas>
    </siiLR:SuministroLRFacturasEmitidas>
  </soapenv:Body>
</soapenv:Envelope>`;

  return xml;
}

/**
 * Genera el XML para facturas de compra
 */
export function generarXMLFacturaCompra(
  factura: DatosFacturaCompra,
  hash: string,
  empresa: { nif: string; nombre: string }
): string {
  const fechaStr = new Date(factura.FechaFactura).toISOString().split("T")[0];
  const fechaHoraStr = new Date().toISOString();
  const numeroCompleto = factura.SerieFactura
    ? `${factura.SerieFactura}-${factura.NumeroFactura}`
    : factura.NumeroFactura;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:siiLR="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroLR.xsd">
  <soapenv:Header/>
  <soapenv:Body>
    <siiLR:SuministroLRFacturasRecibidas>
      <siiLR:Cabecera>
        <siiLR:IDVersionSii>1.1</siiLR:IDVersionSii>
        <siiLR:Titular>
          <siiLR:NombreRazon>${escapeXml(empresa.nombre)}</siiLR:NombreRazon>
          <siiLR:NIF>${empresa.nif}</siiLR:NIF>
        </siiLR:Titular>
        <siiLR:TipoComunicacion>A0</siiLR:TipoComunicacion>
      </siiLR:Cabecera>
      <siiLR:RegistroLRFacturasRecibidas>
        <siiLR:PeriodoLiquidacion>
          <siiLR:Ejercicio>${new Date(factura.FechaFactura).getFullYear()}</siiLR:Ejercicio>
          <siiLR:Periodo>${String(new Date(factura.FechaFactura).getMonth() + 1).padStart(2, "0")}</siiLR:Periodo>
        </siiLR:PeriodoLiquidacion>
        <siiLR:IDFactura>
          <siiLR:IDEmisorFactura>
            <siiLR:NIF>${factura.CifProveedor || ""}</siiLR:NIF>
          </siiLR:IDEmisorFactura>
          <siiLR:NumSerieFacturaEmisor>${numeroCompleto}</siiLR:NumSerieFacturaEmisor>
          <siiLR:FechaExpedicionFacturaEmisor>${fechaStr}</siiLR:FechaExpedicionFacturaEmisor>
        </siiLR:IDFactura>
        <siiLR:FacturaRecibida>
          <siiLR:TipoFactura>F1</siiLR:TipoFactura>
          <siiLR:DescripcionOperacion>Factura de compra</siiLR:DescripcionOperacion>
          <siiLR:ImporteTotal>${factura.TotalFactura.toFixed(2)}</siiLR:ImporteTotal>
          <siiLR:BaseImponibleACoste>${factura.TotalBaseImponible.toFixed(2)}</siiLR:BaseImponibleACoste>
          <siiLR:Huella>${hash}</siiLR:Huella>
          <siiLR:FechaHoraHusoGenRegistro>${fechaHoraStr}</siiLR:FechaHoraHusoGenRegistro>
        </siiLR:FacturaRecibida>
      </siiLR:RegistroLRFacturasRecibidas>
    </siiLR:SuministroLRFacturasRecibidas>
  </soapenv:Body>
</soapenv:Envelope>`;

  return xml;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mapTipoFactura(tipo: string): string {
  switch (tipo) {
    case "NORMAL":
      return "F1";
    case "ANTICIPO":
      return "F1";
    case "FINAL":
      return "F1";
    case "RECTIFICATIVA":
      return "R1";
    default:
      return "F1";
  }
}

// =============================================
// ENVIO A AEAT
// =============================================

/**
 * Obtiene datos de la empresa para VeriFactu
 */
async function getDatosEmpresa(): Promise<{ nif: string; nombre: string }> {
  const empresa = await db("datos_empresa").first();
  return {
    nif: empresa?.cif || "",
    nombre: empresa?.nombre_empresa || "Empresa",
  };
}

/**
 * Simula el envio a AEAT (en entorno de pruebas)
 * En produccion se usaria HTTPS con certificado digital
 */
async function enviarAEAT(
  xml: string,
  ambiente: "PRUEBAS" | "PRODUCCION"
): Promise<{ success: boolean; codigo?: string; mensaje?: string; csv?: string; xmlRespuesta?: string }> {
  // URLs de AEAT (referencia)
  // Pruebas: https://www7.aeat.es/wlpl/TIKE-CONT/SuministroInformacion
  // Produccion: https://www1.agenciatributaria.gob.es/wlpl/TIKE-CONT/SuministroInformacion

  // Por ahora simulamos respuesta exitosa en entorno de pruebas
  if (ambiente === "PRUEBAS") {
    // Simular respuesta exitosa
    const csvSimulado = `CSV${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`;

    return {
      success: true,
      codigo: "0",
      mensaje: "Registro aceptado correctamente",
      csv: csvSimulado,
      xmlRespuesta: `<?xml version="1.0"?><Respuesta><EstadoEnvio>Correcto</EstadoEnvio><CSV>${csvSimulado}</CSV></Respuesta>`,
    };
  }

  // En produccion, aqui iria la llamada real con certificado
  // Por seguridad, solo permitimos envios reales cuando este implementado
  return {
    success: false,
    codigo: "ERR_NO_IMPLEMENTADO",
    mensaje: "Envio a produccion no implementado. Configure el certificado digital.",
  };
}

// =============================================
// FUNCIONES PRINCIPALES DE ENVIO
// =============================================

/**
 * Envia una factura de venta a VeriFactu
 */
export async function enviarFacturaVenta(idFactura: number): Promise<VeriFactuLog> {
  const config = await getVeriFactuConfig();
  if (!config?.ModoActivo) {
    throw new Error("VeriFactu no esta activo");
  }

  // Obtener datos de la factura
  const factura = await db("Facturas")
    .where("IdFactura", idFactura)
    .first() as DatosFacturaVenta;

  if (!factura) {
    throw new Error("Factura no encontrada");
  }

  if (factura.Estado === "ANULADA") {
    throw new Error("No se puede enviar una factura anulada");
  }

  // Verificar si ya fue enviada exitosamente
  const logExistente = await db("VeriFactuLog")
    .where("IdFactura", idFactura)
    .where("TipoRegistro", "ALTA")
    .where("EstadoEnvio", "ACEPTADO")
    .first();

  if (logExistente) {
    throw new Error("Esta factura ya fue enviada y aceptada por AEAT");
  }

  // Obtener datos de la empresa
  const empresa = await getDatosEmpresa();
  if (!empresa.nif) {
    throw new Error("No hay NIF de empresa configurado");
  }

  // Obtener ultimo hash de la cadena
  const hashAnterior = await getUltimoHash("VENTAS");

  // Calcular hash de la factura
  const numeroCompleto = `${factura.Serie}-${factura.Numero}`;
  const hash = calcularHashFactura(
    empresa.nif,
    numeroCompleto,
    new Date(factura.FechaFactura),
    mapTipoFactura(factura.TipoFactura),
    factura.TotalCuotaIva,
    factura.TotalFactura,
    hashAnterior
  );

  // Generar XML
  const xml = generarXMLFacturaVenta(factura, hash, empresa);

  // Crear registro de log inicial
  const [logCreado] = await db("VeriFactuLog")
    .insert({
      TipoDocumento: "FACTURA_VENTA",
      IdFactura: idFactura,
      SerieFactura: factura.Serie,
      NumeroFactura: String(factura.Numero),
      TipoRegistro: "ALTA",
      HuellaHash: hash,
      EstadoEnvio: "PENDIENTE",
      IntentoEnvio: 1,
      XMLEnviado: xml,
      FechaCreacion: new Date(),
    })
    .returning("*");

  try {
    // Actualizar estado de factura a PENDIENTE
    await db("Facturas")
      .where("IdFactura", idFactura)
      .update({ VeriFactuEstado: "PENDIENTE" });

    // Enviar a AEAT
    const respuesta = await enviarAEAT(xml, config.AmbienteAEAT);

    // Actualizar log con respuesta
    const estadoEnvio = respuesta.success ? "ACEPTADO" : "RECHAZADO";
    await db("VeriFactuLog")
      .where("IdLog", logCreado.IdLog)
      .update({
        EstadoEnvio: estadoEnvio,
        FechaEnvio: new Date(),
        CodigoRespuestaAEAT: respuesta.codigo,
        MensajeRespuestaAEAT: respuesta.mensaje,
        CSVRespuesta: respuesta.csv,
        FechaRespuesta: new Date(),
        XMLRespuesta: respuesta.xmlRespuesta,
      });

    // Actualizar factura
    await db("Facturas")
      .where("IdFactura", idFactura)
      .update({
        VeriFactuEstado: estadoEnvio,
        VeriFactuCSV: respuesta.csv || null,
      });

    // Si fue exitoso, actualizar hash de la cadena
    if (respuesta.success) {
      await actualizarUltimoHash("VENTAS", hash);
    }

    return (await db("VeriFactuLog").where("IdLog", logCreado.IdLog).first())!;
  } catch (error: any) {
    // Registrar error
    await db("VeriFactuLog")
      .where("IdLog", logCreado.IdLog)
      .update({
        EstadoEnvio: "ERROR",
        UltimoError: error.message || "Error desconocido",
      });

    await db("Facturas")
      .where("IdFactura", idFactura)
      .update({ VeriFactuEstado: "ERROR" });

    throw error;
  }
}

/**
 * Envia una factura de compra a VeriFactu
 */
export async function enviarFacturaCompra(idFacturaCompra: number): Promise<VeriFactuLog> {
  const config = await getVeriFactuConfig();
  if (!config?.ModoActivo) {
    throw new Error("VeriFactu no esta activo");
  }

  // Obtener datos de la factura
  const factura = await db("FacturasCompra as fc")
    .leftJoin("Proveedores as p", "p.IdProveedor", "fc.IdProveedor")
    .where("fc.IdFacturaCompra", idFacturaCompra)
    .select(
      "fc.*",
      "p.NIF as CifProveedor",
      "p.NombreComercial as NombreProveedor"
    )
    .first() as DatosFacturaCompra;

  if (!factura) {
    throw new Error("Factura de compra no encontrada");
  }

  if (factura.Estado === "ANULADA") {
    throw new Error("No se puede enviar una factura anulada");
  }

  // Verificar si ya fue enviada exitosamente
  const logExistente = await db("VeriFactuLog")
    .where("IdFacturaCompra", idFacturaCompra)
    .where("TipoRegistro", "ALTA")
    .where("EstadoEnvio", "ACEPTADO")
    .first();

  if (logExistente) {
    throw new Error("Esta factura ya fue enviada y aceptada por AEAT");
  }

  // Obtener datos de la empresa
  const empresa = await getDatosEmpresa();
  if (!empresa.nif) {
    throw new Error("No hay NIF de empresa configurado");
  }

  // Obtener ultimo hash de la cadena
  const hashAnterior = await getUltimoHash("COMPRAS");

  // Calcular hash de la factura
  const numeroCompleto = factura.SerieFactura
    ? `${factura.SerieFactura}-${factura.NumeroFactura}`
    : factura.NumeroFactura;

  const hash = calcularHashFactura(
    factura.CifProveedor || "",
    numeroCompleto,
    new Date(factura.FechaFactura),
    "F1",
    factura.TotalCuotaIva,
    factura.TotalFactura,
    hashAnterior
  );

  // Generar XML
  const xml = generarXMLFacturaCompra(factura, hash, empresa);

  // Crear registro de log inicial
  const [logCreado] = await db("VeriFactuLog")
    .insert({
      TipoDocumento: "FACTURA_COMPRA",
      IdFacturaCompra: idFacturaCompra,
      SerieFactura: factura.SerieFactura,
      NumeroFactura: factura.NumeroFactura,
      TipoRegistro: "ALTA",
      HuellaHash: hash,
      EstadoEnvio: "PENDIENTE",
      IntentoEnvio: 1,
      XMLEnviado: xml,
      FechaCreacion: new Date(),
    })
    .returning("*");

  try {
    // Actualizar estado de factura a PENDIENTE
    await db("FacturasCompra")
      .where("IdFacturaCompra", idFacturaCompra)
      .update({ VeriFactuEstado: "PENDIENTE" });

    // Enviar a AEAT
    const respuesta = await enviarAEAT(xml, config.AmbienteAEAT);

    // Actualizar log con respuesta
    const estadoEnvio = respuesta.success ? "ACEPTADO" : "RECHAZADO";
    await db("VeriFactuLog")
      .where("IdLog", logCreado.IdLog)
      .update({
        EstadoEnvio: estadoEnvio,
        FechaEnvio: new Date(),
        CodigoRespuestaAEAT: respuesta.codigo,
        MensajeRespuestaAEAT: respuesta.mensaje,
        CSVRespuesta: respuesta.csv,
        FechaRespuesta: new Date(),
        XMLRespuesta: respuesta.xmlRespuesta,
      });

    // Actualizar factura
    await db("FacturasCompra")
      .where("IdFacturaCompra", idFacturaCompra)
      .update({
        VeriFactuEstado: estadoEnvio,
        VeriFactuCSV: respuesta.csv || null,
      });

    // Si fue exitoso, actualizar hash de la cadena
    if (respuesta.success) {
      await actualizarUltimoHash("COMPRAS", hash);
    }

    return (await db("VeriFactuLog").where("IdLog", logCreado.IdLog).first())!;
  } catch (error: any) {
    // Registrar error
    await db("VeriFactuLog")
      .where("IdLog", logCreado.IdLog)
      .update({
        EstadoEnvio: "ERROR",
        UltimoError: error.message || "Error desconocido",
      });

    await db("FacturasCompra")
      .where("IdFacturaCompra", idFacturaCompra)
      .update({ VeriFactuEstado: "ERROR" });

    throw error;
  }
}

/**
 * Reintenta el envio de un log fallido
 */
export async function reintentarEnvio(idLog: number): Promise<VeriFactuLog> {
  const log = await db("VeriFactuLog").where("IdLog", idLog).first() as VeriFactuLog;

  if (!log) {
    throw new Error("Log no encontrado");
  }

  if (log.EstadoEnvio === "ACEPTADO") {
    throw new Error("Este registro ya fue aceptado");
  }

  // Incrementar contador de reintentos
  await db("VeriFactuLog")
    .where("IdLog", idLog)
    .update({
      IntentoEnvio: log.IntentoEnvio + 1,
      UltimoError: null,
    });

  // Reenviar segun tipo
  if (log.TipoDocumento === "FACTURA_VENTA" && log.IdFactura) {
    return enviarFacturaVenta(log.IdFactura);
  } else if (log.TipoDocumento === "FACTURA_COMPRA" && log.IdFacturaCompra) {
    return enviarFacturaCompra(log.IdFacturaCompra);
  }

  throw new Error("Tipo de documento no soportado para reintento");
}

// =============================================
// CONSULTAS
// =============================================

/**
 * Obtiene el log de VeriFactu con filtros
 */
export async function getVeriFactuLogs(opciones: {
  tipoDocumento?: "FACTURA_VENTA" | "FACTURA_COMPRA";
  estadoEnvio?: string;
  desdeFecha?: string;
  hastaFecha?: string;
  pagina?: number;
  porPagina?: number;
}): Promise<{ logs: VeriFactuLog[]; total: number }> {
  const pagina = opciones.pagina || 1;
  const porPagina = Math.min(opciones.porPagina || 20, 100);
  const offset = (pagina - 1) * porPagina;

  let query = db("VeriFactuLog");

  if (opciones.tipoDocumento) {
    query = query.where("TipoDocumento", opciones.tipoDocumento);
  }
  if (opciones.estadoEnvio) {
    query = query.where("EstadoEnvio", opciones.estadoEnvio);
  }
  if (opciones.desdeFecha) {
    query = query.where("FechaCreacion", ">=", opciones.desdeFecha);
  }
  if (opciones.hastaFecha) {
    query = query.where("FechaCreacion", "<=", opciones.hastaFecha);
  }

  const countResult = await query.clone().count("* as total").first();
  const total = Number((countResult as any)?.total ?? 0);

  const logs = await query
    .orderBy("FechaCreacion", "desc")
    .limit(porPagina)
    .offset(offset);

  return { logs, total };
}

/**
 * Obtiene un log por ID
 */
export async function getVeriFactuLogById(idLog: number): Promise<VeriFactuLog | null> {
  return db("VeriFactuLog").where("IdLog", idLog).first();
}

/**
 * Obtiene facturas de venta pendientes de enviar
 */
export async function getFacturasVentaPendientes(): Promise<any[]> {
  const facturas = await db("Facturas as f")
    .leftJoin("clientes as c", "c.id", "f.IdCliente")
    .leftJoin("cliente_persona as cp", "c.id", "cp.id_cliente")
    .leftJoin("cliente_empresa as ce", "c.id", "ce.id_cliente")
    .where("f.VeriFactuEstado", "NO_ENVIADA")
    .whereNot("f.Estado", "ANULADA")
    .select(
      "f.IdFactura as id",
      "f.Serie as serie",
      "f.Numero as numero",
      "f.FechaFactura as fechaFactura",
      "f.TotalFactura as totalFactura",
      "f.TipoFactura as tipoFactura",
      db.raw(`COALESCE(cp.nombre || ' ' || COALESCE(cp.primer_apellido, ''), ce.razon_social, c.nombre_comercial, 'Sin cliente') as "nombreCliente"`)
    )
    .orderBy("f.FechaFactura", "desc")
    .limit(100);

  return facturas;
}

/**
 * Obtiene facturas de compra pendientes de enviar
 */
export async function getFacturasCompraPendientes(): Promise<any[]> {
  const facturas = await db("FacturasCompra as fc")
    .leftJoin("Proveedores as p", "p.IdProveedor", "fc.IdProveedor")
    .where("fc.VeriFactuEstado", "NO_ENVIADA")
    .whereNot("fc.Estado", "ANULADA")
    .select(
      "fc.IdFacturaCompra as id",
      "fc.SerieFactura as serie",
      "fc.NumeroFactura as numero",
      "fc.FechaFactura as fechaFactura",
      "fc.TotalFactura as totalFactura",
      "p.NombreComercial as nombreProveedor"
    )
    .orderBy("fc.FechaFactura", "desc")
    .limit(100);

  return facturas;
}

/**
 * Prueba la conexion con AEAT
 */
export async function testConexionAEAT(): Promise<{ success: boolean; mensaje: string }> {
  const config = await getVeriFactuConfig();

  if (!config) {
    return { success: false, mensaje: "No hay configuracion de VeriFactu" };
  }

  if (config.AmbienteAEAT === "PRUEBAS") {
    // En pruebas siempre simulamos conexion exitosa
    return { success: true, mensaje: "Conexion simulada con entorno de pruebas AEAT correcta" };
  }

  // En produccion verificariamos certificado y conexion real
  if (!config.CertificadoNombre) {
    return { success: false, mensaje: "No hay certificado digital configurado para produccion" };
  }

  return { success: false, mensaje: "Conexion a produccion no implementada. Use entorno de pruebas." };
}
