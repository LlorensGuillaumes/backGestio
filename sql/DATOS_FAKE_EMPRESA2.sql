-- ============================================
-- DATOS FAKE PARA EMPRESA2 (gestio_db02)
-- Ejecutar conectado a gestio_db02
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
    ('Transferencia bancaria', FALSE, TRUE, 5),
    ('PayPal', FALSE, TRUE, 6);
ALTER TABLE "ModosPago" DROP CONSTRAINT IF EXISTS modospago_descripcion_unique;
ALTER TABLE "ModosPago" ADD CONSTRAINT modospago_descripcion_unique UNIQUE ("Descripcion");

-- ============================================
-- FAMILIAS DE CLIENTES
-- ============================================
TRUNCATE TABLE familias_clientes RESTART IDENTITY CASCADE;
INSERT INTO familias_clientes (nombre, descripcion, activa) VALUES
    ('Particulares', 'Clientes particulares', true),
    ('Empresas', 'Clientes empresariales', true),
    ('Mutuas', 'Clientes de mutuas de salud', true);

-- ============================================
-- SUBFAMILIAS DE CLIENTES
-- ============================================
TRUNCATE TABLE subfamilias_clientes RESTART IDENTITY CASCADE;
INSERT INTO subfamilias_clientes (id_familia, nombre, descripcion, activa) VALUES
    (1, 'General', 'Clientes generales', true),
    (1, 'VIP', 'Clientes preferentes', true),
    (2, 'Corporativo', 'Convenios empresa', true),
    (3, 'Sanitas', 'Mutua Sanitas', true),
    (3, 'Adeslas', 'Mutua Adeslas', true),
    (3, 'DKV', 'Mutua DKV', true);

-- ============================================
-- CLIENTES
-- ============================================
TRUNCATE TABLE clientes RESTART IDENTITY CASCADE;
INSERT INTO clientes (nombre, apellido1, apellido2, tipo, documento_fiscal, telefono1, email, direccion, codigo_postal, poblacion, provincia, activo, es_factura_simplificada) VALUES
    ('Roberto', 'Soler', 'Mas', 'PERSONA', '11111111A', '611111111', 'roberto.soler@mail.com', 'Calle Valencia 10', '46001', 'Valencia', 'Valencia', 1, false),
    ('Elena', 'Navarro', 'Gil', 'PERSONA', '22222222B', '622222222', 'elena.navarro@mail.com', 'Av. del Puerto 50', '46021', 'Valencia', 'Valencia', 1, false),
    ('Francisco', 'Torres', 'Vidal', 'PERSONA', '33333333C', '633333333', 'francisco.torres@mail.com', 'Gran Vía Marqués del Turia 80', '46005', 'Valencia', 'Valencia', 1, false),
    ('Marta', 'Giménez', 'López', 'PERSONA', '44444444D', '644444444', 'marta.gimenez@mail.com', 'Calle Colón 25', '46004', 'Valencia', 'Valencia', 1, false),
    ('Javier', 'Moreno', 'Roca', 'PERSONA', '55555555E', '655555555', 'javier.moreno@mail.com', 'Calle Xàtiva 15', '46007', 'Valencia', 'Valencia', 1, false),
    ('Isabel', 'Ramos', 'Serra', 'PERSONA', '66666666F', '666666666', 'isabel.ramos@mail.com', 'Av. Blasco Ibáñez 100', '46022', 'Valencia', 'Valencia', 1, false),
    ('FACTURA SIMPLIFICADA', '', '', 'PERSONA', '', '', '', '', '', '', '', 1, true),
    ('Óptica Valencia SL', '', '', 'EMPRESA', 'B11111111', '961111111', 'info@opticavalencia.com', 'Calle Comercial 5', '46002', 'Valencia', 'Valencia', 1, false),
    ('Centro Óptico Levante SA', '', '', 'EMPRESA', 'A22222222', '962222222', 'pedidos@opticlevante.com', 'Av. del Cid 200', '46018', 'Valencia', 'Valencia', 1, false);

-- ============================================
-- FAMILIAS DE PRODUCTOS
-- ============================================
TRUNCATE TABLE "FamiliasProductos" RESTART IDENTITY CASCADE;
INSERT INTO "FamiliasProductos" ("Descripcion", "Activa") VALUES
    ('Monturas graduado', TRUE),
    ('Lentes oftálmicas', TRUE),
    ('Lentes de contacto', TRUE),
    ('Gafas de sol', TRUE),
    ('Accesorios', TRUE),
    ('Líquidos y limpieza', TRUE),
    ('Audífonos', TRUE);

