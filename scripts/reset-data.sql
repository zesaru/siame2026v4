-- Reset de datos manteniendo usuarios
-- Ejecutar: psql -d siame2026 -f scripts/reset-data.sql

BEGIN;

TRUNCATE TABLE
  file_audit_logs,
  hojas_remision,
  guias_valija_precintos,
  guias_valija_items,
  guias_valija,
  documents,
  verification_tokens
RESTART IDENTITY CASCADE;

COMMIT;

-- Verificar que los usuarios siguen ahí
SELECT COUNT(*) as "Usuarios preservados" FROM users;
SELECT email, name FROM users;
