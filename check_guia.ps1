$query = @"
SELECT id, numeroGuia, fechaEnvio, estado, filePath FROM guias_valija WHERE numeroGuia LIKE '%24%' ORDER BY createdAt DESC LIMIT 1;
SELECT id, numeroItem, destinatario, contenido, remitente FROM guias_valija_items WHERE guia_valija_id = (SELECT id FROM guias_valija WHERE numeroGuia LIKE '%24%' ORDER BY createdAt DESC LIMIT 1) ORDER BY numeroItem;
SELECT id, numeroCompleto, numero, siglaUnidad, para, asunto FROM hojas_remision WHERE numeroCompleto LIKE '%24%' ORDER BY createdAt DESC;
"@

& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -d siame2026 -c $query
