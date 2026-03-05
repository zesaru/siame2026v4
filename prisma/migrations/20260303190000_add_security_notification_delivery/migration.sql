CREATE TABLE IF NOT EXISTS "SecurityNotificationDelivery" (
  "id" TEXT PRIMARY KEY,
  "channel" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 1,
  "breachCount" INTEGER NOT NULL DEFAULT 0,
  "httpStatusCode" INTEGER,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "SecurityNotificationDelivery_eventKey_status_createdAt_idx"
  ON "SecurityNotificationDelivery"("eventKey", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "SecurityNotificationDelivery_createdAt_idx"
  ON "SecurityNotificationDelivery"("createdAt");
