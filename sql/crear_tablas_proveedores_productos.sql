-- =============================================
-- PROVEEDORES Y PRODUCTOS - CREACION DE TABLAS
-- =============================================

-- =============================================
-- FAMILIAS Y SUBFAMILIAS DE PROVEEDORES
-- =============================================

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

-- =============================================
-- PROVEEDORES
-- =============================================

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

-- =============================================
-- MARCAS
-- =============================================

CREATE TABLE IF NOT EXISTS "Marcas" (
    "IdMarca" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

-- =============================================
-- FAMILIAS Y SUBFAMILIAS DE PRODUCTOS
-- =============================================

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

-- =============================================
-- PRODUCTOS
-- =============================================

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

-- =============================================
-- INDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre ON "Proveedores"("Nombre");
CREATE INDEX IF NOT EXISTS idx_proveedores_nif ON "Proveedores"("NIF");
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON "Productos"("Codigo");
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON "Productos"("Nombre");
CREATE INDEX IF NOT EXISTS idx_productos_marca ON "Productos"("IdMarca");

-- =============================================
-- DATOS DE EJEMPLO (opcional)
-- =============================================

-- Insertar familias de proveedores de ejemplo
INSERT INTO "FamiliasProveedores" ("Descripcion") VALUES
    ('Lentes'),
    ('Monturas'),
    ('Lentes de Contacto'),
    ('Accesorios')
ON CONFLICT DO NOTHING;

-- Insertar subfamilias de proveedores de ejemplo
INSERT INTO "SubFamiliasProveedores" ("IdFamiliaProveedor", "Descripcion") VALUES
    (1, 'Lentes Oftalmicas'),
    (1, 'Lentes Solares'),
    (2, 'Monturas Metalicas'),
    (2, 'Monturas Pasta'),
    (3, 'Lentes Blandas'),
    (3, 'Lentes Rigidas'),
    (4, 'Fundas'),
    (4, 'Liquidos')
ON CONFLICT DO NOTHING;

-- Insertar familias de productos de ejemplo
INSERT INTO "FamiliasProductos" ("Descripcion") VALUES
    ('Gafas Graduadas'),
    ('Gafas de Sol'),
    ('Lentes de Contacto'),
    ('Liquidos y Accesorios')
ON CONFLICT DO NOTHING;

-- Insertar subfamilias de productos de ejemplo
INSERT INTO "SubFamiliasProductos" ("IdFamiliaProducto", "Descripcion") VALUES
    (1, 'Monofocales'),
    (1, 'Progresivos'),
    (1, 'Ocupacionales'),
    (2, 'Polarizadas'),
    (2, 'Graduadas Sol'),
    (3, 'Diarias'),
    (3, 'Mensuales'),
    (4, 'Soluciones'),
    (4, 'Estuches')
ON CONFLICT DO NOTHING;

-- Insertar marcas de ejemplo
INSERT INTO "Marcas" ("Descripcion") VALUES
    ('Ray-Ban'),
    ('Oakley'),
    ('Essilor'),
    ('Hoya'),
    ('Zeiss'),
    ('Acuvue'),
    ('CooperVision')
ON CONFLICT DO NOTHING;
