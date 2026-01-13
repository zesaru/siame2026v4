@echo off
echo Verificando datos despues del reset...
echo.

"C:\Program Files\PostgreSQL\18\bin\psql.exe" -d siame2026 -c "SELECT 'GuiaValija' as tabla, COUNT(*) as total FROM guias_valija UNION ALL SELECT 'HojaRemision', COUNT(*) FROM hojas_remision UNION ALL SELECT 'Document', COUNT(*) FROM documents UNION ALL SELECT 'Users', COUNT(*) FROM users;"

echo.
echo Verificacion completa. Presiona cualquier tecla para salir...
pause > nul
