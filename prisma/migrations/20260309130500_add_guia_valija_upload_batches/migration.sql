-- CreateTable
CREATE TABLE "GuiaValijaUploadBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "readyCount" INTEGER NOT NULL DEFAULT 0,
    "savedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuiaValijaUploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuiaValijaUploadBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "documentId" TEXT,
    "guiaValijaId" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT,
    "analysisStatus" TEXT NOT NULL DEFAULT 'uploaded',
    "errorMessage" TEXT,
    "analysisResult" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuiaValijaUploadBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuiaValijaUploadBatch_userId_idx" ON "GuiaValijaUploadBatch"("userId");
CREATE INDEX "GuiaValijaUploadBatch_status_idx" ON "GuiaValijaUploadBatch"("status");
CREATE INDEX "GuiaValijaUploadBatch_createdAt_idx" ON "GuiaValijaUploadBatch"("createdAt");

CREATE INDEX "GuiaValijaUploadBatchItem_batchId_idx" ON "GuiaValijaUploadBatchItem"("batchId");
CREATE INDEX "GuiaValijaUploadBatchItem_documentId_idx" ON "GuiaValijaUploadBatchItem"("documentId");
CREATE INDEX "GuiaValijaUploadBatchItem_guiaValijaId_idx" ON "GuiaValijaUploadBatchItem"("guiaValijaId");
CREATE INDEX "GuiaValijaUploadBatchItem_analysisStatus_idx" ON "GuiaValijaUploadBatchItem"("analysisStatus");
CREATE UNIQUE INDEX "GuiaValijaUploadBatchItem_batchId_sortOrder_key" ON "GuiaValijaUploadBatchItem"("batchId", "sortOrder");

-- AddForeignKey
ALTER TABLE "GuiaValijaUploadBatch" ADD CONSTRAINT "GuiaValijaUploadBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuiaValijaUploadBatchItem" ADD CONSTRAINT "GuiaValijaUploadBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "GuiaValijaUploadBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuiaValijaUploadBatchItem" ADD CONSTRAINT "GuiaValijaUploadBatchItem_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GuiaValijaUploadBatchItem" ADD CONSTRAINT "GuiaValijaUploadBatchItem_guiaValijaId_fkey" FOREIGN KEY ("guiaValijaId") REFERENCES "GuiaValija"("id") ON DELETE SET NULL ON UPDATE CASCADE;
