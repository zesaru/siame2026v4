# Security Phase 1 Baseline

Objetivo: establecer controles mínimos para evitar fugas de secretos y configuración insegura en desarrollo/CI.

## Qué incluye

- Script automatizado: `scripts/security-phase1-check.mjs`
- Script de validación runtime env: `scripts/security-runtime-env-check.mjs`
- Comando npm: `npm run security:phase1`
- Comando npm: `npm run security:env`
- Comando npm: `npm run security:rotate-local` (rotación local de secretos)
- Proxy global de headers seguros + rate limit temprano auth (`proxy.ts`)
- CSP en modo `Report-Only` + receptor de reportes (`/api/security/csp-report`)
- Persistencia local de reportes CSP en `storage/security/csp-reports.ndjson`
- Endpoint admin de consulta CSP reports: `/api/admin/security/csp-reports`
- Registro de sesiones activas por usuario (`AuthSession`) y revocación selectiva

## Activar CSP enforcement gradualmente

Por defecto el proxy envía `Content-Security-Policy-Report-Only`.

Para activar enforcement real en producción:

```env
SECURITY_CSP_MODE="enforce"
```

Recomendado:
1. Mantener `report-only` unos días.
2. Revisar reportes en `/api/security/csp-report`.
3. Ajustar allowlist.
4. Cambiar a `enforce`.
- Workflow CI: `.github/workflows/security-phase1.yml`
  - baseline de seguridad
  - escaneo de secretos con gitleaks

## Qué valida el baseline

- Que no existan archivos `.env*` versionados (excepto `.env.production.example`).
- Que no haya secretos/defaults inseguros en archivos versionados, por ejemplo:
  - `NEXTAUTH_SECRET=your-secret-key-change-this-in-production`
  - `SUPER_ADMIN_PASSWORD=ChangeMe123!`
  - Azure keys hardcodeadas
  - `DATABASE_URL` con password visible en archivos versionados

## Ejecución local

```bash
npm run security:phase1
npm run security:env
```

## Bloqueo en build/start

`build` y `start` ejecutan validación estricta de entorno:

- `prebuild`: `npm run security:env -- --strict`
- `prestart`: `npm run security:env -- --strict`

Si hay secretos por defecto o variables críticas faltantes, el proceso falla.

## Acciones manuales recomendadas (obligatorias)

1. Rotar credenciales actuales (DB, Azure, NextAuth, super admin).
2. Mantener `.env` fuera de git (ya está en `.gitignore`).
3. Usar solo `.env.production.example` como plantilla sin secretos reales.
4. Para entorno mixto WSL->Windows DB, actualizar host con:

```bash
npm run db:sync-wsl-host
```

5. Rotar secretos locales de desarrollo:

```bash
npm run security:rotate-local
```

## Criterio de salida de Fase 1

- CI verde en `Security Phase 1`.
- Sin findings del baseline local.
- Secretos rotados y confirmados por equipo.

## Fase 2.2 (sesiones activas)

- `GET /api/user/sessions`: lista sesiones activas del usuario autenticado.
- `POST /api/user/sessions/:sessionId/revoke`: revoca una sesión específica propia.
- `POST /api/user/sessions/revoke`: revoca todas las sesiones (por versionado de sesión).
- `GET /api/admin/users/:id/sessions`: lista sesiones activas de un usuario (admin/super admin).
- `POST /api/admin/users/:id/sessions/:sessionId/revoke`: revoca sesión específica de usuario administrado.
- `POST /api/admin/users/:id/sessions/revoke`: revoca todas las sesiones del usuario (admin/super admin).

## Fase 2.3 (límite de concurrencia)

- Variable `AUTH_MAX_ACTIVE_SESSIONS` (default `3`).
- En cada login se crea una sesión nueva y se revocan automáticamente las más antiguas que excedan el límite.
- Se registra evento de auditoría `SESSION_REVOKED_POLICY` cuando hay revocaciones automáticas.

## Fase 2.4 (idle timeout + limpieza)

- Variable `AUTH_SESSION_IDLE_TIMEOUT_MINUTES` (default `120`).
- Si una sesión supera el tiempo de inactividad, se invalida en la siguiente validación de JWT.
- Variable `AUTH_SESSION_RETENTION_DAYS` (default `30`) para limpieza histórica.
- Comando de limpieza:

```bash
npm run security:prune-sessions
```

## Fase 2.5 (monitoreo de sesiones)

- Endpoint admin: `GET /api/admin/security/session-metrics`.
- Métricas:
  - sesiones activas actuales,
  - usuarios con múltiples sesiones activas,
  - revocaciones por política (24h),
  - revocaciones por inactividad (24h).

