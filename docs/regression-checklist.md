# Regression Checklist (Smoke)

## Pre-checks
- Run `pnpm lint`
- Run `pnpm exec vitest run`
- Verify app boots on dev server (`http://localhost:3010`)
- Login with dev super admin (`admin@siame2026.local`)

## Authentication
- Sign in succeeds and redirects to `/dashboard`
- Invalid credentials show error message
- Protected pages redirect to `/auth/signin` when session is missing

## Dashboard Usuarios (Admin)
- Open `/dashboard/usuarios`
- Users list loads without console/runtime errors
- Create user works (success toast/message)
- Edit user works (role/email update)
- Delete user works (cannot delete own account)
- Change password flow works from `/api/user/change-password`

## Guías de Valija
- Open `/dashboard/guias-valija` (list loads)
- Search/filter works without lag/runtime errors
- Create guía (`/dashboard/guias-valija/new`) saves successfully
- Edit guía updates items and persists changes
- Delete guía removes row and refreshes list
- Process from analyzed document (`/api/guias-valija/procesar`) returns success
- View file (`/api/files/...`) opens for owned guía

## Hojas de Remisión
- Open `/dashboard/hojas-remision` (list + filters)
- Create / edit / delete hoja work
- View hoja detail page loads
- File endpoint `/api/hojas-remision/file/[id]` serves file
- Analyze endpoint `/api/analyze/hoja-remision` returns parsed response

## Documentos
- Upload document from `/dashboard/documents`
- `/api/analyze` returns analysis + documentId
- `/api/analyze/document-type` returns recommendation
- Document history modal loads and paginates
- Select history item opens details correctly
- Update key-value pairs (`PUT /api/documents/[id]`) persists
- Delete document removes it from history list

## API / Error Handling
- Unauthorized API access returns `401`
- Missing resources return `404` (documents/guias/hojas/files)
- Invalid payloads return `400` with validation details where applicable