-- ============================================
-- SUBFAMILIAS DE PRODUCTOS
-- ============================================
TRUNCATE TABLE "SubFamiliasProductos" RESTART IDENTITY CASCADE;
INSERT INTO "SubFamiliasProductos" ("IdFamiliaProducto", "Descripcion", "Activa") VALUES
    (1, 'Monturas metal', TRUE),
    (1, 'Monturas pasta', TRUE),
    (1, 'Monturas al aire', TRUE),
    (2, 'Monofocales', TRUE),
    (2, 'Progresivas', TRUE),
    (2, 'Bifocales', TRUE),
    (3, 'Blandas diarias', TRUE),
    (3, 'Blandas mensuales', TRUE),
    (3, 'Rígidas', TRUE),
    (4, 'Sol polarizadas', TRUE),
    (4, 'Sol graduadas', TRUE),
    (5, 'Fundas', TRUE),
    (5, 'Cadenas', TRUE),
    (6, 'Soluciones lentillas', TRUE),
    (6, 'Sprays', TRUE),
    (7, 'Retroauriculares', TRUE),
    (7, 'Intracanal', TRUE);

-- ============================================
-- MARCAS
-- ============================================
TRUNCATE TABLE "Marcas" RESTART IDENTITY CASCADE;
INSERT INTO "Marcas" ("Descripcion", "Activa") VALUES
    ('Ray-Ban', TRUE),
    ('Oakley', TRUE),
    ('Carrera', TRUE),
    ('Tommy Hilfiger', TRUE),
    ('Boss', TRUE),
    ('Varilux', TRUE),
    ('Hoya', TRUE),
    ('Rodenstock', TRUE),
    ('Acuvue', TRUE),
    ('Air Optix', TRUE),
    ('Phonak', TRUE),
    ('Widex', TRUE),
    ('Sin marca', TRUE);

-- ============================================
-- PRODUCTOS
-- ============================================
TRUNCATE TABLE "Productos" RESTART IDENTITY CASCADE;
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "Coste", "Stock", "StockMinimo", "PorcentajeIva", "Activo") VALUES
    ('MG001', 'Ray-Ban RB7047', 'Montura rectangular moderna', 1, 135.00, 67.50, 10, 3, 21, TRUE),
    ('MG002', 'Carrera CA8862', 'Montura deportiva', 3, 125.00, 62.50, 12, 3, 21, TRUE),
    ('MG003', 'Tommy Hilfiger TH1791', 'Montura casual', 4, 115.00, 57.50, 15, 3, 21, TRUE),
    ('MG004', 'Boss BOSS1265', 'Montura ejecutiva', 5, 185.00, 92.50, 8, 2, 21, TRUE),
    ('LO001', 'Varilux X Series', 'Progresiva premium', 6, 450.00, 225.00, 25, 5, 21, TRUE),
    ('LO002', 'Varilux Comfort Max', 'Progresiva confort', 6, 320.00, 160.00, 35, 8, 21, TRUE),
    ('LO003', 'Hoya Sync III', 'Monofocal digital', 7, 180.00, 90.00, 50, 10, 21, TRUE),
    ('LO004', 'Rodenstock Impression', 'Progresiva personalizada', 8, 520.00, 260.00, 15, 3, 21, TRUE),
    ('LC001', 'Acuvue Moist Diaria', 'Lentilla diaria (90 uds)', 9, 75.00, 37.50, 60, 15, 21, TRUE),
    ('LC002', 'Air Optix Plus', 'Lentilla mensual (6 uds)', 10, 52.00, 26.00, 80, 20, 21, TRUE),
    ('GS001', 'Ray-Ban Wayfarer', 'Gafas sol clásicas', 1, 155.00, 77.50, 15, 4, 21, TRUE),
    ('GS002', 'Oakley Sutro', 'Gafas sol ciclismo', 2, 195.00, 97.50, 10, 3, 21, TRUE),
    ('GS003', 'Carrera Champion', 'Gafas sol vintage', 3, 125.00, 62.50, 12, 3, 21, TRUE),
    ('AC001', 'Funda premium cuero', 'Estuche piel sintética', 13, 18.00, 6.00, 40, 10, 21, TRUE),
    ('AC002', 'Cadena dorada', 'Cordón elegante', 13, 12.00, 4.00, 60, 15, 21, TRUE),
    ('LQ001', 'ReNu MultiPlus 360ml', 'Solución multiuso', 13, 14.00, 5.00, 100, 25, 21, TRUE),
    ('LQ002', 'Spray antivaho pro', 'Limpiador premium', 13, 11.00, 3.50, 50, 12, 21, TRUE),
    ('AU001', 'Phonak Audéo P90', 'Audífono premium recargable', 11, 2200.00, 1100.00, 4, 1, 21, TRUE),
    ('AU002', 'Widex Moment 440', 'Audífono inteligente', 12, 1850.00, 925.00, 4, 1, 21, TRUE);

-- ============================================
-- FAMILIAS DE SERVICIOS
-- ============================================
TRUNCATE TABLE "FamiliasServicios" RESTART IDENTITY CASCADE;
INSERT INTO "FamiliasServicios" ("Descripcion", "Activa") VALUES
    ('Optometría', TRUE),
    ('Contactología', TRUE),
    ('Audiología', TRUE),
    ('Taller', TRUE);