## Fase 2.6 (alertas por umbral)

- Endpoint admin: `GET /api/admin/security/alerts`.
- Ventana configurable con `SECURITY_ALERT_WINDOW_MINUTES` (default `15`).
- Umbrales:
  - `SECURITY_ALERT_LOGIN_FAILED_THRESHOLD` (default `20`)
  - `SECURITY_ALERT_SESSION_POLICY_THRESHOLD` (default `10`)
  - `SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD` (default `8`)
- Alertas activas visibles en dashboard de auditoría para respuesta rápida.

## Fase 2.7 (quarantine por IP)

- Si una IP supera `AUTH_IP_QUARANTINE_THRESHOLD` fallos de login en la ventana `AUTH_IP_QUARANTINE_WINDOW_MINUTES`, se bloquea temporalmente.
- El bloqueo usa razón `ip_quarantine` dentro del evento `LOGIN_BLOCKED`.
- Nuevo umbral de alerta: `SECURITY_ALERT_IP_QUARANTINE_THRESHOLD` para detectar picos de bloqueos por cuarentena.

## Fase 2.8 (desbloqueo manual IP)

- Endpoint admin: `GET /api/admin/security/quarantined-ips` para listar IPs en cuarentena.
- Endpoint admin: `POST /api/admin/security/quarantined-ips/unblock` para crear override temporal `ALLOW`.
- Endpoint admin: `POST /api/admin/security/quarantined-ips/unblock/:overrideId` para revocar override antes de expiración.
- Duración por defecto del desbloqueo: `AUTH_IP_UNBLOCK_DEFAULT_MINUTES`.
- Disponible en dashboard de auditoría con acción de desbloqueo por IP.

## Fase 2.9 (incidentes de seguridad)

- Endpoint admin: `GET /api/admin/security/incidents`.
- Agrega feed consolidado de incidentes AUTH (fallos/bloqueos/revocaciones/overrides).
- Incluye severidad, IP, usuario, timestamp y detalles técnicos.
- Exportación CSV específica desde dashboard de auditoría.

## Fase 2.10 (gestión de incidentes)

- Tabla `SecurityIncidentState` para seguimiento operativo.
- Endpoint admin: `PATCH /api/admin/security/incidents/:id` para estado `open | ack | resolved` y nota.
- Dashboard permite transición rápida de estado por incidente.

## Fase 2.11 (SLA y priorización)

- Cada incidente calcula: `ageMinutes`, `slaTargetMinutes`, `slaBreached`, `priority`.
- SLA configurable:
  - `SECURITY_INCIDENT_SLA_HIGH_MINUTES`
  - `SECURITY_INCIDENT_SLA_MEDIUM_MINUTES`
- Dashboard resalta brechas de SLA y ordena por prioridad operativa.

## Fase 2.12 (KPIs y filtro de brecha SLA)

- Endpoint de incidentes retorna `stats` (`open`, `ack`, `resolved`, `openSlaBreached`).
- Filtro opcional `slaBreached=true` para priorizar incumplimientos activos.
- Dashboard muestra KPIs de incidentes y modo "solo SLA vencido".

## Fase 2.13 (notificación de brecha SLA)

- Endpoint admin: `POST /api/admin/security/incidents/notify-sla`.
- Envia resumen de incidentes con SLA vencido a webhook configurable.
- Variables:
  - `SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL`
  - `SECURITY_INCIDENT_NOTIFY_MIN_BREACH_COUNT`

## Fase 2.14 (resiliencia de notificaciones)

- Cooldown anti-spam por evento: `SECURITY_INCIDENT_NOTIFY_COOLDOWN_MINUTES`.
- Reintentos y timeout:
  - `SECURITY_INCIDENT_NOTIFY_MAX_RETRIES`
  - `SECURITY_INCIDENT_NOTIFY_TIMEOUT_MS`
- Bitácora persistente de entregas en `SecurityNotificationDelivery`.

## Fase 2.15 (operación programada)

- Script operativo: `npm run security:notify-sla` (modo scheduled).
- Opción `--force` para saltar cooldown en ejecuciones urgentes.
- Endpoint admin de observabilidad: `GET /api/admin/security/notification-deliveries`.

## Fase 2.16 (orquestación automatizada)

- Script unificado: `npm run security:ops`:
  1. `security:env`
  2. `security:prune-sessions`
  3. `security:notify-sla`
- Workflow programado: `.github/workflows/security-operations.yml` (cada hora).
- Requiere secret `SECURITY_DATABASE_URL` para ejecutar en GitHub Actions.

