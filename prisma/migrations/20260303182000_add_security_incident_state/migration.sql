CREATE TABLE IF NOT EXISTS "SecurityIncidentState" (
  "id" TEXT PRIMARY KEY,
  "status" TEXT NOT NULL DEFAULT 'open',
  "note" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SecurityIncidentState_status_idx" ON "SecurityIncidentState"("status");
CREATE INDEX IF NOT EXISTS "SecurityIncidentState_updatedAt_idx" ON "SecurityIncidentState"("updatedAt");
