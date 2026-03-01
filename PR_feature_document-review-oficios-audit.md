# PR: Flujo de Revisión Documental + Oficios + Auditoría Normalizada

## Resumen
Este PR implementa el flujo completo de revisión manual para documentos clasificados por Azure, con foco en:
- Confirmación/rechazo explícito de análisis.
- Persistencia real de `Oficio` al confirmar.
- Cola de revisión robusta con UX optimista y filtros.
- Auditoría consistente (`VIEW/UPDATE/DELETE`) y control de ruido con `trackView`.

## Cambios Principales

### 1) Clasificación y Confirmación
- Se fortalece el flujo `/api/analyze/document-type/*` para:
  - Confirmar análisis y materializar registros finales.
  - Rechazar análisis con motivo obligatorio.
  - Soportar `oficio` como tipo válido de confirmación.
- `confirm` maneja idempotencia y compatibilidad con metadatos legacy.

### 2) Persistencia de Oficios
- Nuevo modelo `Oficio` en Prisma.
- Nueva migración:
  - `prisma/migrations/20260228215500_add_oficio_model/migration.sql`
- En confirmación:
  - Para `oficio`, se crea registro persistente y se retorna `recordId` real.

### 3) Dashboard de Oficios
- Nuevo flujo UI/API:
  - Listado: `GET /api/oficios`, página `/dashboard/oficios`
  - Detalle: `/dashboard/oficios/[id]/view`
  - Edición: `/dashboard/oficios/[id]/edit`
  - Eliminación: `DELETE /api/oficios/[id]` con confirmación UI.
- Sidebar actualizado con acceso a “Oficios”.

### 4) Cola de Revisión de Documentos
- Panel de revisión con:
  - Filtros por estado/tipo, paginación y acciones rápidas.
  - Confirm/reject con actualización optimista de filas.
  - Bloqueo de acciones redundantes por estado.
  - Motivo de rechazo obligatorio y consistente.

### 5) Auditoría Normalizada
- `AuditAction` incluye `UPDATE`.
- `DocumentType` incluye `OFICIO`.
- `audit-logs` UI soporta filtro/visualización de `OFICIO` + `UPDATE`.
- Lecturas técnicas pueden omitir `VIEW` usando `trackView=0`.

### 6) Control de `trackView` y Helpers
- Helper URL:
  - `withTrackView(url, boolean)` para cliente.
- Helper de decisión:
  - `shouldTrackView(url)` para endpoints.
- Aplicado en endpoints de detalle:
  - `oficios`, `guias-valija`, `hojas-remision`.
- Aplicado en consumers:
  - Vistas con `trackView=1` explícito.
  - Formularios técnicos con `trackView=0`.

### 7) Corrección de Bug
- En `HojaRemisionViewClient`, `DELETE` usaba `params.id` no definido.
- Corregido para usar `hojaId`.

## Pruebas Ejecutadas
- `npm run lint`
- `npm run test`
- Además, corridas enfocadas por módulo (`oficios`, `audit`, `review queue`, `analyze`), todas en verde.

## Impacto/Migración
- Requiere migración Prisma para crear `Oficio`.
  - `npx prisma migrate deploy` (o `npx prisma migrate dev` en entorno local)
  - `npx prisma generate` si aplica.

## Notas
- Se respetó estrategia de cambios atómicos por bloques funcionales.
- Se evitó mezclar rollback de archivos no relacionados en un worktree con cambios previos existentes.