## Fase 2.17 (seguridad de dependencias)

- Script local/CI: `npm run security:deps` (basado en `npm audit --omit=dev`).
- Umbrales configurables:
  - `SECURITY_MAX_CRITICAL_VULNS`
  - `SECURITY_MAX_HIGH_VULNS`

## Fase 2.18 (SBOM y trazabilidad)

- Script `npm run security:sbom` genera `storage/security/sbom.json`.
- Workflow `.github/workflows/security-phase3-deps.yml` publica SBOM como artifact.

## Fase 3.1 (anti-CSRF en mutaciones críticas)

- Validación de origen confiable (`origin/referer` vs `host`) en endpoints mutables de seguridad/sesión.
- Utilidad central: `lib/security/request-guard.ts`.
- En desarrollo puede habilitarse bypass explícito para clientes técnicos:
  - `SECURITY_ALLOW_MISSING_ORIGIN=true` (no recomendado en producción).

## Fase 3.2 (bloqueo de cuenta por intentos fallidos)

- Campos en `User`: `failedLoginCount`, `lockedUntil`.
- Umbral configurable:
  - `AUTH_ACCOUNT_LOCK_THRESHOLD`
  - `AUTH_ACCOUNT_LOCK_MINUTES`
- Login bloquea temporalmente cuenta tras umbral y emite evento `LOGIN_BLOCKED`.

## Fase 3.3 (hardening de cambio de contraseña)

- `POST /api/user/change-password` ahora valida origen confiable (`origin/referer` vs `host`) para reducir riesgo CSRF.
- Al cambiar contraseña, se revocan sesiones activas de `AuthSession` del usuario.
- Se registra evento de auditoría `SESSION_REVOKED_SELF` con detalle `reason=password_changed`.
- El incremento de `sessionVersion` se mantiene en la actualización de contraseña para invalidar JWT previos.

## Fase 3.4 (hardening de signup)

- `POST /api/auth/signup` valida origen confiable (`origin/referer` vs `host`).
- Se eliminó el almacenamiento en memoria y ahora crea usuarios persistentes con hash (vía `auth.service`).
- Evita enumeración simple de cuentas devolviendo mensaje genérico cuando el email ya existe.
- Registra señal `SIGNUP_BLOCKED` por email duplicado y aplica rate-limit en registro.

## Fase 3.5 (política de contraseñas unificada)

- Política centralizada en `lib/security/password-policy.ts`.
- Regla única backend: mínimo `12` caracteres + mayúscula + minúscula + número.
- `lib/schemas/user.ts` y `POST /api/auth/signup` usan la misma validación.
- UI de gestión de usuarios actualizada para reflejar el mínimo de 12 caracteres.

## Fase 3.6 (reinicio de lockout al cambiar contraseña)

- `updatePassword` ahora hace una sola actualización atómica:
  - cambia hash de contraseña,
  - reinicia `failedLoginCount`,
  - limpia `lockedUntil`,
  - incrementa `sessionVersion`.
- Con esto, el cambio de contraseña invalida sesiones previas y también limpia bloqueo temporal de cuenta.

## Fase 3.7 (revocación completa de sesiones por usuario)

- `revokeUserSessionsByUserId` ahora aplica dos acciones:
  - incrementa `sessionVersion` del usuario,
  - marca `AuthSession` activas como revocadas (`revokedAt=NOW()`).
- Esto asegura invalidación por JWT y coherencia operativa en el registro de sesiones activas.

## Fase 3.8 (reautenticación forzada post password change)

- `POST /api/user/change-password` devuelve `requireReauth: true` y total de sesiones revocadas.
- UI de usuario cierra sesión automáticamente después de cambio de contraseña exitoso.
- Reduce ventana de uso de una sesión comprometida tras rotación de credencial.

## Fase 3.9 (rate-limit en cambio de contraseña)

- `POST /api/user/change-password` aplica rate-limit por identidad de usuario + IP.
- Respuesta de bloqueo: `429` con header `Retry-After`.
- Fallos (validación/password actual inválida) registran intento fallido; éxito registra reset de ventana.

## Fase 3.10 (no reutilizar contraseña actual)

- `changePasswordSchema` rechaza solicitudes donde `newPassword === currentPassword`.
- UI de perfil muestra error temprano cuando la nueva contraseña coincide con la actual.
- Reduce riesgo de rotación falsa de credencial y mejora higiene de contraseñas.

## Fase 3.11 (auditoría de intentos de cambio de contraseña)

