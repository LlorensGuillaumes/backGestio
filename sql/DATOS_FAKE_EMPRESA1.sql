-- ============================================
-- DATOS FAKE PARA EMPRESA1 (gestio_db01)
-- Ejecutar conectado a gestio_db01
-- ============================================

-- ============================================
-- MODOS DE PAGO
-- ============================================
TRUNCATE TABLE "ModosPago" RESTART IDENTITY CASCADE;
INSERT INTO "ModosPago" ("Descripcion", "UsaDatafono", "Activo", "Orden") VALUES
    ('Efectivo', FALSE, TRUE, 1),
    ('Tarjeta de crédito', TRUE, TRUE, 2),
    ('Tarjeta de débito', TRUE, TRUE, 3),
    ('Bizum', FALSE, TRUE, 4),
    ('Transferencia bancaria', FALSE, TRUE, 5);
ALTER TABLE "ModosPago" DROP CONSTRAINT IF EXISTS modospago_descripcion_unique;
ALTER TABLE "ModosPago" ADD CONSTRAINT modospago_descripcion_unique UNIQUE ("Descripcion");

-- ============================================
-- FAMILIAS DE CLIENTES
-- ============================================
TRUNCATE TABLE familias_clientes RESTART IDENTITY CASCADE;
INSERT INTO familias_clientes (nombre, descripcion, activa) VALUES
    ('Particulares', 'Clientes particulares', true),
    ('Empresas', 'Clientes empresariales', true),
    ('Profesionales', 'Profesionales autónomos', true);

-- ============================================
-- SUBFAMILIAS DE CLIENTES
-- ============================================
TRUNCATE TABLE subfamilias_clientes RESTART IDENTITY CASCADE;
INSERT INTO subfamilias_clientes (id_familia, nombre, descripcion, activa) VALUES
    (1, 'Adultos', 'Clientes adultos particulares', true),
    (1, 'Tercera edad', 'Clientes mayores de 65', true),
    (1, 'Jóvenes', 'Clientes menores de 30', true),
    (2, 'Pymes', 'Pequeñas y medianas empresas', true),
    (2, 'Grandes empresas', 'Corporaciones', true),
    (3, 'Médicos', 'Profesionales de la salud', true),
    (3, 'Abogados', 'Profesionales legales', true);

-- ============================================
-- CLIENTES
-- ============================================
TRUNCATE TABLE clientes RESTART IDENTITY CASCADE;
INSERT INTO clientes (nombre, apellido1, apellido2, tipo, documento_fiscal, telefono1, email, direccion, codigo_postal, poblacion, provincia, activo, es_factura_simplificada) VALUES
    ('Juan', 'García', 'López', 'PERSONA', '12345678A', '612345678', 'juan.garcia@email.com', 'Calle Mayor 1', '08001', 'Barcelona', 'Barcelona', 1, false),
    ('María', 'Martínez', 'Sánchez', 'PERSONA', '23456789B', '623456789', 'maria.martinez@email.com', 'Av. Diagonal 100', '08019', 'Barcelona', 'Barcelona', 1, false),
    ('Pedro', 'López', 'Fernández', 'PERSONA', '34567890C', '634567890', 'pedro.lopez@email.com', 'Rambla Catalunya 50', '08007', 'Barcelona', 'Barcelona', 1, false),
    ('Ana', 'Rodríguez', 'García', 'PERSONA', '45678901D', '645678901', 'ana.rodriguez@email.com', 'Paseo de Gracia 25', '08008', 'Barcelona', 'Barcelona', 1, false),
    ('Carlos', 'Fernández', 'Martín', 'PERSONA', '56789012E', '656789012', 'carlos.fernandez@email.com', 'Calle Aragón 200', '08011', 'Barcelona', 'Barcelona', 1, false),
    ('Laura', 'Sánchez', 'Pérez', 'PERSONA', '67890123F', '667890123', 'laura.sanchez@email.com', 'Via Augusta 75', '08006', 'Barcelona', 'Barcelona', 1, false),
    ('Miguel', 'Pérez', 'Ruiz', 'PERSONA', '78901234G', '678901234', 'miguel.perez@email.com', 'Calle Balmes 150', '08008', 'Barcelona', 'Barcelona', 1, false),
    ('Carmen', 'Ruiz', 'Torres', 'PERSONA', '89012345H', '689012345', 'carmen.ruiz@email.com', 'Travessera de Gràcia 30', '08021', 'Barcelona', 'Barcelona', 1, false),
    ('FACTURA SIMPLIFICADA', '', '', 'PERSONA', '', '', '', '', '', '', '', 1, true),
    ('Óptica Central SL', '', '', 'EMPRESA', 'B12345678', '931234567', 'info@opticacentral.com', 'Calle Comercio 10', '08003', 'Barcelona', 'Barcelona', 1, false),
    ('Visión Total SA', '', '', 'EMPRESA', 'A23456789', '932345678', 'contacto@visiontotal.com', 'Av. Meridiana 200', '08027', 'Barcelona', 'Barcelona', 1, false);

