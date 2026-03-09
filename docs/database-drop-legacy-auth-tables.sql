-- Proposed cleanup for legacy NextAuth tables.
-- Do not run this until runtime auth validation is complete in an environment
-- with a reachable database and verified login/session flows.

BEGIN;

DROP TABLE IF EXISTS "Account";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "VerificationToken";

COMMIT;
