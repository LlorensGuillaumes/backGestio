-- =====================================================
-- SCRIPT PARA ELIMINAR TABLAS NO USADAS
-- Backend usa versiones PascalCase, estas son snake_case duplicadas
-- Excluye: revisiones y datos_empresa (tienen datos)
-- =====================================================

-- Primero limpiar cualquier transaccion fallida
ROLLBACK;

BEGIN TRANSACTION;

-- =====================================================
-- DOCUMENTOS (depende de tratamientos)
-- =====================================================
DROP TABLE IF EXISTS documentos_pagos CASCADE;
DROP TABLE IF EXISTS documentos_lineas CASCADE;
DROP TABLE IF EXISTS encargo_montaje CASCADE;
DROP TABLE IF EXISTS documentos CASCADE;

-- =====================================================
-- FACTURAS VENTA (depende de tratamientos)
-- =====================================================
DROP TABLE IF EXISTS facturas_venta_resumen_iva CASCADE;
DROP TABLE IF EXISTS facturas_venta_pagos CASCADE;
DROP TABLE IF EXISTS facturas_venta_lineas CASCADE;
DROP TABLE IF EXISTS facturas_venta CASCADE;

-- =====================================================
-- CAJA (depende de tratamientos)
-- =====================================================
DROP TABLE IF EXISTS caja_movimientos_pagos CASCADE;
DROP TABLE IF EXISTS caja_movimientos_lineas CASCADE;
DROP TABLE IF EXISTS caja_movimientos CASCADE;
DROP TABLE IF EXISTS tipos_pago CASCADE;

-- =====================================================
-- COMPRAS
-- =====================================================
DROP TABLE IF EXISTS compras_devoluciones_lineas CASCADE;
DROP TABLE IF EXISTS compras_devoluciones CASCADE;
DROP TABLE IF EXISTS factura_compra_linea_recepcion_rel CASCADE;
DROP TABLE IF EXISTS facturas_compra_resumen_iva CASCADE;
DROP TABLE IF EXISTS facturas_compra_lineas CASCADE;
DROP TABLE IF EXISTS facturas_compra CASCADE;
DROP TABLE IF EXISTS compras_recepciones_lineas CASCADE;
DROP TABLE IF EXISTS compras_recepciones CASCADE;
DROP TABLE IF EXISTS compras_ordenes_lineas CASCADE;
DROP TABLE IF EXISTS compras_ordenes CASCADE;
DROP TABLE IF EXISTS pagos_proveedor CASCADE;
DROP TABLE IF EXISTS subfamilias_gasto CASCADE;
DROP TABLE IF EXISTS familias_gasto CASCADE;

-- =====================================================
-- STOCK
-- =====================================================
DROP TABLE IF EXISTS movimientos_stock CASCADE;
DROP TABLE IF EXISTS productos_stock CASCADE;

-- =====================================================
-- PRODUCTOS (relaciones)
-- =====================================================
DROP TABLE IF EXISTS productos_subfamilias CASCADE;
DROP TABLE IF EXISTS productos_proveedores CASCADE;

-- =====================================================
-- PROVEEDORES (relaciones)
-- =====================================================
DROP TABLE IF EXISTS proveedores_subfamilias CASCADE;
DROP TABLE IF EXISTS proveedores_telefonos CASCADE;
DROP TABLE IF EXISTS proveedores_contactos CASCADE;

-- =====================================================
-- TRATAMIENTOS (relaciones)
-- =====================================================
DROP TABLE IF EXISTS tratamientos_grupo_rel CASCADE;
DROP TABLE IF EXISTS tratamientos_grupos CASCADE;
DROP TABLE IF EXISTS tratamientos_subfamilia_producto CASCADE;
DROP TABLE IF EXISTS tratamientos_productos CASCADE;
DROP TABLE IF EXISTS tratamientos_subfamilias CASCADE;

-- =====================================================
-- SERVICIOS (relaciones)
-- =====================================================
DROP TABLE IF EXISTS servicios_subfamilias CASCADE;

-- =====================================================
-- TRATAMIENTOS (principales)
-- =====================================================
DROP TABLE IF EXISTS subfamilias_tratamientos CASCADE;
DROP TABLE IF EXISTS familias_tratamientos CASCADE;
DROP TABLE IF EXISTS tratamientos CASCADE;

-- =====================================================
-- SERVICIOS (principales)
-- =====================================================
DROP TABLE IF EXISTS subfamilias_servicios CASCADE;
DROP TABLE IF EXISTS familias_servicios CASCADE;
DROP TABLE IF EXISTS servicios CASCADE;

-- =====================================================
-- PRODUCTOS (principales)
-- =====================================================
DROP TABLE IF EXISTS subfamilias_productos CASCADE;
DROP TABLE IF EXISTS familias_productos CASCADE;
DROP TABLE IF EXISTS marcas CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS iva_tipos CASCADE;
DROP TABLE IF EXISTS iva_familias CASCADE;

-- =====================================================
-- PROVEEDORES (principales)
-- =====================================================
DROP TABLE IF EXISTS subfamilias_proveedores CASCADE;
DROP TABLE IF EXISTS familias_proveedores CASCADE;
DROP TABLE IF EXISTS proveedor_empresa CASCADE;
DROP TABLE IF EXISTS proveedor_persona CASCADE;
DROP TABLE IF EXISTS proveedores CASCADE;

-- =====================================================
-- MIOPIA
-- =====================================================
DROP TABLE IF EXISTS miopia_decisiones CASCADE;
DROP TABLE IF EXISTS miopia_mediciones CASCADE;
DROP TABLE IF EXISTS miopia_visitas CASCADE;
DROP TABLE IF EXISTS miopia_plan CASCADE;

-- =====================================================
-- ORTOQUERATOLOGIA
-- =====================================================
DROP TABLE IF EXISTS ortok_evaluacion CASCADE;
DROP TABLE IF EXISTS ortok_parametros_lente CASCADE;

-- =====================================================
-- LENTES DE CONTACTO
-- =====================================================
DROP TABLE IF EXISTS lc_evaluacion CASCADE;
DROP TABLE IF EXISTS lc_plan CASCADE;
DROP TABLE IF EXISTS lc_visitas CASCADE;
DROP TABLE IF EXISTS lc_lentes CASCADE;
DROP TABLE IF EXISTS lc_adaptaciones CASCADE;

-- =====================================================
-- REVISIONES (excepto 'revisiones' que tiene datos)
-- =====================================================
DROP TABLE IF EXISTS rev_queratometria_topografia CASCADE;
DROP TABLE IF EXISTS rev_salud_ocular CASCADE;
DROP TABLE IF EXISTS rev_motilidad_pupilas CASCADE;
DROP TABLE IF EXISTS rev_binocular CASCADE;
DROP TABLE IF EXISTS rev_refraccion_final CASCADE;
DROP TABLE IF EXISTS rev_refraccion_objetiva CASCADE;
DROP TABLE IF EXISTS rev_agudeza_visual CASCADE;

-- =====================================================
-- HISTORIA CLINICA
-- =====================================================
DROP TABLE IF EXISTS hc_habitos CASCADE;
DROP TABLE IF EXISTS hc_alergias CASCADE;
DROP TABLE IF EXISTS hc_medicacion CASCADE;
DROP TABLE IF EXISTS hc_antecedentes CASCADE;

COMMIT;
