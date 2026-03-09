# Database Table Review

## Scope

This review compares:

- The schema declared in [schema.prisma](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/prisma/schema.prisma)
- The migration history in `prisma/migrations/`
- Effective table usage found in `app/`, `lib/`, `pages/`, and `scripts/`

Important limitation:

- Live row counts could not be verified from this environment because Prisma cannot reach the configured database host `10.255.255.254:5432`.
- Conclusions below are structural and usage-based, not data-volume-based.

## Executive Summary

The database does not appear broadly over-modeled. Most tables are actively used by business flows, parsing, audit logging, or security controls.

The only strong candidates for removal are legacy NextAuth tables that no longer align with the current auth architecture:

- `Account`
- `Session`
- `VerificationToken`

Those tables should not be dropped directly. The adapter has already been removed from runtime, but the schema cleanup still requires functional validation before dropping legacy tables.

## Current Architecture

The app currently mixes two auth/session layers:

1. NextAuth with:
- `CredentialsProvider`
- `strategy: "jwt"`

2. Custom security/session layer with:
- `AuthSession`
- `AuthIpOverride`
- `SecurityIncidentState`
- `SecurityNotificationDelivery`
- `FileAuditLog`
- `User.sessionVersion`
- `User.failedLoginCount`
- `User.lockedUntil`

This means the real issue is not "too many tables" in general. The issue is duplicated auth concepts and unclear ownership between legacy NextAuth persistence and the newer custom security model.

## Table Matrix

| Table | Status | Evidence | Recommendation | Risk |
|---|---|---|---|---|
| `User` | Required | Used across auth, admin, documents, diplomatic records, lockout, session revocation | Keep | High if changed |
| `Account` | Legacy removed from schema | Present in initial NextAuth migration; no OAuth providers in active auth config | Drop via dedicated migration | Medium until migration is applied |
| `Session` | Legacy removed from schema | Active auth uses JWT strategy, not database sessions | Drop via dedicated migration | Medium until migration is applied |
| `AuthSession` | Required | Used by `auth-session-registry`, revocation, idle timeout, user session management, security metrics | Keep as operational session store | High if changed |
| `AuthIpOverride` | Required | Used by IP quarantine and temporary allow overrides | Keep | Medium |
| `SecurityIncidentState` | Required | Used by security incident workflows and admin security views | Keep | Medium |
| `SecurityNotificationDelivery` | Required | Used by security notifications and delivery tracking | Keep | Medium |
| `VerificationToken` | Legacy removed from schema | No email provider, magic link, or email verification flow found | Drop via dedicated migration | Medium until migration is applied |
| `Document` | Required | Core intake/analyze/review workflow | Keep | High |
| `GuiaValija` | Required | Core diplomatic document entity | Keep | High |
| `GuiaValijaItem` | Required | Core line-item entity used in edit/list/delete flows and HR linkage | Keep | High |
| `GuiaValijaPrecinto` | Required | Parsed and persisted from guide details | Keep | Medium |
| `HojaRemision` | Required | Core diplomatic document entity with create/update/view flows | Keep | High |
| `Oficio` | Required | Core diplomatic document entity derived from source documents | Keep | High |
| `FileAuditLog` | Required | Used by audit views, security alerts, notifications, and metrics | Keep | High |

## Findings By Group

### Business-Critical Tables

These are clearly aligned with the current product:

- `Document`
- `GuiaValija`
- `GuiaValijaItem`
- `GuiaValijaPrecinto`
- `HojaRemision`
- `Oficio`

They are part of the core domain and are not cleanup candidates.

### Security-Critical Tables

These are also clearly justified:

- `AuthSession`
- `AuthIpOverride`
- `SecurityIncidentState`
- `SecurityNotificationDelivery`
- `FileAuditLog`

They support revocation, idle expiration, quarantine, SLA tracking, alerting, and auditability. Removing any of them would directly reduce security capabilities or observability.

### Legacy Auth Tables

These are the only real candidates:

- `Account`
- `Session`
- `VerificationToken`

Why they look legacy:

