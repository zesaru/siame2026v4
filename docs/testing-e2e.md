# Pruebas E2E con Playwright

## Objetivo

Dejar una base de pruebas E2E estable para validar los flujos críticos del sistema:

- login
- acceso al dashboard
- navegacion a guias de valija
- navegacion a hojas de remision
- acceso a documentos pendientes
- visibilidad de acciones por rol
- carga por lote de guias

## Instalacion

```bash
pnpm install
pnpm run test:e2e:install
```

## Variables de entorno

Valores por defecto:

- `E2E_BASE_URL=http://127.0.0.1:3000`
- `E2E_ADMIN_EMAIL=admin@siame.com`
- `E2E_ADMIN_PASSWORD=temp123`

Variables opcionales para cubrir permisos de usuario comun:

- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`

Ejemplo:

```bash
E2E_BASE_URL=http://127.0.0.1:3000 \
E2E_ADMIN_EMAIL=admin@siame.com \
E2E_ADMIN_PASSWORD=temp123 \
E2E_USER_EMAIL=usuario@siame.com \
E2E_USER_PASSWORD=secret \
pnpm run test:e2e
```

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
- El test de `USER` queda en `skip` si no existen `E2E_USER_EMAIL` y `E2E_USER_PASSWORD`.

## Suite actual

- [auth.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/auth.spec.ts)
- [navigation.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/navigation.spec.ts)
- [business-navigation.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/business-navigation.spec.ts)
- [roles.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/roles.spec.ts)
- [batch-upload.spec.ts](/mnt/c/users/embto/documents/github/siame2026v4/e2e/batch-upload.spec.ts)