-- ============================================
-- SUBFAMILIAS DE SERVICIOS
-- ============================================
TRUNCATE TABLE "SubFamiliasServicios" RESTART IDENTITY CASCADE;
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (1, 'Examen visual', TRUE),
    (1, 'Retinografía', TRUE),
    (2, 'Adaptación lentillas', TRUE),
    (2, 'Revisión lentillas', TRUE),
    (3, 'Audiometría', TRUE),
    (3, 'Adaptación audífono', TRUE),
    (4, 'Reparaciones', TRUE),
    (4, 'Montajes', TRUE);

-- ============================================
-- SERVICIOS
-- ============================================
TRUNCATE TABLE "Servicios" RESTART IDENTITY CASCADE;
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "IdFamiliaServicio", "PVP", "Coste", "PorcentajeIva", "DuracionMinutos", "Activo") VALUES
    ('OPT01', 'Examen visual completo', 'Revisión optométrica completa', 1, 40.00, 12.00, 21, 40, TRUE),
    ('OPT02', 'Retinografía digital', 'Fotografía del fondo de ojo', 1, 25.00, 8.00, 21, 15, TRUE),
    ('OPT03', 'Campimetría', 'Estudio campo visual', 1, 35.00, 10.00, 21, 25, TRUE),
    ('CON01', 'Primera adaptación LC', 'Adaptación inicial lentes contacto', 2, 55.00, 18.00, 21, 50, TRUE),
    ('CON02', 'Revisión LC', 'Control periódico lentillas', 2, 20.00, 6.00, 21, 20, TRUE),
    ('AUD01', 'Audiometría completa', 'Estudio auditivo completo', 3, 45.00, 15.00, 21, 45, TRUE),
    ('AUD02', 'Adaptación audífono', 'Primera adaptación y ajuste', 3, 60.00, 20.00, 21, 60, TRUE),
    ('TAL01', 'Ajuste montura', 'Ajuste y alineación gratuito', 4, 0.00, 0.00, 21, 10, TRUE),
    ('TAL02', 'Montaje lentes', 'Montaje de lentes en montura', 4, 15.00, 5.00, 21, 20, TRUE),
    ('TAL03', 'Soldadura', 'Reparación por soldadura', 4, 20.00, 7.00, 21, 30, TRUE);

-- ============================================
-- PROFESIONALES
-- ============================================
TRUNCATE TABLE "Profesionales" RESTART IDENTITY CASCADE;
INSERT INTO "Profesionales" ("Nombre", "Apellidos", "NumColegiado", "Especialidad", "Telefono", "Email", "Activo") VALUES
    ('María', 'Ferrer Blasco', 'OPT-11111', 'Optometrista', '611222333', 'maria.ferrer@empresa2.com', TRUE),
    ('Jorge', 'Navarro López', 'OPT-22222', 'Optometrista', '622333444', 'jorge.navarro@empresa2.com', TRUE),
    ('Carmen', 'Ruiz Martínez', 'AUD-33333', 'Audióloga', '633444555', 'carmen.ruiz@empresa2.com', TRUE),
    ('Pablo', 'Sanz García', 'CON-44444', 'Contactólogo', '644555666', 'pablo.sanz@empresa2.com', TRUE);

-- ============================================
-- PROVEEDORES
-- ============================================
TRUNCATE TABLE "Proveedores" RESTART IDENTITY CASCADE;
INSERT INTO "Proveedores" ("Nombre", "NombreComercial", "CIF", "Direccion", "CodigoPostal", "Poblacion", "Provincia", "Pais", "Telefono1", "Email", "Web", "Activo") VALUES
    ('Luxottica España SL', 'Luxottica', 'B12345678', 'Polígono Industrial Norte 15', '08820', 'El Prat de Llobregat', 'Barcelona', 'España', '934567890', 'pedidos@luxottica.es', 'www.luxottica.com', TRUE),
    ('Essilor España SA', 'Essilor', 'A23456789', 'Av. de la Industria 50', '28108', 'Alcobendas', 'Madrid', 'España', '912345678', 'comercial@essilor.es', 'www.essilor.es', TRUE),
    ('Safilo Group', 'Safilo', 'B99887766', 'Via Industrial 22', '46980', 'Paterna', 'Valencia', 'España', '961234567', 'ventas@safilo.es', 'www.safilo.com', TRUE),
    ('Alcon Laboratorios SA', 'Alcon', 'A45678901', 'Parque Empresarial 100', '28046', 'Madrid', 'Madrid', 'España', '913456789', 'info@alcon.es', 'www.alcon.es', TRUE),
    ('GN Hearing España', 'ReSound', 'B77665544', 'Centro Negocios 50', '28001', 'Madrid', 'Madrid', 'España', '915678901', 'pedidos@resound.es', 'www.resound.com', TRUE),
    ('Sonova España', 'Phonak', 'A66554433', 'Parque Tecnológico 30', '28760', 'Tres Cantos', 'Madrid', 'España', '916789012', 'info@phonak.es', 'www.phonak.com', TRUE);

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