-- ============================================
-- FAMILIAS DE PRODUCTOS
-- ============================================
TRUNCATE TABLE "FamiliasProductos" RESTART IDENTITY CASCADE;
INSERT INTO "FamiliasProductos" ("Descripcion", "Activa") VALUES
    ('Monturas', TRUE),
    ('Lentes oftálmicas', TRUE),
    ('Lentes de contacto', TRUE),
    ('Gafas de sol', TRUE),
    ('Accesorios', TRUE),
    ('Productos de limpieza', TRUE);

-- ============================================
-- SUBFAMILIAS DE PRODUCTOS
-- ============================================
TRUNCATE TABLE "SubFamiliasProductos" RESTART IDENTITY CASCADE;
INSERT INTO "SubFamiliasProductos" ("IdFamiliaProducto", "Descripcion", "Activa") VALUES
    (1, 'Monturas hombre', TRUE),
    (1, 'Monturas mujer', TRUE),
    (1, 'Monturas unisex', TRUE),
    (1, 'Monturas infantiles', TRUE),
    (2, 'Monofocales', TRUE),
    (2, 'Progresivas', TRUE),
    (2, 'Ocupacionales', TRUE),
    (3, 'Diarias', TRUE),
    (3, 'Mensuales', TRUE),
    (3, 'Anuales', TRUE),
    (4, 'Sol hombre', TRUE),
    (4, 'Sol mujer', TRUE),
    (4, 'Sol deportivas', TRUE),
    (5, 'Estuches', TRUE),
    (5, 'Cordones', TRUE),
    (5, 'Gamuza', TRUE),
    (6, 'Líquido lentillas', TRUE),
    (6, 'Spray limpiador', TRUE);

-- ============================================
-- MARCAS
-- ============================================
TRUNCATE TABLE "Marcas" RESTART IDENTITY CASCADE;
INSERT INTO "Marcas" ("Descripcion", "Activa") VALUES
    ('Ray-Ban', TRUE),
    ('Oakley', TRUE),
    ('Persol', TRUE),
    ('Gucci', TRUE),
    ('Prada', TRUE),
    ('Essilor', TRUE),
    ('Hoya', TRUE),
    ('Zeiss', TRUE),
    ('Acuvue', TRUE),
    ('Bausch & Lomb', TRUE),
    ('CooperVision', TRUE),
    ('Genérica', TRUE);

