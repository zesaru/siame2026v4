-- Script para limpiar tablas de datos de SIAME 2026
-- Ejecutar en orden correcto (respetando foreign keys)

-- 1. Limpiar Oficio (no tiene dependencias)
DELETE FROM "Oficio";

-- 2. Limpiar items de Hoja de Remisión
DELETE FROM "RemisionItem";

-- 3. Limpiar Hoja de Remisión
DELETE FROM "HojaRemision";

-- 4. Limpiar Precintos de Guía de Valija
DELETE FROM "GuiaValijaPrecinto";

-- 5. Limpiar Items de Guía de Valija
DELETE FROM "GuiaValijaItem";

-- 6. Limpiar Guía de Valija
DELETE FROM "GuiaValija";

-- 7. Limpiar Document
DELETE FROM "Document";

-- Reiniciar secuencias
ALTER SEQUENCE "GuiaValija_id_seq" RESTART WITH 1;
ALTER SEQUENCE "GuiaValijaItem_id_seq" RESTART WITH 1;
ALTER SEQUENCE "GuiaValijaPrecinto_id_seq" RESTART WITH 1;
ALTER SEQUENCE "HojaRemision_id_seq" RESTART WITH 1;
ALTER SEQUENCE "RemisionItem_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Oficio_id_seq" RESTART WITH 1;
ALTER SEQUENCE "Document_id_seq" RESTART WITH 1;
