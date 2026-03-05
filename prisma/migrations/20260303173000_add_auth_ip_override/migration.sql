CREATE TABLE IF NOT EXISTS "AuthIpOverride" (
  "id" TEXT PRIMARY KEY,
  "ipAddress" TEXT NOT NULL,
  "mode" TEXT NOT NULL DEFAULT 'ALLOW',
  "reason" TEXT,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "AuthIpOverride_ipAddress_idx" ON "AuthIpOverride"("ipAddress");
CREATE INDEX IF NOT EXISTS "AuthIpOverride_ipAddress_mode_revokedAt_expiresAt_idx" ON "AuthIpOverride"("ipAddress", "mode", "revokedAt", "expiresAt");
CREATE INDEX IF NOT EXISTS "AuthIpOverride_expiresAt_idx" ON "AuthIpOverride"("expiresAt");