-- ============================================
-- PRODUCTOS
-- ============================================
TRUNCATE TABLE "Productos" RESTART IDENTITY CASCADE;
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "Coste", "Stock", "StockMinimo", "PorcentajeIva", "Activo") VALUES
    ('MON001', 'Ray-Ban RB5154 Clubmaster', 'Montura clásica estilo clubmaster', 1, 145.00, 72.50, 15, 3, 21, TRUE),
    ('MON002', 'Oakley OX8046 Airdrop', 'Montura deportiva ligera', 2, 165.00, 82.50, 12, 3, 21, TRUE),
    ('MON003', 'Persol PO3007V', 'Montura italiana elegante', 3, 195.00, 97.50, 8, 2, 21, TRUE),
    ('MON004', 'Gucci GG0027O', 'Montura de lujo mujer', 4, 285.00, 142.50, 6, 2, 21, TRUE),
    ('MON005', 'Prada PR 17WV', 'Montura moderna unisex', 5, 245.00, 122.50, 10, 2, 21, TRUE),
    ('LEN001', 'Essilor Varilux Comfort', 'Lente progresiva confort', 6, 320.00, 160.00, 50, 10, 21, TRUE),
    ('LEN002', 'Hoya Sensity', 'Lente fotocromática', 7, 280.00, 140.00, 40, 10, 21, TRUE),
    ('LEN003', 'Zeiss SmartLife', 'Lente digital premium', 8, 380.00, 190.00, 30, 5, 21, TRUE),
    ('LEN004', 'Essilor Eyezen', 'Lente monofocal anti-fatiga', 6, 180.00, 90.00, 60, 15, 21, TRUE),
    ('LC001', 'Acuvue Oasys Diarias', 'Lentillas diarias hidratantes (30 uds)', 9, 42.00, 21.00, 100, 20, 21, TRUE),
    ('LC002', 'Bausch Total30 Mensual', 'Lentillas mensuales (6 uds)', 10, 65.00, 32.50, 80, 15, 21, TRUE),
    ('LC003', 'CooperVision Biofinity', 'Lentillas mensuales silicona (6 uds)', 11, 58.00, 29.00, 70, 15, 21, TRUE),
    ('SOL001', 'Ray-Ban Aviator', 'Gafas de sol clásicas aviador', 1, 165.00, 82.50, 20, 5, 21, TRUE),
    ('SOL002', 'Oakley Holbrook', 'Gafas de sol deportivas', 2, 145.00, 72.50, 18, 5, 21, TRUE),
    ('SOL003', 'Persol 714 Steve McQueen', 'Gafas de sol plegables icónicas', 3, 295.00, 147.50, 5, 2, 21, TRUE),
    ('ACC001', 'Estuche rígido premium', 'Estuche protector duro', 12, 15.00, 5.00, 50, 10, 21, TRUE),
    ('ACC002', 'Cordón ajustable', 'Cordón para gafas deportivo', 12, 8.00, 2.50, 100, 20, 21, TRUE),
    ('ACC003', 'Gamuza microfibra', 'Paño limpiador microfibra', 12, 3.00, 0.80, 200, 50, 21, TRUE),
    ('LIM001', 'Solución multiuso 360ml', 'Líquido lentillas todo en uno', 10, 12.00, 4.00, 80, 20, 21, TRUE),
    ('LIM002', 'Spray antivaho 30ml', 'Spray limpiador antivaho', 12, 9.00, 3.00, 60, 15, 21, TRUE);

-- ============================================
-- FAMILIAS DE SERVICIOS
-- ============================================
TRUNCATE TABLE "FamiliasServicios" RESTART IDENTITY CASCADE;
INSERT INTO "FamiliasServicios" ("Descripcion", "Activa") VALUES
    ('Revisiones', TRUE),
    ('Adaptaciones', TRUE),
    ('Reparaciones', TRUE),
    ('Otros servicios', TRUE);

-- ============================================
-- SUBFAMILIAS DE SERVICIOS
-- ============================================
TRUNCATE TABLE "SubFamiliasServicios" RESTART IDENTITY CASCADE;
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (1, 'Revisión visual completa', TRUE),
    (1, 'Revisión presión ocular', TRUE),
    (1, 'Topografía corneal', TRUE),
    (2, 'Adaptación lentes progresivas', TRUE),
    (2, 'Adaptación lentes contacto', TRUE),
    (3, 'Ajuste montura', TRUE),
    (3, 'Cambio plaquetas', TRUE),
    (3, 'Soldadura', TRUE),
    (4, 'Asesoramiento imagen', TRUE);

-- ============================================
-- SERVICIOS
-- ============================================
TRUNCATE TABLE "Servicios" RESTART IDENTITY CASCADE;
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "IdFamiliaServicio", "PVP", "Coste", "PorcentajeIva", "DuracionMinutos", "Activo") VALUES
    ('SRV001', 'Revisión visual completa', 'Examen optométrico completo con todas las pruebas', 1, 45.00, 15.00, 21, 45, TRUE),
    ('SRV002', 'Control de tensión ocular', 'Medición de presión intraocular', 1, 20.00, 5.00, 21, 15, TRUE),
    ('SRV003', 'Topografía corneal', 'Mapa detallado de la córnea', 1, 35.00, 10.00, 21, 20, TRUE),
    ('SRV004', 'Adaptación progresivos', 'Asesoramiento y adaptación lentes progresivas', 2, 30.00, 10.00, 21, 30, TRUE),
    ('SRV005', 'Adaptación lentillas', 'Primera adaptación de lentes de contacto', 2, 50.00, 15.00, 21, 45, TRUE),
    ('SRV006', 'Ajuste de montura', 'Ajuste y alineación de gafas', 3, 0.00, 0.00, 21, 10, TRUE),
    ('SRV007', 'Cambio de plaquetas', 'Sustitución de almohadillas nasales', 3, 5.00, 1.00, 21, 10, TRUE),
    ('SRV008', 'Soldadura montura', 'Reparación por soldadura', 3, 25.00, 8.00, 21, 30, TRUE),
    ('SRV009', 'Asesoramiento de imagen', 'Consulta de estilo y selección de montura', 4, 0.00, 0.00, 21, 20, TRUE);

