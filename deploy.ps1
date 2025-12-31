# deploy.ps1 - Script de despliegue para SIAME 2026 en IIS
# Ejecutar este script en el servidor de producción (Windows Server 2025)
# Requiere: PowerShell como Administrador

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  SIAME 2026 - Script de Despliegue" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
$currentDir = Get-Location
if (-not ($currentDir.Path -match "siame2026")) {
    Write-Host "⚠ ADVERTENCIA: No parece estar en el directorio del proyecto" -ForegroundColor Yellow
    $continue = Read-Host "¿Continuar? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit
    }
}

# Paso 1: Pull de cambios
Write-Host "[1/5] Obteniendo cambios del repositorio..." -ForegroundColor Yellow
try {
    git pull
    Write-Host "✓ Repositorio actualizado" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al hacer git pull" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 2: Instalar dependencias
Write-Host "[2/5] Instalando dependencias..." -ForegroundColor Yellow
try {
    pnpm install
    Write-Host "✓ Dependencias instaladas" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al instalar dependencias" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 3: Generar Prisma Client
Write-Host "[3/5] Generando Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "✓ Prisma Client generado" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al generar Prisma Client" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 4: Sincronizar base de datos
Write-Host "[4/5] Sincronizando base de datos..." -ForegroundColor Yellow
try {
    npx prisma db push
    Write-Host "✓ Base de datos sincronizada" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al sincronizar base de datos" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 5: Build
Write-Host "[5/5] Compilando para producción..." -ForegroundColor Yellow
try {
    pnpm run build
    Write-Host "✓ Build completado" -ForegroundColor Green
} catch {
    Write-Host "✗ Error al compilar" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Opcional: Reiniciar sitio IIS
Write-Host ""
$restart = Read-Host "¿Reiniciar sitio en IIS? (S/N)"
if ($restart -eq "S" -or $restart -eq "s") {
    Write-Host "Reiniciando sitio en IIS..." -ForegroundColor Yellow
    try {
        Import-Module WebAdministration
        Restart-WebItem -PSPath 'IIS:\Sites\SIAME2026' -ErrorAction SilentlyContinue
        Write-Host "✓ Sitio reiniciado" -ForegroundColor Green
    } catch {
        Write-Host "⚠ No se pudo reiniciar el sitio (puede que no exista aún)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  ¡Despliegue completado exitosamente!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
