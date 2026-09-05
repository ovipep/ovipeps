CREATE TABLE IF NOT EXISTS "SupportConversation" (
  "id" TEXT PRIMARY KEY,
  "reference" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "response" TEXT,
  "reminderEmailId" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SupportConversation_status_createdAt_idx" ON "SupportConversation" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SupportConversation_email_idx" ON "SupportConversation" ("email");
ALTER TABLE "SupportConversation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "SupportConversation" FROM anon, authenticated;
