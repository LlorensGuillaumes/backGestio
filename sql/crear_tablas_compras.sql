-- =============================================
-- MODULO DE COMPRAS - CREACION DE TABLAS
-- =============================================
-- Incluye: Ordenes de Compra, Recepciones, Facturas de Compra,
--          Devoluciones, Pagos a Proveedores, Familias de Gasto

-- =============================================
-- FAMILIAS Y SUBFAMILIAS DE GASTO
-- =============================================

CREATE TABLE IF NOT EXISTS "FamiliasGasto" (
    "IdFamiliaGasto" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(100) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SubFamiliasGasto" (
    "IdSubFamiliaGasto" SERIAL PRIMARY KEY,
    "IdFamiliaGasto" INT NOT NULL REFERENCES "FamiliasGasto"("IdFamiliaGasto"),
    "Descripcion" VARCHAR(100) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

-- =============================================
-- ORDENES DE COMPRA
-- =============================================

CREATE TABLE IF NOT EXISTS "ComprasOrdenes" (
    "IdOrdenCompra" SERIAL PRIMARY KEY,
    "NumeroOrden" VARCHAR(50),
    "IdProveedor" INT NOT NULL,
    "FechaOrden" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaEntregaPrevista" TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'BORRADOR', -- BORRADOR, ENVIADA, PARCIAL, RECIBIDA, ANULADA
    "Observaciones" TEXT,
    "ObservacionesInternas" TEXT,

    -- Totales
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalIva" DECIMAL(12, 2) DEFAULT 0,
    "TotalDescuento" DECIMAL(12, 2) DEFAULT 0,
    "Total" DECIMAL(12, 2) DEFAULT 0,

    -- Auditoria
    "CreadoPor" INT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ModificadoPor" INT,
    "FechaModificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ComprasOrdenesLineas" (
    "IdOrdenLinea" SERIAL PRIMARY KEY,
    "IdOrdenCompra" INT NOT NULL REFERENCES "ComprasOrdenes"("IdOrdenCompra") ON DELETE CASCADE,
    "Orden" INT DEFAULT 0,
    "IdProducto" INT,
    "Codigo" VARCHAR(50),
    "Descripcion" VARCHAR(500) NOT NULL,
    "CantidadPedida" DECIMAL(10, 2) DEFAULT 1,
    "CantidadRecibida" DECIMAL(10, 2) DEFAULT 0,
    "PrecioUnitario" DECIMAL(10, 4) DEFAULT 0,
    "Descuento" DECIMAL(5, 2) DEFAULT 0,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21,
    "Subtotal" DECIMAL(12, 2) DEFAULT 0,
    "EstadoLinea" VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, PARCIAL, RECIBIDA, ANULADA
    "Observaciones" TEXT
);

-- =============================================
-- RECEPCIONES DE COMPRA (ALBARANES DE ENTRADA)
-- =============================================

CREATE TABLE IF NOT EXISTS "ComprasRecepciones" (
    "IdRecepcionCompra" SERIAL PRIMARY KEY,
    "NumeroRecepcion" VARCHAR(50),
    "IdOrdenCompra" INT REFERENCES "ComprasOrdenes"("IdOrdenCompra"),
    "IdProveedor" INT NOT NULL,
    "NumeroAlbaranProveedor" VARCHAR(100),
    "FechaRecepcion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, FACTURADA, ANULADA
    "Observaciones" TEXT,

    -- Totales
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalIva" DECIMAL(12, 2) DEFAULT 0,
    "Total" DECIMAL(12, 2) DEFAULT 0,

    -- Auditoria
    "CreadoPor" INT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ModificadoPor" INT,
    "FechaModificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ComprasRecepcionesLineas" (
    "IdRecepcionLinea" SERIAL PRIMARY KEY,
    "IdRecepcionCompra" INT NOT NULL REFERENCES "ComprasRecepciones"("IdRecepcionCompra") ON DELETE CASCADE,
    "IdOrdenLinea" INT REFERENCES "ComprasOrdenesLineas"("IdOrdenLinea"),
    "Orden" INT DEFAULT 0,
    "IdProducto" INT,
    "Codigo" VARCHAR(50),
    "Descripcion" VARCHAR(500) NOT NULL,
    "CantidadRecibida" DECIMAL(10, 2) DEFAULT 1,
    "CantidadFacturada" DECIMAL(10, 2) DEFAULT 0,
    "PrecioUnitario" DECIMAL(10, 4) DEFAULT 0,
    "Descuento" DECIMAL(5, 2) DEFAULT 0,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21,
    "Subtotal" DECIMAL(12, 2) DEFAULT 0,
    "Observaciones" TEXT
);

-- =============================================
-- FACTURAS DE COMPRA
-- =============================================

CREATE TABLE IF NOT EXISTS "FacturasCompra" (
    "IdFacturaCompra" SERIAL PRIMARY KEY,
    "SerieFactura" VARCHAR(10),
    "NumeroFactura" VARCHAR(50) NOT NULL,
    "IdProveedor" INT NOT NULL,
    "FechaFactura" TIMESTAMP NOT NULL,
    "FechaRecepcion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaVencimiento" TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADA, PARCIAL, ANULADA
    "Observaciones" TEXT,

    -- Clasificacion de gasto
    "IdFamiliaGasto" INT REFERENCES "FamiliasGasto"("IdFamiliaGasto"),
    "IdSubFamiliaGasto" INT REFERENCES "SubFamiliasGasto"("IdSubFamiliaGasto"),

    -- Totales
    "TotalBaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalDescuento" DECIMAL(12, 2) DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12, 2) DEFAULT 0,
    "TotalRetencion" DECIMAL(12, 2) DEFAULT 0,
    "TotalFactura" DECIMAL(12, 2) DEFAULT 0,

    -- Control de pago
    "ImportePagado" DECIMAL(12, 2) DEFAULT 0,
    "ImportePendiente" DECIMAL(12, 2) DEFAULT 0,

    -- Auditoria
    "CreadoPor" INT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ModificadoPor" INT,
    "FechaModificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FacturasCompraLineas" (
    "IdFacturaCompraLinea" SERIAL PRIMARY KEY,
    "IdFacturaCompra" INT NOT NULL REFERENCES "FacturasCompra"("IdFacturaCompra") ON DELETE CASCADE,
    "Orden" INT DEFAULT 0,
    "IdProducto" INT,
    "CodigoItem" VARCHAR(50),
    "DescripcionItem" VARCHAR(500) NOT NULL,
    "Cantidad" DECIMAL(10, 2) DEFAULT 1,
    "PrecioUnitario" DECIMAL(10, 4) DEFAULT 0,
    "PcDescuento" DECIMAL(5, 2) DEFAULT 0,
    "ImporteDescuento" DECIMAL(12, 2) DEFAULT 0,
    "BaseImporte" DECIMAL(12, 2) DEFAULT 0,
    "PcIva" DECIMAL(5, 2) DEFAULT 21,
    "ImporteIva" DECIMAL(12, 2) DEFAULT 0,
    "ImporteLinea" DECIMAL(12, 2) DEFAULT 0,
    "Observaciones" TEXT
);

CREATE TABLE IF NOT EXISTS "FacturasCompraResumenIva" (
    "IdFacturaCompraIva" SERIAL PRIMARY KEY,
    "IdFacturaCompra" INT NOT NULL REFERENCES "FacturasCompra"("IdFacturaCompra") ON DELETE CASCADE,
    "PorcentajeIva" DECIMAL(5, 2) NOT NULL,
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "CuotaIva" DECIMAL(12, 2) DEFAULT 0
);

-- Relacion entre lineas de factura y lineas de recepcion
CREATE TABLE IF NOT EXISTS "FacturaCompraLineaRecepcionRel" (
    "IdFacturaCompraLinea" INT NOT NULL REFERENCES "FacturasCompraLineas"("IdFacturaCompraLinea") ON DELETE CASCADE,
    "IdRecepcionLinea" INT NOT NULL REFERENCES "ComprasRecepcionesLineas"("IdRecepcionLinea"),
    "CantidadFacturada" DECIMAL(10, 2) DEFAULT 0,
    PRIMARY KEY ("IdFacturaCompraLinea", "IdRecepcionLinea")
);

-- =============================================
-- PAGOS A PROVEEDORES
-- =============================================

CREATE TABLE IF NOT EXISTS "PagosProveedor" (
    "IdPagoProveedor" SERIAL PRIMARY KEY,
    "IdFacturaCompra" INT REFERENCES "FacturasCompra"("IdFacturaCompra"),
    "IdProveedor" INT NOT NULL,
    "FechaPago" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Importe" DECIMAL(12, 2) NOT NULL,
    "FormaPago" VARCHAR(50) DEFAULT 'TRANSFERENCIA', -- EFECTIVO, TRANSFERENCIA, CHEQUE, PAGARE
    "Referencia" VARCHAR(100),
    "NumeroCuenta" VARCHAR(50),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1
);

-- =============================================
-- DEVOLUCIONES DE COMPRA
-- =============================================

CREATE TABLE IF NOT EXISTS "ComprasDevoluciones" (
    "IdDevolucionCompra" SERIAL PRIMARY KEY,
    "NumeroDevolucion" VARCHAR(50),
    "IdProveedor" INT NOT NULL,
    "IdRecepcionCompra" INT REFERENCES "ComprasRecepciones"("IdRecepcionCompra"),
    "FechaDevolucion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE', -- PENDIENTE, ACEPTADA, ABONADA, ANULADA
    "MotivoDevolucion" TEXT,
    "Observaciones" TEXT,

    -- Totales
    "TotalDevolucion" DECIMAL(12, 2) DEFAULT 0,

    -- Auditoria
    "CreadoPor" INT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ComprasDevolucionesLineas" (
    "IdDevolucionLinea" SERIAL PRIMARY KEY,
    "IdDevolucionCompra" INT NOT NULL REFERENCES "ComprasDevoluciones"("IdDevolucionCompra") ON DELETE CASCADE,
    "IdRecepcionLinea" INT REFERENCES "ComprasRecepcionesLineas"("IdRecepcionLinea"),
    "IdProducto" INT,
    "Codigo" VARCHAR(50),
    "Descripcion" VARCHAR(500) NOT NULL,
    "CantidadDevuelta" DECIMAL(10, 2) DEFAULT 1,
    "PrecioUnitario" DECIMAL(10, 4) DEFAULT 0,
    "Subtotal" DECIMAL(12, 2) DEFAULT 0,
    "Observaciones" TEXT
);

-- Relacion devolucion con factura de abono
CREATE TABLE IF NOT EXISTS "DevolucionAbonoRel" (
    "IdDevolucionCompra" INT NOT NULL REFERENCES "ComprasDevoluciones"("IdDevolucionCompra"),
    "IdFacturaCompraAbono" INT NOT NULL REFERENCES "FacturasCompra"("IdFacturaCompra"),
    "FechaVinculo" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("IdDevolucionCompra", "IdFacturaCompraAbono")
);

-- =============================================
-- INDICES
-- =============================================

-- Ordenes de Compra
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_proveedor ON "ComprasOrdenes"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_fecha ON "ComprasOrdenes"("FechaOrden");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_estado ON "ComprasOrdenes"("Estado");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_numero ON "ComprasOrdenes"("NumeroOrden");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_lineas_orden ON "ComprasOrdenesLineas"("IdOrdenCompra");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_lineas_producto ON "ComprasOrdenesLineas"("IdProducto");

-- Recepciones
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_proveedor ON "ComprasRecepciones"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_orden ON "ComprasRecepciones"("IdOrdenCompra");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_fecha ON "ComprasRecepciones"("FechaRecepcion");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_estado ON "ComprasRecepciones"("Estado");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_lineas_recepcion ON "ComprasRecepcionesLineas"("IdRecepcionCompra");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_lineas_producto ON "ComprasRecepcionesLineas"("IdProducto");

-- Facturas de Compra
CREATE INDEX IF NOT EXISTS idx_facturas_compra_proveedor ON "FacturasCompra"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_fecha ON "FacturasCompra"("FechaFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_estado ON "FacturasCompra"("Estado");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_numero ON "FacturasCompra"("SerieFactura", "NumeroFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_lineas_factura ON "FacturasCompraLineas"("IdFacturaCompra");

-- Pagos
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_factura ON "PagosProveedor"("IdFacturaCompra");
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_proveedor ON "PagosProveedor"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_fecha ON "PagosProveedor"("FechaPago");

-- Devoluciones
CREATE INDEX IF NOT EXISTS idx_compras_devoluciones_proveedor ON "ComprasDevoluciones"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_compras_devoluciones_recepcion ON "ComprasDevoluciones"("IdRecepcionCompra");

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Familias de Gasto por defecto
INSERT INTO "FamiliasGasto" ("Descripcion", "Activa") VALUES
    ('Mercaderia', 1),
    ('Servicios', 1),
    ('Gastos Generales', 1),
    ('Equipamiento', 1)
ON CONFLICT DO NOTHING;

-- Subfamilias de Gasto por defecto
INSERT INTO "SubFamiliasGasto" ("IdFamiliaGasto", "Descripcion", "Activa")
SELECT f."IdFamiliaGasto", sf.descripcion, 1
FROM "FamiliasGasto" f
CROSS JOIN (VALUES
    ('Mercaderia', 'Lentes'),
    ('Mercaderia', 'Monturas'),
    ('Mercaderia', 'Accesorios'),
    ('Mercaderia', 'Lentes de Contacto'),
    ('Servicios', 'Mantenimiento'),
    ('Servicios', 'Asesoria'),
    ('Servicios', 'Publicidad'),
    ('Gastos Generales', 'Alquiler'),
    ('Gastos Generales', 'Suministros'),
    ('Gastos Generales', 'Seguros'),
    ('Equipamiento', 'Mobiliario'),
    ('Equipamiento', 'Instrumental')
) AS sf(familia, descripcion)
WHERE f."Descripcion" = sf.familia
ON CONFLICT DO NOTHING;
