# deploy.ps1 - Script de despliegue para SIAME 2026
# Ejecutar este script en el servidor de produccion
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
    Write-Host "ADVERTENCIA: No parece estar en el directorio del proyecto" -ForegroundColor Yellow
    $continue = Read-Host "Continuar? (S/N)"
    if ($continue -ne "S" -and $continue -ne "s") {
        exit
    }
}

# Paso 1: Pull de cambios
Write-Host "[1/6] Obteniendo cambios del repositorio..." -ForegroundColor Yellow
try {
    git pull
    Write-Host "OK - Repositorio actualizado" -ForegroundColor Green
} catch {
    Write-Host "ERROR - No se pudo hacer git pull" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 2: Instalar dependencias
Write-Host "[2/6] Instalando dependencias..." -ForegroundColor Yellow
try {
    pnpm install
    Write-Host "OK - Dependencias instaladas" -ForegroundColor Green
} catch {
    Write-Host "ERROR - No se pudieron instalar dependencias" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 3: Generar Prisma Client
Write-Host "[3/6] Generando Prisma Client..." -ForegroundColor Yellow
try {
    npx prisma generate
    Write-Host "OK - Prisma Client generado" -ForegroundColor Green
} catch {
    Write-Host "ERROR - No se pudo generar Prisma Client" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 4: Sincronizar base de datos
Write-Host "[4/6] Sincronizando base de datos..." -ForegroundColor Yellow
try {
    npx prisma db push --accept-data-loss
    Write-Host "OK - Base de datos sincronizada" -ForegroundColor Green
} catch {
    Write-Host "ERROR - No se pudo sincronizar base de datos" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 5: Build
Write-Host "[5/6] Compilando para produccion..." -ForegroundColor Yellow
try {
    pnpm run build
    Write-Host "OK - Build completado" -ForegroundColor Green
} catch {
    Write-Host "ERROR - No se pudo compilar" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Paso 6: Reiniciar servidor
Write-Host ""
Write-Host "[6/6] Como desea reiniciar el servidor?" -ForegroundColor Yellow
Write-Host "  1. Reiniciar sitio IIS"
Write-Host "  2. Matar proceso puerto 3000 y reiniciar nodo"
Write-Host "  3. Ambos"
Write-Host "  4. No reiniciar"
$restart = Read-Host "Seleccione una opcion (1-4)"

# Opcion 1 o 3: Reiniciar sitio IIS
if ($restart -eq "1" -or $restart -eq "3") {
    Write-Host ""
    Write-Host "Reiniciando sitio en IIS..." -ForegroundColor Yellow
    try {
        Import-Module WebAdministration
        Restart-WebItem -PSPath 'IIS:\Sites\SIAME2026' -ErrorAction SilentlyContinue
        Write-Host "OK - Sitio IIS reiniciado" -ForegroundColor Green
    } catch {
        Write-Host "ADVERTENCIA - No se pudo reiniciar el sitio IIS" -ForegroundColor Yellow
    }
}

# Opcion 2 o 3: Matar proceso puerto 3000 y reiniciar nodo
if ($restart -eq "2" -or $restart -eq "3") {
    Write-Host ""
    Write-Host "Buscando proceso en puerto 3000..." -ForegroundColor Yellow

    $netstatResult = netstat -ano | Select-String ":3000" | Select-String "LISTENING"
    if ($netstatResult) {
        $parts = $netstatResult -split '\s+'
        $procId = $parts[-1]
        Write-Host "  Proceso encontrado con PID: $procId" -ForegroundColor Cyan

        try {
            taskkill /F /PID $procId | Out-Null
            Write-Host "OK - Proceso terminado" -ForegroundColor Green
        } catch {
            Write-Host "ADVERTENCIA - No se pudo terminar el proceso" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  No hay procesos en el puerto 3000" -ForegroundColor Cyan
    }

    Write-Host ""
    Write-Host "Iniciando servidor..." -ForegroundColor Yellow
    Write-Host "  Presione Ctrl+C para detenerlo" -ForegroundColor Cyan
    Write-Host ""

    Start-Sleep -Seconds 2
    pnpm run start
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  Despliegue completado!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
