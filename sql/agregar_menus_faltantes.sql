-- =============================================
-- AGREGAR MENUS FALTANTES
-- =============================================
-- Ejecutar en gestio_master

-- Menús de RRHH
INSERT INTO menus (codigo, nombre_es, nombre_ca, grupo, orden) VALUES
('rrhh.trabajadores', 'Trabajadores', 'Treballadors', 'rrhh', 40),
('rrhh.festivos', 'Festivos', 'Festius', 'rrhh', 41),
('rrhh.convenios', 'Convenios', 'Convenis', 'rrhh', 42),
('rrhh.control_horario', 'Control Horario', 'Control Horari', 'rrhh', 43)
ON CONFLICT (codigo) DO NOTHING;

-- Menú de Agenda
INSERT INTO menus (codigo, nombre_es, nombre_ca, grupo, orden) VALUES
('agenda', 'Agenda', 'Agenda', 'general', 30)
ON CONFLICT (codigo) DO NOTHING;

-- Menú de Inventario
INSERT INTO menus (codigo, nombre_es, nombre_ca, grupo, orden) VALUES
('inventario', 'Inventario', 'Inventari', 'general', 60)
ON CONFLICT (codigo) DO NOTHING;

-- Verificar que se crearon
SELECT codigo, nombre_es, grupo, orden FROM menus WHERE grupo IN ('rrhh', 'general') ORDER BY grupo, orden;