- The active auth config uses `CredentialsProvider` only.
- The active auth config uses `strategy: "jwt"`.
- No OAuth provider usage was found.
- No email verification or magic-link provider usage was found.
- Signup in [pages/api/auth/signup.ts](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/pages/api/auth/signup.ts) creates users directly with password credentials.

Why they cannot be removed yet:

- Runtime auth has changed recently and still needs end-to-end validation.
- Even if current runtime paths no longer persist to those tables, existing environments may still contain historical rows that should be inspected before deletion.

## Migration Timeline Interpretation

The migration history shows a clear evolution:

- `20251223030818_init` creates standard NextAuth tables and `Document`
- `20251223060555_add_diplomatic_documents` adds business tables
- `20260228215500_add_oficio_model` adds `Oficio`
- `20260303164000_add_auth_session_registry` adds `AuthSession`
- `20260303173000_add_auth_ip_override` adds `AuthIpOverride`
- `20260303182000_add_security_incident_state` adds `SecurityIncidentState`
- `20260303190000_add_security_notification_delivery` adds `SecurityNotificationDelivery`
- `20260303200000_add_user_login_lockout` extends `User` for local auth hardening

This strongly suggests the system moved away from generic NextAuth persistence toward a custom security model, but the adapter layer was never fully cleaned up.

## Main Risks

### Risk 1: Dual Session Model

The application conceptually has both:

- `Session` from NextAuth legacy persistence
- `AuthSession` from the custom security layer

That is the biggest architectural smell in the current schema.

### Risk 2: False Cleanup

Dropping `Account`, `Session`, or `VerificationToken` before validating the adapter removal can break:

- sign-in
- session retrieval
- adapter callbacks
- future upgrades of NextAuth

### Risk 3: Hidden Data Dependence

Because live DB counts were not available, we cannot yet confirm whether those legacy tables still contain meaningful historical rows in the current environment.

## Recommendation

Short version:

- Keep all business and security tables.
- Treat `Account`, `Session`, and `VerificationToken` as deprecation candidates.
- Remove the adapter dependency first.
- Then validate runtime auth.
- Only then generate a schema migration to drop legacy tables.

## Execution Status

Current repo status after this review:

- `PrismaAdapter(prisma)` has been removed from [pages/api/auth/[...nextauth].ts](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/pages/api/auth/[...nextauth].ts)
- Legacy models have been removed from [schema.prisma](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/prisma/schema.prisma)
- A dedicated cleanup migration has been added at [20260309095500_drop_legacy_nextauth_tables/migration.sql](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/prisma/migrations/20260309095500_drop_legacy_nextauth_tables/migration.sql)
- Active auth remains based on:
- `CredentialsProvider`
- JWT sessions
- custom `AuthSession` revocation and idle control

This means the codebase is now closer to a clean separation where `Account`, `Session`, and `VerificationToken` can be evaluated for removal in a later schema migration.

## /plan

1. Connectivity
- Run the review against an environment where Prisma can reach the database and capture real counts for all tables.

2. Auth Dependency Audit
- Confirm no remaining runtime path depends on `PrismaAdapter(prisma)` in [pages/api/auth/[...nextauth].ts](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/pages/api/auth/[...nextauth].ts).

3. Adapter Removal Design
- Validate the current refactor that removed `PrismaAdapter(prisma)` while preserving:
- credentials login
- `getServerSession`
- `useSession`
- JWT session callbacks
- custom `AuthSession` revocation flow

4. Verification Pass
- Test:
- sign in
- sign out
- profile update
- protected routes
- session revocation
- idle expiration

5. Deprecation Decision
- If auth works without adapter persistence, mark these tables as removable:
- `Account`
- `Session`
- `VerificationToken`

6. Schema Migration
- Apply the dedicated Prisma migration that drops confirmed legacy tables.

7. Post-Migration Validation
- Re-run login/session tests and review admin session management flows.

## Recommended Next Action

The next high-value step is not dropping tables. It is proving that `PrismaAdapter` can be removed safely.

## Operational Commands

Use these commands when the target database is reachable:

- `npm run db:audit:legacy-auth`
- `npx prisma migrate deploy`
- `npm run db:verify`
