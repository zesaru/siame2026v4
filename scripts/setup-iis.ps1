# Configuración de IIS para SIAME 2026 con ARR

# Instalar ARR (Application Request Routing)
# Descargar desde: https://www.iis.net/downloads/microsoft/application-request-routing
# O usar Web Platform Installer

# Este script configura IIS como reverse proxy hacia Next.js en puerto 3000

Import-Module WebAdministration
Import-Module IISAdministration

# Variables
$SiteName = "SIAME2026"
$Port = "80"
$HostHeader = ""
$PhysicalPath = "C:\inetpub\siame2026"
$NextJsUrl = "http://localhost:3000"
$AppPoolName = "SIAME2026Pool"

Write-Host "Configurando IIS para SIAME 2026..." -ForegroundColor Green

# 1. Crear Application Pool si no existe
try {
    $pool = Get-WebApplicationPool -Name $AppPoolName -ErrorAction Stop
    Write-Host "✓ Application Pool ya existe" -ForegroundColor Green
} catch {
    New-WebApplicationPool -Name $AppPoolName -Force -ManagedRuntimeVersion "" -ManagedPipelineMode Integrated
    Write-Host "✓ Application Pool creado (sin código administrado)" -ForegroundColor Green
}

# 2. Crear sitio IIS si no existe
try {
    $site = Get-Website -Name $SiteName -ErrorAction Stop
    Write-Host "✓ Sitio IIS ya existe" -ForegroundColor Green
} catch {
    New-Website -Name $SiteName -Port $Port -PhysicalPath $PhysicalPath -ApplicationPool $AppPoolName -Force
    Write-Host "✓ Sitio IIS creado en puerto $Port" -ForegroundColor Green
}

# 3. Configurar ARR para proxy al puerto 3000
try {
    # Crear server farm si no existe
    try {
        Get-WebFarms -Name "SIAME2026Farm" -ErrorAction Stop | Out-Null
        Write-Host "✓ Server farm ya existe" -ForegroundColor Green
    } catch {
        New-WebFarms -Name "SIAME2026Farm" -Force | Out-Null
        Write-Host "✓ Server farm creado" -ForegroundColor Green
    }

    # Agregar servidor al farm
    try {
        Add-WebFarmNode -FarmName "SIAME2026Farm" -ServerAddress "localhost" -Port 3000 -Force | Out-Null
        Write-Host "✓ Servidor añadido al farm" -ForegroundColor Green
    } catch {
        Write-Host "✓ Servidor ya existe en el farm" -ForegroundColor Cyan
    }

    # Habilitar ARR en el sitio
    $site = Get-Website -Name $SiteName
    $sitePath = "IIS:\Sites\$SiteName"
    $webConfigPath = "$sitePath\web.config"

    # Leer web.config
    [xml]$webConfig = Get-Content $webConfigPath

    # Habilitar proxy en ARR
    $arrPath = "MACHINE/WEBROOT/APPHOST"
    $arr = Get-WebConfigurationProperty -PSPath "$arrPath" -Filter "system.webServer/proxy"
    Set-WebConfigurationProperty -PSPath "$arrPath" -Filter "system.webServer/proxy" -Value @{enabled="true"} -ErrorAction SilentlyContinue

    # Crear archivo web.config con regla de rewrite si no existe
    $rewriteRule = @"
<rewrite>
  <rules>
    <rule name="ReverseProxyInboundRule1" stopProcessing="true">
      <match url="(.*)" />
      <action type="Rewrite" url="$NextJsUrl/{R:1}" />
    </rule>
  </rules>
</rewrite>
"@

    # Guardar web.config
    $webConfig.OuterXml = $webConfig.OuterXml.Replace('</system.webServer>', "$rewriteRule</system.webServer>")
    $webConfig.Save("$webConfigPath")

    Write-Host "✓ ARR configurado como reverse proxy" -ForegroundColor Green

} catch {
    Write-Host "✗ Error configurando ARR: $_" -ForegroundColor Red
}

Write-Host "`nConfiguración completada." -ForegroundColor Green
Write-Host "Siguiente: Configurar PM2 en puerto 3000" -ForegroundColor Cyan