- Nuevos eventos de auditoría AUTH:
  - `PASSWORD_CHANGE_FAILED`
  - `PASSWORD_CHANGE_BLOCKED`
- `POST /api/user/change-password` registra eventos en:
  - bloqueo por rate-limit,
  - validación inválida,
  - contraseña actual incorrecta.
- Dashboard de auditoría incorpora etiquetas, colores y filtro para estos eventos.

## Fase 3.12 (signup protegido por cuarentena IP persistente)

- `POST /api/auth/signup` ahora evalúa `authPersistentGuardCheck` además del rate-limit en memoria.
- Si la IP está en cuarentena persistente, responde `429` con `Retry-After`.
- Registra `SIGNUP_BLOCKED` con detalle `persistent:<reason>` para trazabilidad operativa.

## Fase 3.13 (sanitización de detalles en auditoría AUTH)

- Nuevo util: `lib/security/audit-log-sanitize.ts`.
- `logAuthSecurityEvent` ahora:
  - normaliza saltos de línea/tabulaciones en `details`,
  - limita longitud de `details` para evitar bloat de logs,
  - sanitiza identidad usada en `filePath` (`AUTH/<segmento-seguro>`).
- Reduce riesgo de log injection y mejora estabilidad del feed de incidentes.

## Fase 3.14 (observabilidad de registro exitoso)

- Nuevo evento de auditoría: `SIGNUP_SUCCESS`.
- `POST /api/auth/signup` registra evento exitoso con `userId`, email e IP.
- Dashboard de auditoría añade etiqueta/filtro para `SIGNUP_SUCCESS`.

## Fase 3.15 (incidentes de seguridad para cambio de contraseña)

- `listSecurityIncidents` ahora incluye:
  - `PASSWORD_CHANGE_FAILED`
  - `PASSWORD_CHANGE_BLOCKED`
- Ambos eventos se clasifican con severidad `medium` para priorización operativa.
- Quedan integrados en SLA/KPIs del panel de incidentes.

## Fase 3.16 (alerta por pico de fallos de cambio de contraseña)

- Nuevo código de alerta: `PASSWORD_CHANGE_FAILED_SPIKE`.
- Evaluación en ventana configurable junto a alertas de login/sesión.
- Umbral configurable:
  - `SECURITY_ALERT_PASSWORD_CHANGE_FAILED_THRESHOLD`

## Fase 3.17 (alerta por pico de bloqueos de cambio de contraseña)

- Nuevo código de alerta: `PASSWORD_CHANGE_BLOCKED_SPIKE`.
- Detecta aumento de bloqueos por rate-limit en cambio de contraseña.
- Umbral configurable:
  - `SECURITY_ALERT_PASSWORD_CHANGE_BLOCKED_THRESHOLD`

## Fase 3.18 (alerta por pico de signup bloqueado)

- Nuevo código de alerta: `SIGNUP_BLOCKED_SPIKE`.
- Detecta aumentos de bloqueo en registro (rate-limit/cuarentena/políticas).
- Umbral configurable:
  - `SECURITY_ALERT_SIGNUP_BLOCKED_THRESHOLD`

## Fase 3.19 (incidentes de seguridad por signup bloqueado)

- `listSecurityIncidents` incluye evento `SIGNUP_BLOCKED`.
- Se clasifica con severidad `medium` para priorización en cola de incidentes.
- Bloqueos de registro pasan a SLA/KPI y flujo de estado (`open/ack/resolved`).

## Fase 3.20 (severidad contextual de signup bloqueado)

- `SIGNUP_BLOCKED` ahora sube a severidad `high` cuando el detalle indica `ip_quarantine`.
- Si el bloqueo es funcional/no agresivo (por ejemplo `email_exists`), mantiene severidad `medium`.
- Mejora priorización operativa en cola de incidentes.

## Fase 3.21 (consultas seguras en incidentes)

- `listSecurityIncidents` migra de `queryRawUnsafe` a consultas parametrizadas con `Prisma.sql`.
- Filtros dinámicos (`status`, rango de fechas, límites) quedan tipados y sin interpolación manual de SQL.
- Reduce superficie de riesgo por inyección y mejora mantenibilidad del módulo de incidentes.

## Fase 3.22 (sanitización reforzada de logs AUTH)

- `sanitizeAuditDetail` ahora elimina caracteres de control (`U+0000..U+001F`, `U+007F`), además de normalizar espacios.
- Evita artefactos/inyección visual en visores de logs (ANSI/control chars).
- Se mantienen límites de longitud y formato compacto para detalles de auditoría.

