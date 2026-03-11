# Pruebas E2E con Playwright

## Objetivo

Dejar una base de pruebas E2E estable para validar los flujos críticos del sistema:

- login
- acceso al dashboard
- navegacion a guias de valija
- navegacion a hojas de remision
- acceso a documentos pendientes
- visibilidad de acciones por rol
- acceso a pantallas administrativas por rol
- carga por lote de guias
- guardado mockeado del lote
- navegación y edición de items y oficios

## Instalacion

```bash
pnpm install
pnpm run test:e2e:install
cp .env.e2e.example .env.e2e
```

## Variables de entorno

Valores por defecto:

- `E2E_BASE_URL=http://127.0.0.1:3000`
- `E2E_ADMIN_EMAIL=admin@siame.com`
- `E2E_ADMIN_PASSWORD=temp123`

Variables opcionales para ampliar cobertura por rol:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `E2E_SUPER_ADMIN_EMAIL`
- `E2E_SUPER_ADMIN_PASSWORD`

Archivo de referencia:

- [.env.e2e.example](/mnt/c/users/embto/documents/github/siame2026v4/.env.e2e.example)

Importante:

- `playwright.config.ts` carga `.env.e2e` automáticamente si existe.
- Ya no hace falta `source .env.e2e` antes de correr la suite.

## Comandos

```bash
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run test:e2e:headed
```

## Notas operativas

- La suite corre con `workers: 1` porque este repo no es estable con concurrencia sobre `next dev`.
- El config intenta reutilizar un servidor ya levantado.
- Si no existe uno, Playwright arranca `next dev` con `webpack`.
- Los reportes HTML quedan en `playwright-report/`.
- Los artefactos temporales quedan en `test-results/`.
- Los tests de `USER` y `SUPER_ADMIN` quedan en `skip` si faltan sus credenciales.
- Los tests avanzados de lote y edición mockean backend para validar UI sin depender de Azure ni de mutar datos reales.

## Suite actual

- [auth.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/auth.spec.ts)
- [navigation.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/navigation.spec.ts)
- [business-navigation.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/business-navigation.spec.ts)
- [roles.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/roles.spec.ts)
- [batch-upload.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/batch-upload.spec.ts)
- [delete-flows.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/delete-flows.spec.ts)
- [edit-save-flows.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/edit-save-flows.spec.ts)
- [items-oficios.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/items-oficios.spec.ts)
