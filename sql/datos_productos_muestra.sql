-- ============================================
-- PRODUCTOS DE MUESTRA
-- Ejecutar después de crear las tablas base
-- ============================================

-- Asegurarse de que las marcas existen
INSERT INTO "Marcas" ("Descripcion", "Activa") VALUES
    ('Ray-Ban', 1),
    ('Oakley', 1),
    ('Essilor', 1),
    ('Hoya', 1),
    ('Zeiss', 1),
    ('Acuvue', 1),
    ('CooperVision', 1),
    ('Bausch & Lomb', 1),
    ('Prada', 1),
    ('Gucci', 1),
    ('Silhouette', 1),
    ('Alcon', 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- PRODUCTOS: MONTURAS GAFAS GRADUADAS
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
-- Ray-Ban (IdMarca = 1)
('RB5154-2000', 'Ray-Ban Clubmaster RB5154', 'Montura Clubmaster negro/dorado 51mm', 1, 145.00, 72.50, 8, 2, 1),
('RB5228-2000', 'Ray-Ban RB5228 Rectangular', 'Montura rectangular negro brillante 53mm', 1, 125.00, 62.50, 12, 3, 1),
('RB7047-5196', 'Ray-Ban RB7047 Rubber', 'Montura deportiva gris mate 56mm', 1, 115.00, 57.50, 6, 2, 1),

-- Oakley (IdMarca = 2)
('OX8046-0155', 'Oakley Airdrop OX8046', 'Montura deportiva negro satinado 55mm', 2, 165.00, 82.50, 5, 2, 1),
('OX3227-0155', 'Oakley Steel Plate OX3227', 'Montura titanio gunmetal 54mm', 2, 195.00, 97.50, 4, 1, 1),

-- Prada (IdMarca = 9)
('VPR16M-1AB', 'Prada VPR16M', 'Montura elegante negro 52mm', 9, 245.00, 122.50, 3, 1, 1),
('VPR19O-2AU', 'Prada VPR19O Havana', 'Montura carey tortuga 54mm', 9, 235.00, 117.50, 4, 1, 1),

-- Gucci (IdMarca = 10)
('GG0025O-001', 'Gucci GG0025O', 'Montura cuadrada negro 56mm', 10, 275.00, 137.50, 3, 1, 1),
('GG0121O-002', 'Gucci GG0121O Havana', 'Montura redonda carey 49mm', 10, 265.00, 132.50, 2, 1, 1),

-- Silhouette (IdMarca = 11)
('SIL5515-6560', 'Silhouette Titan Minimal', 'Montura ultraligera titanio 52mm', 11, 320.00, 160.00, 4, 1, 1);

-- ============================================
-- PRODUCTOS: GAFAS DE SOL
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
-- Ray-Ban Sol
('RB3025-L0205', 'Ray-Ban Aviator Classic', 'Gafa sol aviador dorado/verde G-15 58mm', 1, 165.00, 82.50, 10, 3, 1),
('RB2140-901', 'Ray-Ban Wayfarer Original', 'Gafa sol wayfarer negro/verde G-15 50mm', 1, 155.00, 77.50, 12, 3, 1),
('RB4165-622/55', 'Ray-Ban Justin', 'Gafa sol rectangular negro mate/azul 54mm', 1, 125.00, 62.50, 8, 2, 1),
('RB3447-001', 'Ray-Ban Round Metal', 'Gafa sol redonda dorado/verde 50mm', 1, 175.00, 87.50, 6, 2, 1),

-- Oakley Sol Polarizadas
('OO9102-E255', 'Oakley Holbrook Polarized', 'Gafa sol polarizada negro/prizm 55mm', 2, 185.00, 92.50, 5, 2, 1),
('OO9208-5138', 'Oakley Radar EV Path', 'Gafa sol deportiva negro/prizm road', 2, 225.00, 112.50, 4, 1, 1),

-- Prada Sol
('SPR01OS-1AB', 'Prada SPR01OS', 'Gafa sol negro/gris degradado 55mm', 9, 295.00, 147.50, 3, 1, 1);

-- ============================================
-- PRODUCTOS: CRISTALES/LENTES OFTÁLMICAS
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
-- Essilor (IdMarca = 3)
('ESS-MONO-STD', 'Lente Essilor Monofocal', 'Cristal monofocal orgánico 1.5 blanco', 3, 45.00, 22.50, 50, 10, 1),
('ESS-MONO-THIN', 'Lente Essilor Monofocal 1.6', 'Cristal monofocal reducido 1.6', 3, 75.00, 37.50, 30, 8, 1),
('ESS-MONO-ULTRA', 'Lente Essilor Monofocal 1.67', 'Cristal monofocal ultra reducido 1.67', 3, 125.00, 62.50, 20, 5, 1),
('ESS-VARI-ADAPT', 'Lente Essilor Varilux Comfort', 'Progresivo Varilux Comfort 1.5', 3, 195.00, 97.50, 15, 4, 1),
('ESS-VARI-PHYS', 'Lente Essilor Varilux Physio', 'Progresivo Varilux Physio 3.0', 3, 295.00, 147.50, 10, 3, 1),
('ESS-VARI-XSER', 'Lente Essilor Varilux X Series', 'Progresivo premium Varilux X', 3, 395.00, 197.50, 8, 2, 1),

-- Hoya (IdMarca = 4)
('HOYA-MONO-STD', 'Lente Hoya Monofocal', 'Cristal monofocal orgánico 1.5', 4, 42.00, 21.00, 45, 10, 1),
('HOYA-MONO-NYL', 'Lente Hoya Nulux 1.6', 'Cristal monofocal Nulux reducido', 4, 72.00, 36.00, 25, 6, 1),
('HOYA-PROG-LIFE', 'Lente Hoya LifeStyle 3', 'Progresivo LifeStyle personalizado', 4, 285.00, 142.50, 12, 3, 1),
('HOYA-PROG-HOYA', 'Lente Hoya Hoyalux iD', 'Progresivo premium Hoyalux', 4, 375.00, 187.50, 8, 2, 1),

-- Zeiss (IdMarca = 5)
('ZEISS-MONO-CLR', 'Lente Zeiss ClearView', 'Cristal monofocal 1.5 asférico', 5, 55.00, 27.50, 40, 10, 1),
('ZEISS-MONO-SMT', 'Lente Zeiss SmartLife 1.6', 'Cristal monofocal digital 1.6', 5, 95.00, 47.50, 20, 5, 1),
('ZEISS-PROG-PRE', 'Lente Zeiss Progressive Precision', 'Progresivo Precision Pure', 5, 325.00, 162.50, 10, 3, 1),
('ZEISS-PROG-IND', 'Lente Zeiss Individual 2', 'Progresivo Individual personalizado', 5, 450.00, 225.00, 6, 2, 1);

-- ============================================
-- PRODUCTOS: LENTES DE CONTACTO DIARIAS
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
-- Acuvue (IdMarca = 6)
('ACV-1DAY-MOIST', 'Acuvue 1-Day Moist 30u', 'Lentillas diarias hidratación 30 unidades', 6, 28.00, 14.00, 50, 10, 1),
('ACV-1DAY-MOIST90', 'Acuvue 1-Day Moist 90u', 'Lentillas diarias hidratación 90 unidades', 6, 65.00, 32.50, 30, 8, 1),
('ACV-OASYS-1DAY', 'Acuvue Oasys 1-Day 30u', 'Lentillas diarias premium HydraLuxe', 6, 38.00, 19.00, 40, 10, 1),
('ACV-OASYS-1DAY90', 'Acuvue Oasys 1-Day 90u', 'Lentillas diarias premium 90 unidades', 6, 85.00, 42.50, 25, 6, 1),

-- CooperVision (IdMarca = 7)
('CV-MYDAY-30', 'MyDay Daily 30u', 'Lentillas diarias silicona hidrogel 30u', 7, 32.00, 16.00, 45, 10, 1),
('CV-MYDAY-90', 'MyDay Daily 90u', 'Lentillas diarias silicona hidrogel 90u', 7, 72.00, 36.00, 28, 6, 1),
('CV-CLARITI-30', 'Clariti 1 Day 30u', 'Lentillas diarias económicas 30u', 7, 22.00, 11.00, 60, 15, 1),

-- Bausch & Lomb (IdMarca = 8)
('BL-BIOTRUE-30', 'Biotrue ONEday 30u', 'Lentillas diarias bio-inspiradas 30u', 8, 30.00, 15.00, 40, 10, 1),
('BL-BIOTRUE-90', 'Biotrue ONEday 90u', 'Lentillas diarias bio-inspiradas 90u', 8, 68.00, 34.00, 25, 6, 1);

-- ============================================
-- PRODUCTOS: LENTES DE CONTACTO MENSUALES
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
-- Acuvue
('ACV-OASYS-6', 'Acuvue Oasys 6u', 'Lentillas mensuales Hydraclear Plus 6u', 6, 42.00, 21.00, 35, 8, 1),
('ACV-VITA-6', 'Acuvue Vita 6u', 'Lentillas mensuales HydraMax 6u', 6, 48.00, 24.00, 30, 6, 1),

-- CooperVision
('CV-BIOFIN-XR-6', 'Biofinity XR 6u', 'Lentillas mensuales altas graduaciones', 7, 55.00, 27.50, 25, 5, 1),
('CV-BIOFIN-6', 'Biofinity 6u', 'Lentillas mensuales Aquaform 6u', 7, 45.00, 22.50, 40, 10, 1),

-- Bausch & Lomb
('BL-ULTRA-6', 'Bausch+Lomb ULTRA 6u', 'Lentillas mensuales MoistureSeal 6u', 8, 52.00, 26.00, 30, 6, 1),

-- Alcon (IdMarca = 12)
('ALC-AIR-OPT-6', 'Air Optix Aqua 6u', 'Lentillas mensuales SmartShield 6u', 12, 48.00, 24.00, 35, 8, 1),
('ALC-TOTAL-1-6', 'Dailies Total 1 90u', 'Lentillas diarias premium water gradient', 12, 95.00, 47.50, 20, 5, 1);

-- ============================================
-- PRODUCTOS: LÍQUIDOS Y SOLUCIONES
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
-- Alcon
('ALC-OPTIFREE-360', 'Opti-Free PureMoist 360ml', 'Solución única multiusos 360ml', 12, 14.50, 7.25, 50, 15, 1),
('ALC-OPTIFREE-2X300', 'Opti-Free PureMoist 2x300ml', 'Pack solución multiusos', 12, 22.00, 11.00, 30, 10, 1),
('ALC-AOSEPT-360', 'AOSept Plus 360ml', 'Solución peróxido con HydraGlyde', 12, 16.00, 8.00, 40, 10, 1),

-- Bausch & Lomb
('BL-BIOTRUE-360', 'Biotrue 360ml', 'Solución biotrue multiusos 360ml', 8, 13.50, 6.75, 45, 12, 1),
('BL-BIOTRUE-2X300', 'Biotrue 2x300ml', 'Pack solución Biotrue', 8, 20.00, 10.00, 25, 8, 1),
('BL-RENU-360', 'ReNu MultiPlus 360ml', 'Solución multiusos económica', 8, 11.00, 5.50, 50, 15, 1);

-- ============================================
-- PRODUCTOS: ACCESORIOS
-- ============================================
INSERT INTO "Productos" ("Codigo", "Nombre", "Descripcion", "IdMarca", "PVP", "PrecioCoste", "Stock", "StockMinimo", "Activo") VALUES
('ACC-FUNDA-RIG', 'Funda rígida universal', 'Estuche rígido para gafas negro', NULL, 8.00, 4.00, 100, 20, 1),
('ACC-FUNDA-SEMI', 'Funda semi-rígida', 'Estuche semi-rígido con cierre', NULL, 6.00, 3.00, 80, 20, 1),
('ACC-GAMUZA-MF', 'Gamuza microfibra', 'Paño limpieza microfibra 15x15cm', NULL, 3.00, 1.50, 200, 50, 1),
('ACC-SPRAY-LIMP', 'Spray limpiador 60ml', 'Spray limpiador lentes sin alcohol', NULL, 5.50, 2.75, 100, 25, 1),
('ACC-CORD-NEOPR', 'Cordón neopreno', 'Cordón deportivo ajustable', NULL, 4.50, 2.25, 60, 15, 1),
('ACC-EST-LC-DUO', 'Estuche lentillas doble', 'Portalentillas con espejo', NULL, 3.50, 1.75, 80, 20, 1),
('ACC-PINZA-LC', 'Pinza para lentillas', 'Pinza extracción lentillas silicona', NULL, 4.00, 2.00, 50, 15, 1);

-- ============================================
-- ASIGNAR PRODUCTOS A SUBFAMILIAS
-- (Las subfamilias fueron creadas anteriormente)
-- IdSubFamiliaProducto:
-- 1 = Monofocales, 2 = Progresivos, 3 = Ocupacionales
-- 4 = Polarizadas, 5 = Graduadas Sol
-- 6 = Diarias, 7 = Mensuales
-- 8 = Soluciones, 9 = Estuches
-- ============================================

-- Monturas graduadas -> Monofocales (subfamilia 1)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 1 FROM "Productos" p WHERE p."Codigo" LIKE 'RB5%' OR p."Codigo" LIKE 'RB7%' OR p."Codigo" LIKE 'OX%' OR p."Codigo" LIKE 'VPR%' OR p."Codigo" LIKE 'GG%' OR p."Codigo" LIKE 'SIL%'
ON CONFLICT DO NOTHING;

-- Gafas de sol polarizadas -> Polarizadas (subfamilia 4)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 4 FROM "Productos" p WHERE p."Codigo" LIKE 'OO%' OR (p."Codigo" LIKE 'RB%' AND p."Nombre" LIKE '%Polariz%')
ON CONFLICT DO NOTHING;

-- Gafas de sol no polarizadas -> Graduadas Sol (subfamilia 5)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 5 FROM "Productos" p WHERE p."Codigo" LIKE 'RB3%' OR p."Codigo" LIKE 'RB2%' OR p."Codigo" LIKE 'RB4%' OR p."Codigo" LIKE 'SPR%'
ON CONFLICT DO NOTHING;

-- Cristales monofocales -> Monofocales (subfamilia 1)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 1 FROM "Productos" p WHERE p."Nombre" LIKE '%Monofocal%'
ON CONFLICT DO NOTHING;

-- Cristales progresivos -> Progresivos (subfamilia 2)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 2 FROM "Productos" p WHERE p."Nombre" LIKE '%Progresivo%' OR p."Nombre" LIKE '%Varilux%' OR p."Nombre" LIKE '%LifeStyle%' OR p."Nombre" LIKE '%Hoyalux%' OR p."Nombre" LIKE '%Individual%'
ON CONFLICT DO NOTHING;

-- Lentillas diarias -> Diarias (subfamilia 6)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 6 FROM "Productos" p WHERE p."Nombre" LIKE '%1-Day%' OR p."Nombre" LIKE '%Daily%' OR p."Nombre" LIKE '%ONEday%' OR p."Nombre" LIKE '%1 Day%' OR p."Nombre" LIKE '%Total 1%'
ON CONFLICT DO NOTHING;

-- Lentillas mensuales -> Mensuales (subfamilia 7)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 7 FROM "Productos" p WHERE (p."Nombre" LIKE '%6u%' OR p."Nombre" LIKE '%mensual%') AND p."Nombre" NOT LIKE '%Daily%' AND p."Nombre" NOT LIKE '%1-Day%'
ON CONFLICT DO NOTHING;

-- Soluciones -> Soluciones (subfamilia 8)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 8 FROM "Productos" p WHERE p."Nombre" LIKE '%Solución%' OR p."Nombre" LIKE '%ml%' OR p."Codigo" LIKE 'ALC-OPTI%' OR p."Codigo" LIKE 'ALC-AOS%' OR p."Codigo" LIKE 'BL-BIO%' OR p."Codigo" LIKE 'BL-RENU%'
ON CONFLICT DO NOTHING;

-- Accesorios -> Estuches (subfamilia 9)
INSERT INTO "ProductosSubFamilias" ("IdProducto", "IdSubFamiliaProducto")
SELECT p."IdProducto", 9 FROM "Productos" p WHERE p."Codigo" LIKE 'ACC-%'
ON CONFLICT DO NOTHING;