-- ============================================
-- PROFESIONALES
-- ============================================
TRUNCATE TABLE "Profesionales" RESTART IDENTITY CASCADE;
INSERT INTO "Profesionales" ("Nombre", "Apellidos", "NumColegiado", "Especialidad", "Telefono", "Email", "Activo") VALUES
    ('Carlos', 'Gómez Ruiz', 'OPT-12345', 'Optometrista', '612111222', 'carlos.gomez@empresa1.com', TRUE),
    ('Ana', 'Vidal Serra', 'OPT-23456', 'Optometrista', '623222333', 'ana.vidal@empresa1.com', TRUE),
    ('Luis', 'Mas Puig', 'CON-34567', 'Contactólogo', '634333444', 'luis.mas@empresa1.com', TRUE);

-- ============================================
-- PROVEEDORES
-- ============================================
TRUNCATE TABLE "Proveedores" RESTART IDENTITY CASCADE;
INSERT INTO "Proveedores" ("Nombre", "NombreComercial", "CIF", "Direccion", "CodigoPostal", "Poblacion", "Provincia", "Pais", "Telefono1", "Email", "Web", "Activo") VALUES
    ('Luxottica España SL', 'Luxottica', 'B12345678', 'Polígono Industrial Norte 15', '08820', 'El Prat de Llobregat', 'Barcelona', 'España', '934567890', 'pedidos@luxottica.es', 'www.luxottica.com', TRUE),
    ('Essilor España SA', 'Essilor', 'A23456789', 'Av. de la Industria 50', '28108', 'Alcobendas', 'Madrid', 'España', '912345678', 'comercial@essilor.es', 'www.essilor.es', TRUE),
    ('Indo Optical SL', 'Indo', 'B34567890', 'Calle Lentes 25', '08940', 'Cornellà de Llobregat', 'Barcelona', 'España', '933456789', 'ventas@indo.es', 'www.indo.es', TRUE),
    ('Alcon Laboratorios SA', 'Alcon', 'A45678901', 'Parque Empresarial 100', '28046', 'Madrid', 'Madrid', 'España', '913456789', 'info@alcon.es', 'www.alcon.es', TRUE),
    ('CooperVision España', 'CooperVision', 'B56789012', 'Centro Logístico Sur 5', '28906', 'Getafe', 'Madrid', 'España', '914567890', 'pedidos@coopervision.es', 'www.coopervision.es', TRUE);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 'ModosPago' as tabla, COUNT(*) as registros FROM "ModosPago"
UNION ALL SELECT 'familias_clientes', COUNT(*) FROM familias_clientes
UNION ALL SELECT 'subfamilias_clientes', COUNT(*) FROM subfamilias_clientes
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'FamiliasProductos', COUNT(*) FROM "FamiliasProductos"
UNION ALL SELECT 'SubFamiliasProductos', COUNT(*) FROM "SubFamiliasProductos"
UNION ALL SELECT 'Marcas', COUNT(*) FROM "Marcas"
UNION ALL SELECT 'Productos', COUNT(*) FROM "Productos"
UNION ALL SELECT 'FamiliasServicios', COUNT(*) FROM "FamiliasServicios"
UNION ALL SELECT 'SubFamiliasServicios', COUNT(*) FROM "SubFamiliasServicios"
UNION ALL SELECT 'Servicios', COUNT(*) FROM "Servicios"
UNION ALL SELECT 'Profesionales', COUNT(*) FROM "Profesionales"
UNION ALL SELECT 'Proveedores', COUNT(*) FROM "Proveedores";
