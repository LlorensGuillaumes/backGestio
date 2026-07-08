-- =====================================================
-- NEON: gestio_db - SQL COMPLETO
-- Ejecutar en la DB: gestio_db
-- =====================================================

-- =====================================================
-- 1. CLIENTES (tabla base)
-- =====================================================

CREATE TABLE IF NOT EXISTS "clientes" (
    "id" SERIAL PRIMARY KEY,
    "tipo_cliente" VARCHAR(20) DEFAULT 'PERSONA',
    "documento_fiscal" VARCHAR(20),
    "nombre_comercial" VARCHAR(200),
    "es_factura_simplificada" BOOLEAN DEFAULT FALSE,
    "direccion" VARCHAR(300),
    "codigo_postal" VARCHAR(10),
    "poblacion" VARCHAR(100),
    "provincia" VARCHAR(100),
    "pais" VARCHAR(100) DEFAULT 'España',
    "email" VARCHAR(200),
    "telefono1" VARCHAR(30),
    "telefono2" VARCHAR(30),
    "iban" VARCHAR(50),
    "titular_cuenta" VARCHAR(200),
    "bic" VARCHAR(20),
    "observaciones" TEXT,
    "activo" SMALLINT DEFAULT 1,
    "fecha_alta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "fecha_modificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cliente_persona" (
    "id_cliente" INT PRIMARY KEY REFERENCES "clientes"("id") ON DELETE CASCADE,
    "nombre" VARCHAR(100),
    "apellido1" VARCHAR(100),
    "apellido2" VARCHAR(100),
    "fecha_nacimiento" DATE,
    "sexo" VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS "cliente_empresa" (
    "id_cliente" INT PRIMARY KEY REFERENCES "clientes"("id") ON DELETE CASCADE,
    "razon_social" VARCHAR(200),
    "nombre_comercial" VARCHAR(200),
    "persona_contacto" VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS "clientes_telefonos" (
    "id" SERIAL PRIMARY KEY,
    "id_cliente" INT NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE,
    "telefono" VARCHAR(30) NOT NULL,
    "extension" VARCHAR(10),
    "es_principal" BOOLEAN DEFAULT FALSE,
    "activo" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "familias_clientes" (
    "id" SERIAL PRIMARY KEY,
    "descripcion" VARCHAR(200) NOT NULL,
    "activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "subfamilias_clientes" (
    "id" SERIAL PRIMARY KEY,
    "id_familia" INT NOT NULL REFERENCES "familias_clientes"("id"),
    "descripcion" VARCHAR(200) NOT NULL,
    "prioridad" INT DEFAULT 0,
    "activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "clientes_subfamilias" (
    "id_cliente" INT NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE,
    "id_subfamilia" INT NOT NULL REFERENCES "subfamilias_clientes"("id"),
    PRIMARY KEY ("id_cliente", "id_subfamilia")
);

CREATE TABLE IF NOT EXISTS "acciones_tipo" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(100) NOT NULL,
    "descripcion" TEXT
);

CREATE TABLE IF NOT EXISTS "acciones_campo" (
    "id" SERIAL PRIMARY KEY,
    "id_accion_tipo" INT REFERENCES "acciones_tipo"("id"),
    "nombre" VARCHAR(100) NOT NULL,
    "tipo_dato" VARCHAR(50) DEFAULT 'TEXT'
);

CREATE TABLE IF NOT EXISTS "SubFamiliasAcciones" (
    "IdAccion" SERIAL PRIMARY KEY,
    "id_subfamilia" INT REFERENCES "subfamilias_clientes"("id"),
    "id_accion_tipo" INT REFERENCES "acciones_tipo"("id"),
    "activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "subfamilias_clientes_acciones" (
    "id" SERIAL PRIMARY KEY,
    "id_cliente" INT REFERENCES "clientes"("id") ON DELETE CASCADE,
    "id_subfamilia" INT,
    "id_accion_tipo" INT REFERENCES "acciones_tipo"("id"),
    "fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "datos" JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_clientes_activo ON "clientes"("activo");
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON "clientes"("documento_fiscal");
CREATE INDEX IF NOT EXISTS idx_clientes_telefonos_cliente ON "clientes_telefonos"("id_cliente");

-- =====================================================
-- 2. DATOS EMPRESA
-- =====================================================

CREATE TABLE IF NOT EXISTS datos_empresa (
    id SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(200) NOT NULL DEFAULT '',
    nombre_comercial VARCHAR(200) DEFAULT '',
    cif VARCHAR(20) DEFAULT '',
    direccion VARCHAR(300) DEFAULT '',
    codigo_postal VARCHAR(10) DEFAULT '',
    poblacion VARCHAR(100) DEFAULT '',
    provincia VARCHAR(100) DEFAULT '',
    pais VARCHAR(100) DEFAULT 'España',
    telefono VARCHAR(20) DEFAULT '',
    email VARCHAR(150) DEFAULT '',
    web VARCHAR(200) DEFAULT '',
    logo_url VARCHAR(500) DEFAULT '',
    plazo_confirmacion_dias INTEGER DEFAULT 30,
    texto_pie_documento TEXT DEFAULT '',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion TIMESTAMP
);

INSERT INTO datos_empresa (nombre_empresa, nombre_comercial, pais, plazo_confirmacion_dias)
SELECT 'Mi Empresa', '', 'España', 30
WHERE NOT EXISTS (SELECT 1 FROM datos_empresa);

-- =====================================================
-- 3. PROFESIONALES
-- =====================================================

CREATE TABLE IF NOT EXISTS "Profesionales" (
    "IdProfesional" SERIAL PRIMARY KEY,
    "NombreCompleto" VARCHAR(200) NOT NULL,
    "Especialidad" VARCHAR(100) NULL,
    "NumColegiado" VARCHAR(50) NULL,
    "IdUsuario" INTEGER,
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS "IX_Profesionales_NombreCompleto" ON "Profesionales"("NombreCompleto");
CREATE INDEX IF NOT EXISTS "IX_Profesionales_Activo" ON "Profesionales"("Activo");

-- =====================================================
-- 4. SERVICIOS
-- =====================================================

CREATE TABLE IF NOT EXISTS "FamiliasServicios" (
    "IdFamiliaServicio" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "IX_FamiliasServicios_Descripcion" ON "FamiliasServicios"("Descripcion");

CREATE TABLE IF NOT EXISTS "SubFamiliasServicios" (
    "IdSubFamiliaServicio" SERIAL PRIMARY KEY,
    "IdFamiliaServicio" INT NOT NULL REFERENCES "FamiliasServicios"("IdFamiliaServicio"),
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "IX_SubFamiliasServicios_Familia" ON "SubFamiliasServicios"("IdFamiliaServicio");

CREATE TABLE IF NOT EXISTS "Servicios" (
    "IdServicio" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(50),
    "Nombre" VARCHAR(300) NOT NULL,
    "Descripcion" TEXT,
    "PVP" DECIMAL(10, 2) DEFAULT 0,
    "PrecioCoste" DECIMAL(10, 2) DEFAULT 0,
    "IdTipoIva" INT,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21.00,
    "DuracionMinutos" INT DEFAULT 0,
    "RequiereCita" BOOLEAN DEFAULT FALSE,
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaAlta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ImporteMatricula" DECIMAL(10, 2) DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "IX_Servicios_Codigo" ON "Servicios"("Codigo");
CREATE INDEX IF NOT EXISTS "IX_Servicios_Nombre" ON "Servicios"("Nombre");
CREATE INDEX IF NOT EXISTS "IX_Servicios_Activo" ON "Servicios"("Activo");

CREATE TABLE IF NOT EXISTS "ServiciosSubFamilias" (
    "IdServicio" INT NOT NULL REFERENCES "Servicios"("IdServicio"),
    "IdSubFamiliaServicio" INT NOT NULL REFERENCES "SubFamiliasServicios"("IdSubFamiliaServicio"),
    PRIMARY KEY ("IdServicio", "IdSubFamiliaServicio")
);

-- =====================================================
-- 5. PROVEEDORES Y PRODUCTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS "FamiliasProveedores" (
    "IdFamiliaProveedor" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SubFamiliasProveedores" (
    "IdSubFamiliaProveedor" SERIAL PRIMARY KEY,
    "IdFamiliaProveedor" INT NOT NULL REFERENCES "FamiliasProveedores"("IdFamiliaProveedor"),
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Proveedores" (
    "IdProveedor" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(200) NOT NULL,
    "NombreComercial" VARCHAR(200),
    "NIF" VARCHAR(20),
    "Direccion" VARCHAR(300),
    "CodigoPostal" VARCHAR(10),
    "Poblacion" VARCHAR(100),
    "Provincia" VARCHAR(100),
    "Pais" VARCHAR(100),
    "Email" VARCHAR(200),
    "Web" VARCHAR(200),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaAlta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProveedoresTelefonos" (
    "IdTelefonoProveedor" SERIAL PRIMARY KEY,
    "IdProveedor" INT NOT NULL REFERENCES "Proveedores"("IdProveedor"),
    "Telefono" VARCHAR(30) NOT NULL,
    "Tipo" VARCHAR(50) DEFAULT 'Principal',
    "Activo" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "ProveedoresContactos" (
    "IdContactoProveedor" SERIAL PRIMARY KEY,
    "IdProveedor" INT NOT NULL REFERENCES "Proveedores"("IdProveedor"),
    "Nombre" VARCHAR(200) NOT NULL,
    "Cargo" VARCHAR(100),
    "Telefono" VARCHAR(30),
    "Email" VARCHAR(200),
    "Activo" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "ProveedoresSubFamilias" (
    "IdProveedor" INT NOT NULL REFERENCES "Proveedores"("IdProveedor"),
    "IdSubFamiliaProveedor" INT NOT NULL REFERENCES "SubFamiliasProveedores"("IdSubFamiliaProveedor"),
    PRIMARY KEY ("IdProveedor", "IdSubFamiliaProveedor")
);

CREATE TABLE IF NOT EXISTS "Marcas" (
    "IdMarca" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "FamiliasProductos" (
    "IdFamiliaProducto" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "SubFamiliasProductos" (
    "IdSubFamiliaProducto" SERIAL PRIMARY KEY,
    "IdFamiliaProducto" INT NOT NULL REFERENCES "FamiliasProductos"("IdFamiliaProducto"),
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Productos" (
    "IdProducto" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(50),
    "Nombre" VARCHAR(300) NOT NULL,
    "Descripcion" TEXT,
    "IdMarca" INT REFERENCES "Marcas"("IdMarca"),
    "PVP" DECIMAL(10, 2) DEFAULT 0,
    "PrecioCoste" DECIMAL(10, 2) DEFAULT 0,
    "IdTipoIva" INT,
    "Stock" INT DEFAULT 0,
    "StockMinimo" INT DEFAULT 0,
    "Ubicacion" VARCHAR(100),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaAlta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ProductosSubFamilias" (
    "IdProducto" INT NOT NULL REFERENCES "Productos"("IdProducto"),
    "IdSubFamiliaProducto" INT NOT NULL REFERENCES "SubFamiliasProductos"("IdSubFamiliaProducto"),
    PRIMARY KEY ("IdProducto", "IdSubFamiliaProducto")
);

CREATE TABLE IF NOT EXISTS "ProductosProveedores" (
    "IdProductoProveedor" SERIAL PRIMARY KEY,
    "IdProducto" INT NOT NULL REFERENCES "Productos"("IdProducto"),
    "IdProveedor" INT NOT NULL REFERENCES "Proveedores"("IdProveedor"),
    "ReferenciaProveedor" VARCHAR(100),
    "PrecioProveedor" DECIMAL(10, 2),
    "Activo" SMALLINT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON "Proveedores"("Nombre");
CREATE INDEX IF NOT EXISTS idx_proveedores_nif ON "Proveedores"("NIF");
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON "Productos"("Codigo");
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON "Productos"("Nombre");
CREATE INDEX IF NOT EXISTS idx_productos_marca ON "Productos"("IdMarca");

-- =====================================================
-- 6. DOCUMENTOS (PRESUPUESTOS/ENCARGOS)
-- =====================================================

CREATE TABLE IF NOT EXISTS "Documentos" (
    "IdDocumento" SERIAL PRIMARY KEY,
    "IdCliente" INT NOT NULL,
    "Tipo" VARCHAR(50) DEFAULT 'PRESUPUESTO',
    "NumeroDocumento" VARCHAR(50),
    "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaEntrega" TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE',
    "Observaciones" TEXT,
    "ObservacionesInternas" TEXT,
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalIva" DECIMAL(12, 2) DEFAULT 0,
    "TotalDescuento" DECIMAL(12, 2) DEFAULT 0,
    "Total" DECIMAL(12, 2) DEFAULT 0,
    "OD_Esfera" DECIMAL(5, 2),
    "OD_Cilindro" DECIMAL(5, 2),
    "OD_Eje" INT,
    "OD_Adicion" DECIMAL(5, 2),
    "OD_Prisma" DECIMAL(5, 2),
    "OD_BasePrisma" VARCHAR(20),
    "OD_AV" VARCHAR(20),
    "OD_DNP" DECIMAL(5, 2),
    "OD_Altura" DECIMAL(5, 2),
    "OI_Esfera" DECIMAL(5, 2),
    "OI_Cilindro" DECIMAL(5, 2),
    "OI_Eje" INT,
    "OI_Adicion" DECIMAL(5, 2),
    "OI_Prisma" DECIMAL(5, 2),
    "OI_BasePrisma" VARCHAR(20),
    "OI_AV" VARCHAR(20),
    "OI_DNP" DECIMAL(5, 2),
    "OI_Altura" DECIMAL(5, 2),
    "DIP_Lejos" DECIMAL(5, 2),
    "DIP_Cerca" DECIMAL(5, 2),
    "MonturaModelo" VARCHAR(255),
    "MonturaMarca" VARCHAR(100),
    "MonturaColor" VARCHAR(100),
    "MonturaTalla" VARCHAR(50),
    "MonturaPrecio" DECIMAL(10, 2),
    "LenteTipo" VARCHAR(100),
    "LenteMaterial" VARCHAR(100),
    "LenteTratamiento" VARCHAR(255),
    "LenteColoracion" VARCHAR(100),
    "ValidezDias" INT,
    "CreadoPor" INT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "ModificadoPor" INT,
    "FechaModificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "DocumentosLineas" (
    "IdLinea" SERIAL PRIMARY KEY,
    "IdDocumento" INT NOT NULL REFERENCES "Documentos"("IdDocumento") ON DELETE CASCADE,
    "Orden" INT DEFAULT 0,
    "Tipo" VARCHAR(50) DEFAULT 'PRODUCTO',
    "IdProducto" INT,
    "Codigo" VARCHAR(50),
    "Descripcion" VARCHAR(500) NOT NULL,
    "Cantidad" DECIMAL(10, 2) DEFAULT 1,
    "PrecioUnitario" DECIMAL(10, 2) DEFAULT 0,
    "Descuento" DECIMAL(5, 2) DEFAULT 0,
    "DescuentoImporte" DECIMAL(10, 2) DEFAULT 0,
    "IdTipoIva" INT DEFAULT 1,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21,
    "Subtotal" DECIMAL(12, 2) DEFAULT 0,
    "Observaciones" TEXT
);

CREATE TABLE IF NOT EXISTS "DocumentosPagos" (
    "IdPago" SERIAL PRIMARY KEY,
    "IdDocumento" INT NOT NULL REFERENCES "Documentos"("IdDocumento") ON DELETE CASCADE,
    "Fecha" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Importe" DECIMAL(12, 2) NOT NULL,
    "FormaPago" VARCHAR(50) DEFAULT 'EFECTIVO',
    "Referencia" VARCHAR(100),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "DocumentosFacturasRel" (
    "IdDocumento" INT NOT NULL REFERENCES "Documentos"("IdDocumento") ON DELETE CASCADE,
    "IdFactura" INT NOT NULL,
    "FechaVinculo" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Activo" SMALLINT DEFAULT 1,
    PRIMARY KEY ("IdDocumento", "IdFactura")
);

CREATE INDEX IF NOT EXISTS idx_documentos_cliente ON "Documentos"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_documentos_fecha ON "Documentos"("Fecha");
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON "Documentos"("Tipo");
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON "Documentos"("Estado");
CREATE INDEX IF NOT EXISTS idx_documentos_numero ON "Documentos"("NumeroDocumento");
CREATE INDEX IF NOT EXISTS idx_documentos_lineas_documento ON "DocumentosLineas"("IdDocumento");
CREATE INDEX IF NOT EXISTS idx_documentos_pagos_documento ON "DocumentosPagos"("IdDocumento");

-- =====================================================
-- 7. MODOS DE PAGO
-- =====================================================

CREATE TABLE IF NOT EXISTS "ModosPago" (
    "IdModoPago" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(100) NOT NULL UNIQUE,
    "UsaDatafono" BOOLEAN NOT NULL DEFAULT FALSE,
    "Activo" BOOLEAN NOT NULL DEFAULT TRUE,
    "Orden" INTEGER NOT NULL DEFAULT 0,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_modospago_orden ON "ModosPago" ("Orden", "Descripcion");

INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden") VALUES
    ('Efectivo', FALSE, TRUE, 1),
    ('Tarjeta de crédito', TRUE, TRUE, 2),
    ('Tarjeta de débito', TRUE, TRUE, 3),
    ('Bizum', FALSE, TRUE, 4),
    ('Transferencia bancaria', FALSE, TRUE, 5),
    ('Domiciliación bancaria', FALSE, TRUE, 6),
    ('Financiación', FALSE, TRUE, 7),
    ('Cheque', FALSE, TRUE, 8)
ON CONFLICT ("Descripcion") DO NOTHING;

-- =====================================================
-- 8. FACTURAS DE VENTA
-- =====================================================

CREATE TABLE IF NOT EXISTS "Facturas" (
    "IdFactura" SERIAL PRIMARY KEY,
    "Serie" VARCHAR(10) NOT NULL DEFAULT 'F',
    "Numero" INT NOT NULL,
    "FechaFactura" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "IdCliente" INT NOT NULL,
    "TipoFactura" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "IdDocumento" INT,
    "IdFacturaAnticipo" INT,
    "TotalBaseImponible" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "TotalFactura" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "EstadoFiscal" VARCHAR(20) NOT NULL DEFAULT 'EMITIDA',
    "EstadoCobro" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "Estado" VARCHAR(20) NOT NULL DEFAULT 'ACTIVA',
    "Observaciones" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP,
    UNIQUE("Serie", "Numero")
);

CREATE TABLE IF NOT EXISTS "FacturasLineas" (
    "IdLineaFactura" SERIAL PRIMARY KEY,
    "IdFactura" INT NOT NULL REFERENCES "Facturas"("IdFactura") ON DELETE CASCADE,
    "NumeroLinea" INT NOT NULL DEFAULT 1,
    "CodigoItem" VARCHAR(50),
    "DescripcionItem" VARCHAR(500) NOT NULL,
    "Cantidad" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "PrecioUnitario" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "BaseImporte" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "PcIva" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "ImporteIva" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "PcDescuento" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ImporteDescuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ImporteLinea" DECIMAL(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON "Facturas"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON "Facturas"("FechaFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_serie_numero ON "Facturas"("Serie", "Numero");
CREATE INDEX IF NOT EXISTS idx_facturas_tipo ON "Facturas"("TipoFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_documento ON "Facturas"("IdDocumento");
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON "Facturas"("Estado");
CREATE INDEX IF NOT EXISTS idx_facturas_lineas_factura ON "FacturasLineas"("IdFactura");

ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "IdFacturaAnticipo" INT;
ALTER TABLE "Documentos" ADD COLUMN IF NOT EXISTS "IdFacturaFinal" INT;

-- =====================================================
-- 9. CAJA
-- =====================================================

CREATE TABLE IF NOT EXISTS "CajaMovimientos" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "Fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "Tipo" VARCHAR(20) NOT NULL,
    "IdModoPago" INT REFERENCES "ModosPago"("IdModoPago"),
    "Concepto" VARCHAR(500) NOT NULL,
    "Importe" DECIMAL(12,2) NOT NULL,
    "IdFactura" INT REFERENCES "Facturas"("IdFactura"),
    "IdDocumento" INT,
    "IdCliente" INT,
    "Referencia" VARCHAR(100),
    "Observaciones" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "UsuarioCreacion" VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_caja_fecha ON "CajaMovimientos"("Fecha");
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON "CajaMovimientos"("Tipo");
CREATE INDEX IF NOT EXISTS idx_caja_factura ON "CajaMovimientos"("IdFactura");
CREATE INDEX IF NOT EXISTS idx_caja_cliente ON "CajaMovimientos"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_caja_modopago ON "CajaMovimientos"("IdModoPago");

-- =====================================================
-- 10. COMPRAS
-- =====================================================

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

CREATE TABLE IF NOT EXISTS "ComprasOrdenes" (
    "IdOrdenCompra" SERIAL PRIMARY KEY,
    "NumeroOrden" VARCHAR(50),
    "IdProveedor" INT NOT NULL,
    "FechaOrden" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaEntregaPrevista" TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'BORRADOR',
    "Observaciones" TEXT,
    "ObservacionesInternas" TEXT,
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalIva" DECIMAL(12, 2) DEFAULT 0,
    "TotalDescuento" DECIMAL(12, 2) DEFAULT 0,
    "Total" DECIMAL(12, 2) DEFAULT 0,
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
    "EstadoLinea" VARCHAR(50) DEFAULT 'PENDIENTE',
    "Observaciones" TEXT
);

CREATE TABLE IF NOT EXISTS "ComprasRecepciones" (
    "IdRecepcionCompra" SERIAL PRIMARY KEY,
    "NumeroRecepcion" VARCHAR(50),
    "IdOrdenCompra" INT REFERENCES "ComprasOrdenes"("IdOrdenCompra"),
    "IdProveedor" INT NOT NULL,
    "NumeroAlbaranProveedor" VARCHAR(100),
    "FechaRecepcion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE',
    "Observaciones" TEXT,
    "BaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalIva" DECIMAL(12, 2) DEFAULT 0,
    "Total" DECIMAL(12, 2) DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS "FacturasCompra" (
    "IdFacturaCompra" SERIAL PRIMARY KEY,
    "SerieFactura" VARCHAR(10),
    "NumeroFactura" VARCHAR(50) NOT NULL,
    "IdProveedor" INT NOT NULL,
    "FechaFactura" TIMESTAMP NOT NULL,
    "FechaRecepcion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaVencimiento" TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE',
    "Observaciones" TEXT,
    "IdFamiliaGasto" INT REFERENCES "FamiliasGasto"("IdFamiliaGasto"),
    "IdSubFamiliaGasto" INT REFERENCES "SubFamiliasGasto"("IdSubFamiliaGasto"),
    "TotalBaseImponible" DECIMAL(12, 2) DEFAULT 0,
    "TotalDescuento" DECIMAL(12, 2) DEFAULT 0,
    "TotalCuotaIva" DECIMAL(12, 2) DEFAULT 0,
    "TotalRetencion" DECIMAL(12, 2) DEFAULT 0,
    "TotalFactura" DECIMAL(12, 2) DEFAULT 0,
    "ImportePagado" DECIMAL(12, 2) DEFAULT 0,
    "ImportePendiente" DECIMAL(12, 2) DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS "FacturaCompraLineaRecepcionRel" (
    "IdFacturaCompraLinea" INT NOT NULL REFERENCES "FacturasCompraLineas"("IdFacturaCompraLinea") ON DELETE CASCADE,
    "IdRecepcionLinea" INT NOT NULL REFERENCES "ComprasRecepcionesLineas"("IdRecepcionLinea"),
    "CantidadFacturada" DECIMAL(10, 2) DEFAULT 0,
    PRIMARY KEY ("IdFacturaCompraLinea", "IdRecepcionLinea")
);

CREATE TABLE IF NOT EXISTS "PagosProveedor" (
    "IdPagoProveedor" SERIAL PRIMARY KEY,
    "IdFacturaCompra" INT REFERENCES "FacturasCompra"("IdFacturaCompra"),
    "IdProveedor" INT NOT NULL,
    "FechaPago" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Importe" DECIMAL(12, 2) NOT NULL,
    "FormaPago" VARCHAR(50) DEFAULT 'TRANSFERENCIA',
    "Referencia" VARCHAR(100),
    "NumeroCuenta" VARCHAR(50),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "ComprasDevoluciones" (
    "IdDevolucionCompra" SERIAL PRIMARY KEY,
    "NumeroDevolucion" VARCHAR(50),
    "IdProveedor" INT NOT NULL,
    "IdRecepcionCompra" INT REFERENCES "ComprasRecepciones"("IdRecepcionCompra"),
    "FechaDevolucion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Estado" VARCHAR(50) DEFAULT 'PENDIENTE',
    "MotivoDevolucion" TEXT,
    "Observaciones" TEXT,
    "TotalDevolucion" DECIMAL(12, 2) DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS "DevolucionAbonoRel" (
    "IdDevolucionCompra" INT NOT NULL REFERENCES "ComprasDevoluciones"("IdDevolucionCompra"),
    "IdFacturaCompraAbono" INT NOT NULL REFERENCES "FacturasCompra"("IdFacturaCompra"),
    "FechaVinculo" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("IdDevolucionCompra", "IdFacturaCompraAbono")
);

CREATE INDEX IF NOT EXISTS idx_compras_ordenes_proveedor ON "ComprasOrdenes"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_fecha ON "ComprasOrdenes"("FechaOrden");
CREATE INDEX IF NOT EXISTS idx_compras_ordenes_estado ON "ComprasOrdenes"("Estado");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_proveedor ON "ComprasRecepciones"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_compras_recepciones_orden ON "ComprasRecepciones"("IdOrdenCompra");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_proveedor ON "FacturasCompra"("IdProveedor");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_fecha ON "FacturasCompra"("FechaFactura");
CREATE INDEX IF NOT EXISTS idx_facturas_compra_estado ON "FacturasCompra"("Estado");
CREATE INDEX IF NOT EXISTS idx_pagos_proveedor_factura ON "PagosProveedor"("IdFacturaCompra");

INSERT INTO "FamiliasGasto" ("Descripcion", "Activa") VALUES
    ('Mercaderia', 1),
    ('Servicios', 1),
    ('Gastos Generales', 1),
    ('Equipamiento', 1)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. AGENDA / CITAS
-- =====================================================

CREATE TABLE IF NOT EXISTS "Citas" (
    "IdCita" SERIAL PRIMARY KEY,
    "IdCliente" INT REFERENCES "clientes"("id"),
    "NombreContacto" VARCHAR(200),
    "TelefonoContacto" VARCHAR(50),
    "EmailContacto" VARCHAR(200),
    "FechaHoraInicio" TIMESTAMP NOT NULL,
    "FechaHoraFin" TIMESTAMP NOT NULL,
    "TodoElDia" BOOLEAN DEFAULT FALSE,
    "MotivoVisita" VARCHAR(200),
    "TipoCita" VARCHAR(50) DEFAULT 'GENERAL',
    "Observaciones" TEXT,
    "Estado" VARCHAR(30) DEFAULT 'PROGRAMADA',
    "IdProfesional" INT,
    "Color" VARCHAR(20) DEFAULT '#3b82f6',
    "Recordatorio" BOOLEAN DEFAULT FALSE,
    "MinutosRecordatorio" INT DEFAULT 60,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT NOW(),
    "FechaModificacion" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_citas_fecha" ON "Citas"("FechaHoraInicio", "FechaHoraFin");
CREATE INDEX IF NOT EXISTS "idx_citas_cliente" ON "Citas"("IdCliente");
CREATE INDEX IF NOT EXISTS "idx_citas_profesional" ON "Citas"("IdProfesional");
CREATE INDEX IF NOT EXISTS "idx_citas_estado" ON "Citas"("Estado");
CREATE INDEX IF NOT EXISTS "idx_citas_activo" ON "Citas"("Activo");

-- =====================================================
-- 12. HISTORIAL CLINICO Y REVISIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS "HistoriaClinicaCliente" (
  "IdCliente" INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE RESTRICT,
  "NotasGenerales" TEXT,
  "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "FechaUltimaModificacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "HC_Antecedentes" (
  "IdAntecedente" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "Tipo" VARCHAR(50) DEFAULT 'GENERAL',
  "Descripcion" TEXT,
  "FechaInicio" DATE,
  "FechaFin" DATE,
  "Activo" INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "HC_Medicacion" (
  "IdMedicacion" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "Medicamento" VARCHAR(255),
  "Dosis" VARCHAR(100),
  "Frecuencia" VARCHAR(100),
  "FechaInicio" DATE,
  "FechaFin" DATE,
  "Activo" INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "HC_Alergias" (
  "IdAlergia" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "Sustancia" VARCHAR(255),
  "Reaccion" TEXT,
  "Activo" INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "HC_Habitos" (
  "IdCliente" INTEGER PRIMARY KEY REFERENCES clientes(id) ON DELETE RESTRICT,
  "Fumador" INTEGER DEFAULT 0,
  "Observaciones" TEXT
);

CREATE TABLE IF NOT EXISTS "Revisiones" (
  "IdRevision" SERIAL PRIMARY KEY,
  "IdCliente" INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
  "FechaRevision" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "MotivoConsulta" TEXT,
  "Sintomas" TEXT,
  "Observaciones" TEXT,
  "Profesional" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "Rev_AgudezaVisual" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "OD_Sin" VARCHAR(20), "OI_Sin" VARCHAR(20), "BIN_Sin" VARCHAR(20),
  "OD_Con" VARCHAR(20), "OI_Con" VARCHAR(20), "BIN_Con" VARCHAR(20),
  "Distancia" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "Rev_RefraccionObjetiva" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "OD_Esf" DECIMAL(5,2), "OD_Cil" DECIMAL(5,2), "OD_Eje" INTEGER,
  "OI_Esf" DECIMAL(5,2), "OI_Cil" DECIMAL(5,2), "OI_Eje" INTEGER,
  "Metodo" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "Rev_RefraccionFinal" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "OD_Esf" DECIMAL(5,2), "OD_Cil" DECIMAL(5,2), "OD_Eje" INTEGER,
  "OD_ADD" DECIMAL(5,2), "OD_Pr" DECIMAL(5,2), "OD_Base" VARCHAR(20),
  "OI_Esf" DECIMAL(5,2), "OI_Cil" DECIMAL(5,2), "OI_Eje" INTEGER,
  "OI_ADD" DECIMAL(5,2), "OI_Pr" DECIMAL(5,2), "OI_Base" VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS "Rev_Binocular" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "CoverTest_Lejos" TEXT, "CoverTest_Cerca" TEXT,
  "Convergencia" TEXT, "Vergencias" TEXT,
  "Estereopsis" TEXT, "DisparidadFijacion" TEXT
);

CREATE TABLE IF NOT EXISTS "Rev_MotilidadPupilas" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "Motilidad" TEXT, "Pupilas" TEXT
);

CREATE TABLE IF NOT EXISTS "Rev_SaludOcular" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "Biomicroscopia" TEXT, "FondoOjo" TEXT,
  "IOP_OD" DECIMAL(5,2), "IOP_OI" DECIMAL(5,2), "IOP_Metodo" VARCHAR(100),
  "CampoVisual_Tipo" VARCHAR(100), "CampoVisual_Resultado" TEXT
);

CREATE TABLE IF NOT EXISTS "Rev_QueratometriaTopografia" (
  "IdRevision" INTEGER PRIMARY KEY REFERENCES "Revisiones"("IdRevision") ON DELETE CASCADE,
  "OD_K1" DECIMAL(5,2), "OD_K2" DECIMAL(5,2), "OD_Eje" INTEGER,
  "OI_K1" DECIMAL(5,2), "OI_K2" DECIMAL(5,2), "OI_Eje" INTEGER,
  "Notas" TEXT
);

CREATE TABLE IF NOT EXISTS "RevisionesDocumentosRel" (
  "IdRevision" INTEGER NOT NULL REFERENCES "Revisiones"("IdRevision") ON DELETE RESTRICT,
  "IdDocumento" INTEGER NOT NULL,
  "TipoRelacion" VARCHAR(50) DEFAULT 'GENERA',
  "FechaVinculo" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "Activo" INTEGER DEFAULT 1,
  PRIMARY KEY ("IdRevision", "IdDocumento")
);

CREATE TABLE IF NOT EXISTS "EncargoMontaje" (
  "IdEncargoMontaje" SERIAL PRIMARY KEY,
  "IdDocumento" INTEGER NOT NULL,
  "FechaMedicion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "DIP_Lejos" DECIMAL(5,2), "DIP_Cerca" DECIMAL(5,2),
  "AlturaPupilar_OD" DECIMAL(5,2), "AlturaPupilar_OI" DECIMAL(5,2),
  "AlturaMontaje" DECIMAL(5,2), "DistanciaVertice" DECIMAL(5,2),
  "AnguloPantoscopico" DECIMAL(5,2), "Inclinacion" DECIMAL(5,2),
  "MonturaModelo" VARCHAR(255), "MonturaTalla" VARCHAR(50),
  "Observaciones" TEXT, "Activo" INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_revisiones_cliente ON "Revisiones"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_revisiones_fecha ON "Revisiones"("FechaRevision");
CREATE INDEX IF NOT EXISTS idx_hc_antecedentes_cliente ON "HC_Antecedentes"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_hc_medicacion_cliente ON "HC_Medicacion"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_hc_alergias_cliente ON "HC_Alergias"("IdCliente");
CREATE INDEX IF NOT EXISTS idx_encargomontaje_documento ON "EncargoMontaje"("IdDocumento");

-- =====================================================
-- 13. MOVIMIENTOS DE STOCK
-- =====================================================

CREATE TABLE IF NOT EXISTS "MovimientosStock" (
    "IdMovimiento" SERIAL PRIMARY KEY,
    "IdProducto" INT NOT NULL REFERENCES "Productos"("IdProducto"),
    "TipoMovimiento" VARCHAR(20) NOT NULL,
    "Cantidad" INT NOT NULL,
    "StockAnterior" INT NOT NULL,
    "StockPosterior" INT NOT NULL,
    "FechaMovimiento" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "IdDocumentoOrigen" INT NULL,
    "TipoDocumentoOrigen" VARCHAR(50) NULL,
    "Observaciones" TEXT NULL,
    "IdUsuario" INT NULL,
    "CreadoEn" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_movimientos_stock_producto" ON "MovimientosStock"("IdProducto");
CREATE INDEX IF NOT EXISTS "idx_movimientos_stock_fecha" ON "MovimientosStock"("FechaMovimiento");
CREATE INDEX IF NOT EXISTS "idx_movimientos_stock_tipo" ON "MovimientosStock"("TipoMovimiento");

-- =====================================================
-- 14. VERIFACTU (AEAT)
-- =====================================================

CREATE TABLE IF NOT EXISTS "VeriFactuConfig" (
    "IdConfig" SERIAL PRIMARY KEY,
    "ModoActivo" BOOLEAN NOT NULL DEFAULT FALSE,
    "EnvioAutomatico" BOOLEAN NOT NULL DEFAULT FALSE,
    "AmbienteAEAT" VARCHAR(20) NOT NULL DEFAULT 'PRUEBAS',
    "CertificadoNombre" VARCHAR(200),
    "CertificadoExpiracion" TIMESTAMP,
    "NombreSIF" VARCHAR(100) DEFAULT 'OpticaGest',
    "VersionSIF" VARCHAR(20) DEFAULT '1.0',
    "UltimoHashVentas" VARCHAR(64),
    "UltimoHashCompras" VARCHAR(64),
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP
);

INSERT INTO "VeriFactuConfig" ("ModoActivo", "EnvioAutomatico", "AmbienteAEAT")
SELECT FALSE, FALSE, 'PRUEBAS'
WHERE NOT EXISTS (SELECT 1 FROM "VeriFactuConfig");

CREATE TABLE IF NOT EXISTS "VeriFactuLog" (
    "IdLog" SERIAL PRIMARY KEY,
    "TipoDocumento" VARCHAR(20) NOT NULL,
    "IdFactura" INT,
    "IdFacturaCompra" INT,
    "SerieFactura" VARCHAR(10),
    "NumeroFactura" VARCHAR(50),
    "TipoRegistro" VARCHAR(20) NOT NULL,
    "HuellaHash" VARCHAR(64) NOT NULL,
    "EstadoEnvio" VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    "FechaEnvio" TIMESTAMP,
    "IntentoEnvio" INT DEFAULT 0,
    "CodigoRespuestaAEAT" VARCHAR(20),
    "MensajeRespuestaAEAT" TEXT,
    "CSVRespuesta" VARCHAR(50),
    "FechaRespuesta" TIMESTAMP,
    "XMLEnviado" TEXT,
    "XMLRespuesta" TEXT,
    "QRCodeData" TEXT,
    "UltimoError" TEXT,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_verifactu_log_factura ON "VeriFactuLog"("IdFactura");
CREATE INDEX IF NOT EXISTS idx_verifactu_log_factura_compra ON "VeriFactuLog"("IdFacturaCompra");
CREATE INDEX IF NOT EXISTS idx_verifactu_log_estado ON "VeriFactuLog"("EstadoEnvio");

ALTER TABLE "Facturas" ADD COLUMN IF NOT EXISTS "VeriFactuEstado" VARCHAR(20) DEFAULT 'NO_ENVIADA';
ALTER TABLE "Facturas" ADD COLUMN IF NOT EXISTS "VeriFactuCSV" VARCHAR(50);
ALTER TABLE "FacturasCompra" ADD COLUMN IF NOT EXISTS "VeriFactuEstado" VARCHAR(20) DEFAULT 'NO_ENVIADA';
ALTER TABLE "FacturasCompra" ADD COLUMN IF NOT EXISTS "VeriFactuCSV" VARCHAR(50);

-- =====================================================
-- 15. FESTIVOS EMPRESA
-- =====================================================

CREATE TABLE IF NOT EXISTS "FestivosEmpresa" (
    "IdFestivo" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "FechaInicio" DATE NOT NULL,
    "FechaFin" DATE NOT NULL,
    "Anyo" INT NOT NULL,
    "Tipo" VARCHAR(50) DEFAULT 'FESTIVO',
    "Activo" BOOLEAN DEFAULT TRUE,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_festivos_fecha" ON "FestivosEmpresa"("FechaInicio", "FechaFin");
CREATE INDEX IF NOT EXISTS "idx_festivos_anyo" ON "FestivosEmpresa"("Anyo");

-- =====================================================
-- 16. CONTACTOS
-- =====================================================

CREATE TABLE IF NOT EXISTS "Contactos" (
    "IdContacto" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(100) NOT NULL,
    "Apellido1" VARCHAR(100),
    "Apellido2" VARCHAR(100),
    "Dni" VARCHAR(20),
    "Telefono" VARCHAR(30),
    "Email" VARCHAR(200),
    "Direccion" VARCHAR(300),
    "CodigoPostal" VARCHAR(10),
    "Poblacion" VARCHAR(100),
    "Provincia" VARCHAR(100),
    "Iban" VARCHAR(50),
    "TitularCuenta" VARCHAR(200),
    "Bic" VARCHAR(20),
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "AlumnoResponsables" (
    "IdAlumnoResponsable" SERIAL PRIMARY KEY,
    "IdCliente" INT NOT NULL REFERENCES "clientes"("id") ON DELETE CASCADE,
    "IdContacto" INT NOT NULL REFERENCES "Contactos"("IdContacto") ON DELETE CASCADE,
    "Parentesco" VARCHAR(50),
    "EsPagador" BOOLEAN DEFAULT FALSE,
    "EsPrincipal" BOOLEAN DEFAULT FALSE,
    "Activo" SMALLINT DEFAULT 1,
    "FechaCreacion" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "FechaModificacion" TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_contactos_activo" ON "Contactos"("Activo");
CREATE INDEX IF NOT EXISTS "idx_alumno_responsables_cliente" ON "AlumnoResponsables"("IdCliente");
CREATE INDEX IF NOT EXISTS "idx_alumno_responsables_contacto" ON "AlumnoResponsables"("IdContacto");

-- =====================================================
-- 17. ESCUELA - AULAS Y CLASES

CREATE TABLE IF NOT EXISTS "Aulas" (
    "IdAula" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(100) NOT NULL,
    "Capacidad" INTEGER,
    "Observaciones" TEXT,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClasesRecurrentes" (
    "IdClaseRecurrente" SERIAL PRIMARY KEY,
    "Nombre" VARCHAR(200) NOT NULL,
    "IdServicio" INTEGER,
    "IdProfesional" INTEGER,
    "Tipo" VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    "CapacidadMax" INTEGER NOT NULL DEFAULT 1,
    "DiaSemana" INTEGER,
    "HoraInicio" TIME,
    "DuracionMinutos" INTEGER DEFAULT 60,
    "Aula" VARCHAR(100),
    "FechaInicio" DATE,
    "FechaFin" DATE,
    "Observaciones" TEXT,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "ClaseHorarios" (
    "IdHorario" SERIAL PRIMARY KEY,
    "IdClaseRecurrente" INTEGER NOT NULL REFERENCES "ClasesRecurrentes"("IdClaseRecurrente") ON DELETE CASCADE,
    "DiaSemana" INTEGER NOT NULL,
    "HoraInicio" TIME NOT NULL,
    "DuracionMinutos" INTEGER NOT NULL DEFAULT 60,
    "IdAula" INTEGER REFERENCES "Aulas"("IdAula"),
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Matriculas" (
    "IdMatricula" SERIAL PRIMARY KEY,
    "IdClaseRecurrente" INTEGER NOT NULL,
    "IdCliente" INTEGER NOT NULL,
    "CuotaMensual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "Estado" VARCHAR(50) NOT NULL DEFAULT 'ACTIVA',
    "FechaAlta" DATE NOT NULL DEFAULT CURRENT_DATE,
    "FechaBaja" DATE,
    "Activo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_aulas_activo" ON "Aulas"("Activo");
CREATE INDEX IF NOT EXISTS "idx_clases_activas" ON "ClasesRecurrentes"("Activo");
CREATE INDEX IF NOT EXISTS "idx_clasehorarios_clase" ON "ClaseHorarios"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_clase" ON "Matriculas"("IdClaseRecurrente");
CREATE INDEX IF NOT EXISTS "idx_matriculas_cliente" ON "Matriculas"("IdCliente");

-- =====================================================
-- FIN gestio_db
