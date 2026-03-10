# Pruebas E2E con Playwright

## Objetivo

Dejar una base de smoke tests para validar los flujos minimos del sistema:

- login
- acceso al dashboard
- navegacion a guias de valija
- navegacion a hojas de remision
- acceso a documentos pendientes

## Instalacion

```bash
pnpm install
pnpm run test:e2e:install
```

## Variables opcionales

Por defecto los tests usan:

- `E2E_BASE_URL=http://127.0.0.1:3000`
- `E2E_USER_EMAIL=admin@siame.com`
- `E2E_USER_PASSWORD=temp123`

Puedes sobrescribirlas:

```bash
E2E_BASE_URL=http://localhost:3000 \
E2E_USER_EMAIL=admin@siame.com \
E2E_USER_PASSWORD=temp123 \
pnpm run test:e2e
```

## Comandos

```bash
pnpm run test:e2e
pnpm run test:e2e:ui
pnpm run test:e2e:headed
```

## Notas operativas

- El config intenta reutilizar un servidor ya levantado.
- Si no existe uno, Playwright arranca `npm run dev`.
- Los reportes HTML quedan en `playwright-report/`.
- Los artefactos temporales quedan en `test-results/`.

## Suite inicial

- [auth.spec.ts](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/e2e/auth.spec.ts)
- [navigation.spec.ts](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/e2e/navigation.spec.ts)
