-- ============================================
-- TABLAS DE SERVICIOS (PostgreSQL)
-- Servicios que no descuentan de stock
-- ============================================

-- ============================================
-- FAMILIAS DE SERVICIOS
-- ============================================
CREATE TABLE IF NOT EXISTS "FamiliasServicios" (
    "IdFamiliaServicio" SERIAL PRIMARY KEY,
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

-- Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS "IX_FamiliasServicios_Descripcion" ON "FamiliasServicios"("Descripcion");

-- ============================================
-- SUBFAMILIAS DE SERVICIOS
-- ============================================
CREATE TABLE IF NOT EXISTS "SubFamiliasServicios" (
    "IdSubFamiliaServicio" SERIAL PRIMARY KEY,
    "IdFamiliaServicio" INT NOT NULL REFERENCES "FamiliasServicios"("IdFamiliaServicio"),
    "Descripcion" VARCHAR(200) NOT NULL,
    "Activa" SMALLINT DEFAULT 1
);

-- Crear índice
CREATE INDEX IF NOT EXISTS "IX_SubFamiliasServicios_Familia" ON "SubFamiliasServicios"("IdFamiliaServicio");

-- ============================================
-- TABLA PRINCIPAL DE SERVICIOS
-- ============================================
CREATE TABLE IF NOT EXISTS "Servicios" (
    "IdServicio" SERIAL PRIMARY KEY,
    "Codigo" VARCHAR(50),
    "Nombre" VARCHAR(300) NOT NULL,
    "Descripcion" TEXT,
    "PVP" DECIMAL(10, 2) DEFAULT 0,
    "PrecioCoste" DECIMAL(10, 2) DEFAULT 0,
    "IdTipoIva" INT,
    "PorcentajeIva" DECIMAL(5, 2) DEFAULT 21.00,
    "DuracionMinutos" INT DEFAULT 0,          -- Duración estimada del servicio
    "RequiereCita" BOOLEAN DEFAULT FALSE,      -- Si necesita cita previa
    "Observaciones" TEXT,
    "Activo" SMALLINT DEFAULT 1,
    "FechaAlta" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS "IX_Servicios_Codigo" ON "Servicios"("Codigo");
CREATE INDEX IF NOT EXISTS "IX_Servicios_Nombre" ON "Servicios"("Nombre");
CREATE INDEX IF NOT EXISTS "IX_Servicios_Activo" ON "Servicios"("Activo");

-- ============================================
-- RELACIÓN SERVICIOS - SUBFAMILIAS
-- ============================================
CREATE TABLE IF NOT EXISTS "ServiciosSubFamilias" (
    "IdServicio" INT NOT NULL REFERENCES "Servicios"("IdServicio"),
    "IdSubFamiliaServicio" INT NOT NULL REFERENCES "SubFamiliasServicios"("IdSubFamiliaServicio"),
    PRIMARY KEY ("IdServicio", "IdSubFamiliaServicio")
);

-- ============================================
-- DATOS DE EJEMPLO: FAMILIAS DE SERVICIOS
-- ============================================
INSERT INTO "FamiliasServicios" ("Descripcion", "Activa") VALUES
    ('Terapia Visual', 1),
    ('Exámenes y Revisiones', 1),
    ('Tratamientos de Cristales', 1),
    ('Adaptación Lentes de Contacto', 1),
    ('Otros Servicios', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- DATOS DE EJEMPLO: SUBFAMILIAS DE SERVICIOS
-- ============================================
-- Terapia Visual (IdFamiliaServicio = 1)
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (1, 'Sesiones Terapia', 1),
    (1, 'Evaluación Terapia', 1),
    (1, 'Programa Completo', 1)
ON CONFLICT DO NOTHING;

-- Exámenes y Revisiones (IdFamiliaServicio = 2)
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (2, 'Examen Visual Completo', 1),
    (2, 'Revisión Rápida', 1),
    (2, 'Examen Pediátrico', 1),
    (2, 'Campimetría', 1),
    (2, 'Topografía', 1)
ON CONFLICT DO NOTHING;

-- Tratamientos de Cristales (IdFamiliaServicio = 3)
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (3, 'Antirreflejantes', 1),
    (3, 'Fotocromáticos', 1),
    (3, 'Filtros Especiales', 1),
    (3, 'Coloraciones', 1),
    (3, 'Espejados', 1)
ON CONFLICT DO NOTHING;

-- Adaptación LC (IdFamiliaServicio = 4)
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (4, 'Adaptación Blandas', 1),
    (4, 'Adaptación RGP', 1),
    (4, 'Adaptación Orto-K', 1),
    (4, 'Revisión LC', 1)
ON CONFLICT DO NOTHING;

-- Otros Servicios (IdFamiliaServicio = 5)
INSERT INTO "SubFamiliasServicios" ("IdFamiliaServicio", "Descripcion", "Activa") VALUES
    (5, 'Ajustes y Reparaciones', 1),
    (5, 'Asesoramiento', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- DATOS DE EJEMPLO: SERVICIOS
-- ============================================

-- TERAPIA VISUAL
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-TV-SESION', 'Sesión Terapia Visual', 'Sesión individual de terapia visual (45 min)', 45.00, 15.00, 21, 45, TRUE, 1),
('SRV-TV-EVAL', 'Evaluación Terapia Visual', 'Evaluación completa para programa de terapia', 85.00, 25.00, 21, 60, TRUE, 1),
('SRV-TV-PACK10', 'Pack 10 Sesiones Terapia', 'Bono de 10 sesiones de terapia visual', 400.00, 120.00, 21, 450, TRUE, 1),
('SRV-TV-PACK20', 'Pack 20 Sesiones Terapia', 'Bono de 20 sesiones de terapia visual', 750.00, 220.00, 21, 900, TRUE, 1);

-- EXÁMENES Y REVISIONES
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-EX-COMPL', 'Examen Visual Completo', 'Examen optométrico completo con todas las pruebas', 35.00, 10.00, 21, 45, TRUE, 1),
('SRV-EX-RAPIDO', 'Revisión Rápida', 'Control rápido de graduación', 15.00, 5.00, 21, 15, FALSE, 1),
('SRV-EX-PEDIA', 'Examen Visual Pediátrico', 'Examen especializado para niños', 45.00, 15.00, 21, 45, TRUE, 1),
('SRV-EX-CAMPI', 'Campimetría', 'Estudio del campo visual', 40.00, 12.00, 21, 30, TRUE, 1),
('SRV-EX-TOPO', 'Topografía Corneal', 'Mapa topográfico de la córnea', 35.00, 10.00, 21, 20, TRUE, 1),
('SRV-EX-PAQUI', 'Paquimetría', 'Medición del espesor corneal', 25.00, 8.00, 21, 15, TRUE, 1),
('SRV-EX-RETINO', 'Retinografía', 'Fotografía de fondo de ojo', 30.00, 10.00, 21, 15, TRUE, 1);

-- TRATAMIENTOS DE CRISTALES (Antirreflejantes)
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-AR-STD', 'Antirreflejante Estándar', 'Tratamiento antirreflejante básico', 25.00, 10.00, 21, 0, FALSE, 1),
('SRV-AR-PREM', 'Antirreflejante Premium', 'Tratamiento AR multicapa con hidrófobo', 45.00, 18.00, 21, 0, FALSE, 1),
('SRV-AR-SUPER', 'Antirreflejante Superior', 'AR superior con antiestático y oleófobo', 65.00, 26.00, 21, 0, FALSE, 1),
('SRV-AR-BLUECUT', 'Filtro Luz Azul', 'Protección contra luz azul de pantallas', 35.00, 14.00, 21, 0, FALSE, 1),
('SRV-AR-BLUE-PREM', 'Filtro Luz Azul Premium', 'Filtro luz azul + AR premium', 55.00, 22.00, 21, 0, FALSE, 1);

-- TRATAMIENTOS DE CRISTALES (Fotocromáticos)
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-FOTO-STD', 'Fotocromático Estándar', 'Lente fotocromática gris/marrón', 55.00, 22.00, 21, 0, FALSE, 1),
('SRV-FOTO-TRANS', 'Transitions Gen8', 'Transitions Signature Gen8', 85.00, 34.00, 21, 0, FALSE, 1),
('SRV-FOTO-XTRA', 'Transitions XTRActive', 'Fotocromático XTRActive para conducir', 95.00, 38.00, 21, 0, FALSE, 1),
('SRV-FOTO-VANT', 'Transitions Vantage', 'Fotocromático polarizado variable', 120.00, 48.00, 21, 0, FALSE, 1);

-- TRATAMIENTOS DE CRISTALES (Coloraciones y Espejados)
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-COLOR-UNIF', 'Coloración Uniforme', 'Tinte uniforme gris/marrón/verde', 20.00, 8.00, 21, 0, FALSE, 1),
('SRV-COLOR-DEG', 'Coloración Degradada', 'Tinte degradado para sol', 25.00, 10.00, 21, 0, FALSE, 1),
('SRV-ESPEJ-STD', 'Espejado Estándar', 'Espejado plata/azul/verde', 35.00, 14.00, 21, 0, FALSE, 1),
('SRV-ESPEJ-PREM', 'Espejado Premium', 'Espejado flash oro/rosa/violeta', 45.00, 18.00, 21, 0, FALSE, 1),
('SRV-POLAR', 'Polarizado', 'Tratamiento polarizado para cristal', 55.00, 22.00, 21, 0, FALSE, 1);

-- ADAPTACIÓN LENTES DE CONTACTO
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-LC-ADAPT-BL', 'Adaptación LC Blandas', 'Adaptación completa lentes blandas con pruebas', 40.00, 12.00, 21, 45, TRUE, 1),
('SRV-LC-ADAPT-RGP', 'Adaptación LC RGP', 'Adaptación lentes gas permeable', 75.00, 25.00, 21, 60, TRUE, 1),
('SRV-LC-ORTOK', 'Adaptación Orto-K', 'Adaptación ortoqueratología nocturna', 350.00, 120.00, 21, 90, TRUE, 1),
('SRV-LC-REV', 'Revisión Lentes Contacto', 'Control periódico usuarios LC', 20.00, 6.00, 21, 20, TRUE, 1),
('SRV-LC-ENSEÑ', 'Enseñanza Manejo LC', 'Instrucción colocación y mantenimiento', 15.00, 5.00, 21, 30, FALSE, 1);

-- OTROS SERVICIOS
INSERT INTO "Servicios" ("Codigo", "Nombre", "Descripcion", "PVP", "PrecioCoste", "PorcentajeIva", "DuracionMinutos", "RequiereCita", "Activo") VALUES
('SRV-AJUSTE', 'Ajuste de Montura', 'Ajuste y alineación de gafa', 0.00, 0.00, 21, 10, FALSE, 1),
('SRV-REPAR-SOLD', 'Soldadura Montura', 'Reparación con soldadura', 15.00, 5.00, 21, 15, FALSE, 1),
('SRV-REPAR-TORN', 'Cambio Tornillo/Plaqueta', 'Sustitución tornillos o plaquetas', 3.00, 1.00, 21, 10, FALSE, 1),
('SRV-LIMPIEZA-US', 'Limpieza Ultrasonidos', 'Limpieza profunda con ultrasonidos', 5.00, 1.00, 21, 10, FALSE, 1),
('SRV-ASESORIA', 'Asesoramiento Personalizado', 'Consulta de asesoramiento visual', 25.00, 8.00, 21, 30, TRUE, 1);

-- ============================================
-- ASIGNAR SERVICIOS A SUBFAMILIAS
-- ============================================
-- Obtener IDs de subfamilias de servicios y asignar
-- (Esto se hace de forma programática según los IDs generados)

-- Terapia Visual -> Sesiones Terapia (subfamilia 1)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 1 FROM "Servicios" s WHERE s."Codigo" IN ('SRV-TV-SESION', 'SRV-TV-PACK10', 'SRV-TV-PACK20')
ON CONFLICT DO NOTHING;

-- Terapia Visual -> Evaluación Terapia (subfamilia 2)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 2 FROM "Servicios" s WHERE s."Codigo" = 'SRV-TV-EVAL'
ON CONFLICT DO NOTHING;

-- Exámenes -> Examen Visual Completo (subfamilia 4)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 4 FROM "Servicios" s WHERE s."Codigo" = 'SRV-EX-COMPL'
ON CONFLICT DO NOTHING;

-- Exámenes -> Revisión Rápida (subfamilia 5)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 5 FROM "Servicios" s WHERE s."Codigo" = 'SRV-EX-RAPIDO'
ON CONFLICT DO NOTHING;

-- Tratamientos -> Antirreflejantes (subfamilia 9)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 9 FROM "Servicios" s WHERE s."Codigo" LIKE 'SRV-AR-%'
ON CONFLICT DO NOTHING;

-- Tratamientos -> Fotocromáticos (subfamilia 10)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 10 FROM "Servicios" s WHERE s."Codigo" LIKE 'SRV-FOTO-%'
ON CONFLICT DO NOTHING;

-- Tratamientos -> Coloraciones (subfamilia 12)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 12 FROM "Servicios" s WHERE s."Codigo" LIKE 'SRV-COLOR-%'
ON CONFLICT DO NOTHING;

-- Tratamientos -> Espejados (subfamilia 13)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 13 FROM "Servicios" s WHERE s."Codigo" LIKE 'SRV-ESPEJ-%' OR s."Codigo" = 'SRV-POLAR'
ON CONFLICT DO NOTHING;

-- Adaptación LC -> varias subfamilias (14-17)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 14 FROM "Servicios" s WHERE s."Codigo" = 'SRV-LC-ADAPT-BL'
ON CONFLICT DO NOTHING;

INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 15 FROM "Servicios" s WHERE s."Codigo" = 'SRV-LC-ADAPT-RGP'
ON CONFLICT DO NOTHING;

INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 16 FROM "Servicios" s WHERE s."Codigo" = 'SRV-LC-ORTOK'
ON CONFLICT DO NOTHING;

INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 17 FROM "Servicios" s WHERE s."Codigo" IN ('SRV-LC-REV', 'SRV-LC-ENSEÑ')
ON CONFLICT DO NOTHING;

-- Otros servicios -> Ajustes y Reparaciones (subfamilia 18)
INSERT INTO "ServiciosSubFamilias" ("IdServicio", "IdSubFamiliaServicio")
SELECT s."IdServicio", 18 FROM "Servicios" s WHERE s."Codigo" LIKE 'SRV-AJUSTE%' OR s."Codigo" LIKE 'SRV-REPAR%' OR s."Codigo" = 'SRV-LIMPIEZA-US'
ON CONFLICT DO NOTHING;
