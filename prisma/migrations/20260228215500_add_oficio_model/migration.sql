-- CreateTable
CREATE TABLE "Oficio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "numeroOficio" TEXT NOT NULL,
    "asunto" TEXT,
    "remitente" TEXT,
    "destinatario" TEXT,
    "referencia" TEXT,
    "contenidoTexto" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Oficio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Oficio_sourceDocumentId_key" ON "Oficio"("sourceDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Oficio_numeroOficio_key" ON "Oficio"("numeroOficio");

-- CreateIndex
CREATE INDEX "Oficio_userId_idx" ON "Oficio"("userId");

-- CreateIndex
CREATE INDEX "Oficio_sourceDocumentId_idx" ON "Oficio"("sourceDocumentId");

-- CreateIndex
CREATE INDEX "Oficio_numeroOficio_idx" ON "Oficio"("numeroOficio");

-- CreateIndex
CREATE INDEX "Oficio_createdAt_idx" ON "Oficio"("createdAt");

-- AddForeignKey
ALTER TABLE "Oficio" ADD CONSTRAINT "Oficio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
