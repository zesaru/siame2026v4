-- CreateTable
CREATE TABLE "GuiaValija" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numeroGuia" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origenDireccion" JSONB NOT NULL,
    "destinoDireccion" JSONB NOT NULL,
    "origenCiudad" TEXT NOT NULL,
    "destinoCiudad" TEXT NOT NULL,
    "origenPais" TEXT NOT NULL,
    "destinoPais" TEXT NOT NULL,
    "remitenteNombre" TEXT,
    "remitenteCargo" TEXT,
    "remitenteEmail" TEXT,
    "destinatarioNombre" TEXT,
    "destinatarioCargo" TEXT,
    "destinatarioEmail" TEXT,
    "pesoValija" DOUBLE PRECISION,
    "numeroPaquetes" INTEGER DEFAULT 1,
    "descripcionContenido" TEXT,
    "observaciones" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "azureRawData" JSONB,
    "contenidoTexto" TEXT,
    "paresClaveValor" JSONB,
    "entidades" JSONB,
    "tablas" JSONB,
    "metadatos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "GuiaValija_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HojaRemision" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "numeroRemision" TEXT NOT NULL,
    "tipoRemision" TEXT NOT NULL,
    "fechaRemision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origenDireccion" JSONB NOT NULL,
    "destinoDireccion" JSONB NOT NULL,
    "origenCiudad" TEXT NOT NULL,
    "destinoCiudad" TEXT NOT NULL,
    "origenPais" TEXT NOT NULL,
    "destinoPais" TEXT NOT NULL,
    "remitenteNombre" TEXT NOT NULL,
    "remitenteEmpresa" TEXT,
    "remitenteRUC" TEXT,
    "remitenteEmail" TEXT,
    "remitenteTelefono" TEXT,
    "destinatarioNombre" TEXT NOT NULL,
    "destinatarioEmpresa" TEXT,
    "destinatarioRUC" TEXT,
    "destinatarioEmail" TEXT,
    "destinatarioTelefono" TEXT,
    "totalCantidad" INTEGER NOT NULL DEFAULT 0,
    "totalPeso" DOUBLE PRECISION,
    "observaciones" TEXT,
    "ordenCompraRef" TEXT,
    "facturaRef" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "processingStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "azureRawData" JSONB,
    "contenidoTexto" TEXT,
    "paresClaveValor" JSONB,
    "entidades" JSONB,
    "tablas" JSONB,
    "metadatos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "HojaRemision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RemisionItem" (
    "id" TEXT NOT NULL,
    "hojaRemisionId" TEXT NOT NULL,
    "numeroLinea" INTEGER NOT NULL,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "unidadMedida" TEXT,
    "precioUnitario" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "peso" DOUBLE PRECISION,
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RemisionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuiaValija_numeroGuia_key" ON "GuiaValija"("numeroGuia");

-- CreateIndex
CREATE INDEX "GuiaValija_userId_idx" ON "GuiaValija"("userId");

-- CreateIndex
CREATE INDEX "GuiaValija_numeroGuia_idx" ON "GuiaValija"("numeroGuia");

-- CreateIndex
CREATE INDEX "GuiaValija_fechaEmision_idx" ON "GuiaValija"("fechaEmision");

-- CreateIndex
CREATE INDEX "GuiaValija_origenCiudad_destinoCiudad_idx" ON "GuiaValija"("origenCiudad", "destinoCiudad");

-- CreateIndex
CREATE INDEX "GuiaValija_origenPais_destinoPais_idx" ON "GuiaValija"("origenPais", "destinoPais");

-- CreateIndex
CREATE INDEX "GuiaValija_estado_idx" ON "GuiaValija"("estado");

-- CreateIndex
CREATE INDEX "GuiaValija_processingStatus_idx" ON "GuiaValija"("processingStatus");

-- CreateIndex
CREATE INDEX "GuiaValija_createdAt_idx" ON "GuiaValija"("createdAt");

-- CreateIndex
CREATE INDEX "GuiaValija_remitenteNombre_idx" ON "GuiaValija"("remitenteNombre");

-- CreateIndex
CREATE INDEX "GuiaValija_destinatarioNombre_idx" ON "GuiaValija"("destinatarioNombre");

-- CreateIndex
CREATE UNIQUE INDEX "HojaRemision_numeroRemision_key" ON "HojaRemision"("numeroRemision");

-- CreateIndex
CREATE INDEX "HojaRemision_userId_idx" ON "HojaRemision"("userId");

-- CreateIndex
CREATE INDEX "HojaRemision_numeroRemision_idx" ON "HojaRemision"("numeroRemision");

-- CreateIndex
CREATE INDEX "HojaRemision_tipoRemision_idx" ON "HojaRemision"("tipoRemision");

-- CreateIndex
CREATE INDEX "HojaRemision_fechaRemision_idx" ON "HojaRemision"("fechaRemision");

-- CreateIndex
CREATE INDEX "HojaRemision_origenCiudad_destinoCiudad_idx" ON "HojaRemision"("origenCiudad", "destinoCiudad");

-- CreateIndex
CREATE INDEX "HojaRemision_origenPais_destinoPais_idx" ON "HojaRemision"("origenPais", "destinoPais");

-- CreateIndex
CREATE INDEX "HojaRemision_estado_idx" ON "HojaRemision"("estado");

-- CreateIndex
CREATE INDEX "HojaRemision_processingStatus_idx" ON "HojaRemision"("processingStatus");

-- CreateIndex
CREATE INDEX "HojaRemision_createdAt_idx" ON "HojaRemision"("createdAt");

-- CreateIndex
CREATE INDEX "HojaRemision_remitenteNombre_idx" ON "HojaRemision"("remitenteNombre");

-- CreateIndex
CREATE INDEX "HojaRemision_destinatarioNombre_idx" ON "HojaRemision"("destinatarioNombre");

-- CreateIndex
CREATE INDEX "HojaRemision_remitenteRUC_idx" ON "HojaRemision"("remitenteRUC");

-- CreateIndex
CREATE INDEX "HojaRemision_destinatarioRUC_idx" ON "HojaRemision"("destinatarioRUC");

-- CreateIndex
CREATE INDEX "RemisionItem_hojaRemisionId_idx" ON "RemisionItem"("hojaRemisionId");

-- CreateIndex
CREATE INDEX "RemisionItem_codigo_idx" ON "RemisionItem"("codigo");

-- CreateIndex
CREATE INDEX "RemisionItem_hojaRemisionId_numeroLinea_idx" ON "RemisionItem"("hojaRemisionId", "numeroLinea");

-- CreateIndex
CREATE UNIQUE INDEX "RemisionItem_hojaRemisionId_numeroLinea_key" ON "RemisionItem"("hojaRemisionId", "numeroLinea");

-- AddForeignKey
ALTER TABLE "GuiaValija" ADD CONSTRAINT "GuiaValija_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HojaRemision" ADD CONSTRAINT "HojaRemision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RemisionItem" ADD CONSTRAINT "RemisionItem_hojaRemisionId_fkey" FOREIGN KEY ("hojaRemisionId") REFERENCES "HojaRemision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
