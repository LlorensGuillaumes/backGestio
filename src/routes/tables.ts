import type { TableConfig } from "../crud/types.js";

export const tables: TableConfig[] = [
  // =========================
  // CLIENTES
  // =========================
  { path: "clientes", table: "clientes", pk: ["id"], deletePolicy: { mode: "soft", field: "activo", inactiveValue: 0 }, defaultFilters: { activo: 1 } },
  { path: "cliente-persona", table: "cliente_persona", pk: ["id_cliente"], deletePolicy: { mode: "forbid" } },
  { path: "cliente-empresa", table: "cliente_empresa", pk: ["id_cliente"], deletePolicy: { mode: "forbid" } },
  { path: "clientes-telefonos", table: "clientes_telefonos", pk: ["id"], deletePolicy: { mode: "hard" } },
  { path: "familias-clientes", table: "familias_clientes", pk: ["id"], deletePolicy: { mode: "soft", field: "activa", inactiveValue: 0 }, defaultFilters: { activa: 1 } },
  { path: "subfamilias-clientes", table: "subfamilias_clientes", pk: ["id"], deletePolicy: { mode: "soft", field: "activa", inactiveValue: 0 }, defaultFilters: { activa: 1 } },
  { path: "clientes-subfamilias", table: "clientes_subfamilias", pk: ["id_cliente", "id_subfamilia"], deletePolicy: { mode: "hard" } },

  { path: "acciones-tipo", table: "acciones_tipo", pk: ["id"], deletePolicy: { mode: "forbid" } },
  { path: "acciones-campo", table: "acciones_campo", pk: ["id"], deletePolicy: { mode: "forbid" } },
  { path: "subfamilias-acciones", table: "SubFamiliasAcciones", pk: ["IdAccion"], deletePolicy: { mode: "hard" } },
  { path: "subfamilias-clientes-acciones", table: "subfamilias_clientes_acciones", pk: ["id"], deletePolicy: { mode: "hard" } },

  // =========================
  // PROVEEDORES
  // =========================
  { path: "proveedores", table: "Proveedores", pk: ["IdProveedor"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "proveedor-persona", table: "ProveedorPersona", pk: ["IdProveedor"], deletePolicy: { mode: "forbid" } },
  { path: "proveedor-empresa", table: "ProveedorEmpresa", pk: ["IdProveedor"], deletePolicy: { mode: "forbid" } },
  { path: "proveedores-telefonos", table: "ProveedoresTelefonos", pk: ["IdTelefonoProveedor"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "proveedores-contactos", table: "ProveedoresContactos", pk: ["IdContactoProveedor"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  { path: "familias-proveedores", table: "FamiliasProveedores", pk: ["IdFamiliaProveedor"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "subfamilias-proveedores", table: "SubFamiliasProveedores", pk: ["IdSubFamiliaProveedor"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "proveedores-subfamilias", table: "ProveedoresSubFamilias", pk: ["IdProveedor", "IdSubFamiliaProveedor"], deletePolicy: { mode: "hard" } },

  // =========================
  // PRODUCTOS
  // =========================
  { path: "productos", table: "Productos", pk: ["IdProducto"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "marcas", table: "Marcas", pk: ["IdMarca"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "productos-proveedores", table: "ProductosProveedores", pk: ["IdProductoProveedor"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  { path: "iva-familias", table: "IvaFamilias", pk: ["IdIvaFamilia"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "iva-tipos", table: "IvaTipos", pk: ["IdIvaTipo"], deletePolicy: { mode: "forbid" } },

  { path: "familias-productos", table: "FamiliasProductos", pk: ["IdFamiliaProducto"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "subfamilias-productos", table: "SubFamiliasProductos", pk: ["IdSubFamiliaProducto"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "productos-subfamilias", table: "ProductosSubFamilias", pk: ["IdProducto", "IdSubFamiliaProducto"], deletePolicy: { mode: "hard" } },

  // =========================
  // SERVICIOS
  // =========================
  { path: "servicios", table: "Servicios", pk: ["IdServicio"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "familias-servicios", table: "FamiliasServicios", pk: ["IdFamiliaServicio"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "subfamilias-servicios", table: "SubFamiliasServicios", pk: ["IdSubFamiliaServicio"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "servicios-subfamilias", table: "ServiciosSubFamilias", pk: ["IdServicio", "IdSubFamiliaServicio"], deletePolicy: { mode: "hard" } },

  // =========================
  // TRATAMIENTOS
  // =========================
  { path: "tratamientos", table: "Tratamientos", pk: ["IdTratamiento"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "familias-tratamientos", table: "FamiliasTratamientos", pk: ["IdFamiliaTratamiento"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "subfamilias-tratamientos", table: "SubFamiliasTratamientos", pk: ["IdSubFamiliaTratamiento"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "tratamientos-subfamilias", table: "TratamientosSubFamilias", pk: ["IdTratamiento", "IdSubFamiliaTratamiento"], deletePolicy: { mode: "hard" } },

  // Compatibilidad (elige A o B según lo que hayas creado en tu BD)
  { path: "tratamientos-productos", table: "TratamientosProductos", pk: ["IdTratamiento", "IdProducto"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "tratamientos-por-subfamilia-producto", table: "TratamientosPorSubFamiliaProducto", pk: ["IdTratamiento", "IdSubFamiliaProducto"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  // Opcionales
  { path: "tratamientos-grupos", table: "TratamientosGrupos", pk: ["IdGrupo"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "tratamientos-grupo-rel", table: "TratamientosGrupoRel", pk: ["IdTratamiento", "IdGrupo"], deletePolicy: { mode: "hard" } },

  // =========================
  // DOCUMENTOS (PRESUPUESTOS/ENCARGOS)
  // =========================
  { path: "documentos", table: "Documentos", pk: ["IdDocumento"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "ANULADO" } },
  { path: "documentos-lineas", table: "DocumentosLineas", pk: ["IdLinea"], deletePolicy: { mode: "forbid" } },
  { path: "documentos-pagos", table: "DocumentosPagos", pk: ["IdPago"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "documentos-facturas-rel", table: "DocumentosFacturasRel", pk: ["IdDocumento", "IdFactura"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  // Opcionales
  { path: "revisiones-documentos-rel", table: "RevisionesDocumentosRel", pk: ["IdRevision", "IdDocumento"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "encargo-montaje", table: "EncargoMontaje", pk: ["IdEncargoMontaje"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  // =========================
  // FACTURAS (VENTA)
  // =========================
  { path: "facturas", table: "Facturas", pk: ["IdFactura"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "ANULADA" } },
  { path: "facturas-lineas", table: "FacturasLineas", pk: ["IdLineaFactura"], deletePolicy: { mode: "forbid" } },
  { path: "facturas-resumen-iva", table: "FacturasResumenIva", pk: ["IdFacturaIva"], deletePolicy: { mode: "forbid" } },
  { path: "facturas-pagos", table: "FacturasPagos", pk: ["IdPagoFactura"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  // Opcional
  { path: "facturas-rectifica-rel", table: "FacturasRectificaRel", pk: ["IdFacturaRectificativa", "IdFacturaOriginal"], deletePolicy: { mode: "forbid" } },

  // =========================
  // STOCK
  // =========================
  // Nota: productos-stock y movimientos-stock usan rutas personalizadas en stock.routes.ts
  // { path: "productos-stock", table: "ProductosStock", pk: ["IdProducto"], deletePolicy: { mode: "forbid" } },
  // { path: "movimientos-stock", table: "MovimientosStock", pk: ["IdMovimiento"], deletePolicy: { mode: "forbid" } },

  // =========================
  // CAJA
  // =========================
  { path: "caja-movimientos", table: "CajaMovimientos", pk: ["IdMovimiento"], deletePolicy: { mode: "hard" } },
  // modos-pago tiene controlador personalizado en modosPago.routes.ts

  // =========================
  // COMPRAS
  // =========================
  { path: "compras-ordenes", table: "ComprasOrdenes", pk: ["IdOrdenCompra"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "ANULADA" } },
  { path: "compras-ordenes-lineas", table: "ComprasOrdenesLineas", pk: ["IdOrdenLinea"], deletePolicy: { mode: "state", field: "EstadoLinea", canceledValue: "ANULADA" } },

  { path: "compras-recepciones", table: "ComprasRecepciones", pk: ["IdRecepcionCompra"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "ANULADA" } },
  { path: "compras-recepciones-lineas", table: "ComprasRecepcionesLineas", pk: ["IdRecepcionLinea"], deletePolicy: { mode: "forbid" } },

  { path: "facturas-compra", table: "FacturasCompra", pk: ["IdFacturaCompra"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "ANULADA" } },
  { path: "facturas-compra-lineas", table: "FacturasCompraLineas", pk: ["IdFacturaCompraLinea"], deletePolicy: { mode: "forbid" } },
  { path: "facturas-compra-resumen-iva", table: "FacturasCompraResumenIva", pk: ["IdFacturaCompraIva"], deletePolicy: { mode: "forbid" } },

  // Opcional (muchos-a-muchos)
  { path: "factura-compra-linea-recepcion-rel", table: "FacturaCompraLineaRecepcionRel", pk: ["IdFacturaCompraLinea", "IdRecepcionLinea"], deletePolicy: { mode: "forbid" } },

  { path: "pagos-proveedor", table: "PagosProveedor", pk: ["IdPagoProveedor"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  { path: "compras-devoluciones", table: "ComprasDevoluciones", pk: ["IdDevolucionCompra"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "ANULADA" } },
  { path: "compras-devoluciones-lineas", table: "ComprasDevolucionesLineas", pk: ["IdDevolucionLinea"], deletePolicy: { mode: "forbid" } },

  // Opcional
  { path: "devolucion-abono-rel", table: "DevolucionAbonoRel", pk: ["IdDevolucionCompra", "IdFacturaCompraAbono"], deletePolicy: { mode: "forbid" } },

  { path: "familias-gasto", table: "FamiliasGasto", pk: ["IdFamiliaGasto"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },
  { path: "subfamilias-gasto", table: "SubFamiliasGasto", pk: ["IdSubFamiliaGasto"], deletePolicy: { mode: "soft", field: "Activa", inactiveValue: 0 }, defaultFilters: { Activa: 1 } },

  // =========================
  // HISTORIAL CLÍNICO
  // =========================
  { path: "historia-clinica-cliente", table: "HistoriaClinicaCliente", pk: ["IdCliente"], deletePolicy: { mode: "forbid" } },
  { path: "hc-antecedentes", table: "HC_Antecedentes", pk: ["IdAntecedente"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "hc-medicacion", table: "HC_Medicacion", pk: ["IdMedicacion"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "hc-alergias", table: "HC_Alergias", pk: ["IdAlergia"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "hc-habitos", table: "HC_Habitos", pk: ["IdCliente"], deletePolicy: { mode: "forbid" } },

  // =========================
  // REVISIONES OPTOMÉTRICAS
  // =========================
  { path: "revisiones", table: "Revisiones", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-agudeza-visual", table: "Rev_AgudezaVisual", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-refraccion-objetiva", table: "Rev_RefraccionObjetiva", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-refraccion-final", table: "Rev_RefraccionFinal", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-binocular", table: "Rev_Binocular", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-motilidad-pupilas", table: "Rev_MotilidadPupilas", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-salud-ocular", table: "Rev_SaludOcular", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },
  { path: "rev-queratometria-topografia", table: "Rev_QueratometriaTopografia", pk: ["IdRevision"], deletePolicy: { mode: "forbid" } },

  // =========================
  // LENTES DE CONTACTO / ORTOK
  // =========================
  { path: "lc-adaptaciones", table: "LC_Adaptaciones", pk: ["IdLcAdaptacion"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "SUSPENDIDA" } },
  { path: "lc-lentes", table: "LC_Lentes", pk: ["IdLcLente"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
  { path: "lc-visitas", table: "LC_Visitas", pk: ["IdLcVisita"], deletePolicy: { mode: "forbid" } },
  { path: "lc-evaluacion", table: "LC_Evaluacion", pk: ["IdLcEvaluacion"], deletePolicy: { mode: "forbid" } },
  { path: "lc-plan", table: "LC_Plan", pk: ["IdLcPlan"], deletePolicy: { mode: "forbid" } },

  { path: "ortok-parametros-lente", table: "OrtoK_Parametros_Lente", pk: ["IdOrtoKParam"], deletePolicy: { mode: "forbid" } },
  { path: "ortok-evaluacion", table: "OrtoK_Evaluacion", pk: ["IdOrtoKEval"], deletePolicy: { mode: "forbid" } },

  // =========================
  // CONTROL DE MIOPÍA
  // =========================
  { path: "miopia-plan", table: "Miopia_Plan", pk: ["IdMiopiaPlan"], deletePolicy: { mode: "state", field: "Estado", canceledValue: "FINALIZADO" } },
  { path: "miopia-visitas", table: "Miopia_Visitas", pk: ["IdMiopiaVisita"], deletePolicy: { mode: "forbid" } },
  { path: "miopia-mediciones", table: "Miopia_Mediciones", pk: ["IdMiopiaMed"], deletePolicy: { mode: "forbid" } },
  { path: "miopia-decisiones", table: "Miopia_Decisiones", pk: ["IdMiopiaDecision"], deletePolicy: { mode: "forbid" } },

  // =========================
  // RECURSOS HUMANOS
  // =========================
  // NOTA: Convenios, horarios y ausencias ahora están en gestio_master (tabla usuarios)
  // Se acceden a través de /rrhh/* endpoints, no CRUD genérico
  { path: "festivos-empresa", table: "FestivosEmpresa", pk: ["IdFestivo"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },

  // =========================
  // AGENDA / CITAS
  // =========================
  { path: "citas", table: "Citas", pk: ["IdCita"], deletePolicy: { mode: "soft", field: "Activo", inactiveValue: 0 }, defaultFilters: { Activo: 1 } },
];
