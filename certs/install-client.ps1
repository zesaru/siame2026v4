# Script de instalación para clientes de SIAME 2026
# Ejecutar como Administrador en cada PC cliente

Write-Host "╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "║   SIAME 2026 - Configuración de Cliente                            ║" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verificar ejecución como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "✗ Este script debe ejecutarse como Administrador" -ForegroundColor Red
    Write-Host "  Click derecho -> Ejecutar como administrador" -ForegroundColor Yellow
    pause
    exit 1
}

# Configuración
$ServerIP = "172.18.28.84"
$ServerName = "siame2026.local"
$ServerUrl = "https://siame2026.local"
$CertPath = "\\$ServerIP\c$\inetpub\siame2026\certs\siame2026-root-ca.cer"

# Si no hay acceso al servidor, solicitar ruta local del certificado
if (-not (Test-Path $CertPath)) {
    Write-Host "⚠ No se puede acceder al certificado vía red" -ForegroundColor Yellow
    Write-Host "  Ingresa la ruta del certificado (ej: C:\temp\siame2026-root-ca.cer)" -ForegroundColor Yellow
    $CertPath = Read-Host "Ruta del certificado"
}

if (-not (Test-Path $CertPath)) {
    Write-Host "✗ No se encontró el certificado en: $CertPath" -ForegroundColor Red
    pause
    exit 1
}

# Paso 1: Instalar CA raíz
Write-Host "`n[Paso 1/3] Instalando CA raíz en el sistema..." -ForegroundColor Cyan

try {
    # Importar certificado a la tienda de Root CA
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertPath)
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root","LocalMachine")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()

    Write-Host "✓ CA raíz instalada correctamente" -ForegroundColor Green
    Write-Host "  Emitida por: $($cert.Issuer)" -ForegroundColor Gray
    Write-Host "  Válida hasta: $($cert.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
} catch {
    Write-Host "✗ Error instalando CA raíz: $_" -ForegroundColor Red
    pause
    exit 1
}

# Paso 2: Agregar entrada al archivo hosts
Write-Host "`n[Paso 2/3] Configurando archivo hosts..." -ForegroundColor Cyan

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$hostsEntry = "$ServerIP $ServerName"

# Verificar si ya existe la entrada
$entryExists = Select-String -Path $hostsPath -Pattern $ServerName -SimpleMatch

if ($entryExists) {
    Write-Host "⚠ La entrada ya existe en hosts" -ForegroundColor Yellow
    $currentEntry = ($entryExists.Line).Trim()
    if ($currentEntry -ne $hostsEntry) {
        Write-Host "  Entrada actual: $currentEntry" -ForegroundColor Gray
        Write-Host "  Entrada nueva:  $hostsEntry" -ForegroundColor Gray
        $update = Read-Host "¿Actualizar? (S/N)"
        if ($update -eq "S" -or $update -eq "s") {
            # Eliminar entrada antigua
            (Get-Content $hostsPath) | Where-Object { $_ -notmatch $ServerName } | Set-Content $hostsPath
            # Agregar nueva entrada
            Add-Content -Path $hostsPath -Value "`n# SIAME 2026`n$hostsEntry"
            Write-Host "✓ Entrada actualizada" -ForegroundColor Green
        }
    } else {
        Write-Host "✓ Entrada correcta ya existe" -ForegroundColor Green
    }
} else {
    # Agregar nueva entrada
    Add-Content -Path $hostsPath -Value "`n# SIAME 2026`n$hostsEntry"
    Write-Host "✓ Entrada agregada a hosts" -ForegroundColor Green
}

# Paso 3: Verificar conexión
Write-Host "`n[Paso 3/3] Verificando conexión..." -ForegroundColor Cyan

# Limpiar caché DNS
Clear-DnsClientCache

# Esperar un momento
Start-Sleep -Seconds 1

# Probar conexión con TLS
try {
    $response = Invoke-WebRequest -Uri $ServerUrl -Method Head -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ Conexión exitosa" -ForegroundColor Green
    Write-Host "  URL: $ServerUrl" -ForegroundColor Gray
    Write-Host "  Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ No se pudo verificar la conexión" -ForegroundColor Yellow
    Write-Host "  Esto puede ser normal si el servidor aún no está accesible" -ForegroundColor Yellow
    Write-Host "  Verifica: $ServerUrl" -ForegroundColor Yellow
}

# Resumen
Write-Host "`n╔═══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "║   ✓ Configuración completada                                        ║" -ForegroundColor Green
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "║   Accede a: https://siame2026.local                                 ║" -ForegroundColor White
Write-Host "║                                                                   ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

pause
