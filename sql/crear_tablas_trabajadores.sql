-- ============================================================
-- ARCHIVO OBSOLETO - NO EJECUTAR
-- ============================================================
--
-- Las tablas de trabajadores han sido migradas:
-- - Trabajadores -> usuarios (en gestio_master)
-- - Convenios -> convenios (en gestio_master)
-- - HorarioTrabajador -> horarios_usuario (en gestio_master)
-- - AusenciasTrabajador -> ausencias_usuario (en gestio_master)
-- - FestivosEmpresa -> se mantiene en gestio_db
--
-- Ver archivos:
-- - migracion_usuarios_trabajadores_master.sql (ejecutar en gestio_master)
-- - migracion_usuarios_trabajadores_empresa.sql (ejecutar en cada gestio_db)
-- ============================================================

-- Este archivo no hace nada, solo documenta el cambio
SELECT 'ARCHIVO OBSOLETO - Ver migracion_usuarios_trabajadores_*.sql' AS aviso;