## Fase 3.23 (guardia de origen unificada en pages/api)

- Nuevo helper: `lib/security/request-guard-api.ts`.
- Reutiliza la misma política de `origin/referer` confiable para rutas `pages/api`.
- `POST /api/auth/signup` migra a guardia centralizada (menos duplicación y menos deriva de política).

## Fase 3.24 (segmento de path seguro en auditoría AUTH)

- Nuevo helper `sanitizeAuditPathSegment` para rutas de auditoría.
- `logAuthSecurityEvent` limita y sanea el segmento `AUTH/<identity>` usado en `filePath`.
- Reduce ruido y crecimiento no controlado del índice de rutas en bitácora.

## Fase 3.25 (cobertura de endpoint de alertas)

- Se agregan pruebas para `GET /api/admin/security/alerts`:
  - respuesta exitosa y forwarding de umbrales configurados,
  - `403` cuando falla autorización,
  - `500` en error inesperado.
- Mejora confianza operativa sobre la ruta crítica de monitoreo de seguridad.

## Cierre Fase 3

- Controles anti-CSRF aplicados en mutaciones críticas (`app/api` y `pages/api` relevantes).
- Lockout de cuenta y rate-limits reforzados para login/signup/password-change.
- Auditoría AUTH ampliada (éxito/bloqueo/fallo) con sanitización robusta de detalles/path.
- Incidentes y alertas integran señales de signup/password-change con umbrales configurables.
- Pruebas automatizadas ejecutadas de forma continua durante la implementación.

## Fase 4.1 (allowlist de hosts confiables en mutaciones)

- `request-guard` incorpora `SECURITY_TRUSTED_HOSTS` (coma-separado).
- Si la allowlist está configurada, cualquier mutación con `host` fuera de lista se rechaza.
- Aplica a guardias de `app/api` y `pages/api`.

## Fase 4.2 (hardening CSP/headers de proxy)

- CSP ajusta `unsafe-eval` por entorno:
  - permitido en desarrollo,
  - deshabilitado en producción salvo `SECURITY_CSP_ALLOW_UNSAFE_EVAL=true`.
- Nuevos headers defensivos:
  - `X-DNS-Prefetch-Control: off`
  - `X-Permitted-Cross-Domain-Policies: none`
  - `Cross-Origin-Resource-Policy: same-origin`

## Fase 4.3 (cobertura de proxy de seguridad)

- Pruebas para `proxy.ts`:
  - validación de headers de seguridad,
  - validación de rate-limit en rutas auth sensibles.

## Fase 4.4 (validación runtime de nuevas variables)

- `scripts/security-runtime-env-check.mjs` valida:
  - formato de `SECURITY_TRUSTED_HOSTS`,
  - booleano de `SECURITY_CSP_ALLOW_UNSAFE_EVAL`.
- `.env.production.example` incluye ambas variables.

## Cierre Fase 4

- Política de origen endurecida con control opcional por allowlist de host.
- Proxy con cabeceras más estrictas y CSP más seguro en producción.
- Cobertura automatizada de componentes críticos de protección de borde.
- Validación de configuración ampliada para reducir errores de despliegue.

## Fase 4.5 (hardening de endpoint CSP report)

- `POST /api/security/csp-report` incorpora:
  - rate-limit por IP con `Retry-After`,
  - límite de tamaño por `content-length`.
- Se añaden pruebas del endpoint para éxito, payload excesivo y limitación por ráfaga.

## Checklist de cierre Fase 2

- [x] Definir variables de entorno de seguridad en producción.
- [ ] Configurar `SECURITY_DATABASE_URL` y `SECURITY_INCIDENT_NOTIFY_WEBHOOK_URL` en GitHub Secrets.
- [ ] Verificar ejecución del workflow `Security Operations` por `workflow_dispatch`.
- [ ] Confirmar recepción de webhook de prueba (`Notificar SLA` desde dashboard).

> Nota de ejecución local (WSL/sandbox sin salida a internet): `gh workflow run ...` y `security:webhook:probe` pueden fallar por conectividad/token inválido aunque la configuración esté correcta.

### Evidencia operativa sugerida

```bash
# 1) Preflight estricto de secretos/env requeridos por operaciones
npm run security:ops:preflight

# 2) Verificar GitHub auth y (opcional) dispatch del workflow
npm run security:gh-check
npm run security:gh-check -- --dispatch

# 3) Confirmar payload de webhook en offline (sin red)
npm run security:webhook:probe -- --dry-run

# 4) Confirmar recepción real de webhook (requiere red)
npm run security:webhook:probe
```
