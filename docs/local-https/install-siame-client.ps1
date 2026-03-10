param(
  [string]$ServerIp = "172.18.28.84",
  [string]$HostName = "siame2026.local",
  [string]$RootCertificatePath = ".\\siame2026-root-ca.cer"
)

$ErrorActionPreference = "Stop"

function Assert-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw "Ejecuta este script como Administrador."
  }
}

function Assert-CertificateFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "No se encontró el certificado raíz en: $Path"
  }
}

function Install-RootCertificate([string]$Path) {
  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($Path)
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
  $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)

  $existing = $store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint }
  if ($existing) {
    Write-Host "El certificado raíz ya estaba instalado." -ForegroundColor Yellow
  } else {
    $store.Add($cert)
    Write-Host "Certificado raíz instalado en Trusted Root Certification Authorities." -ForegroundColor Green
  }

  $store.Close()
}

function Ensure-HostsEntry([string]$Ip, [string]$Name) {
  $hostsPath = Join-Path $env:SystemRoot "System32\\drivers\\etc\\hosts"
  $content = Get-Content -LiteralPath $hostsPath -ErrorAction Stop
  $normalizedPattern = "^\s*" + [regex]::Escape($Ip) + "\s+" + [regex]::Escape($Name) + "(\s+|$)"

  if ($content | Where-Object { $_ -match $normalizedPattern }) {
    Write-Host "La entrada hosts ya existe para $Name." -ForegroundColor Yellow
    return
  }

  Add-Content -LiteralPath $hostsPath -Value "`r`n$Ip`t$Name"
  Write-Host "Entrada agregada a hosts: $Ip $Name" -ForegroundColor Green
}

function Test-SiameConnection([string]$Name) {
  try {
    $result = Test-NetConnection -ComputerName $Name -Port 443 -WarningAction SilentlyContinue
    if ($result.TcpTestSucceeded) {
      Write-Host "Conectividad OK con https://$Name" -ForegroundColor Green
    } else {
      Write-Warning "No se pudo validar conectividad TCP a https://$Name:443"
    }
  } catch {
    Write-Warning "No se pudo ejecutar Test-NetConnection: $($_.Exception.Message)"
  }
}

Assert-Administrator
Assert-CertificateFile -Path $RootCertificatePath

Write-Host "Instalando configuración cliente para SIAME..." -ForegroundColor Cyan
Write-Host "Servidor: $ServerIp" -ForegroundColor Cyan
Write-Host "Host: $HostName" -ForegroundColor Cyan

Install-RootCertificate -Path $RootCertificatePath
Ensure-HostsEntry -Ip $ServerIp -Name $HostName

ipconfig /flushdns | Out-Null
Write-Host "Cache DNS limpiada." -ForegroundColor Green

Test-SiameConnection -Name $HostName

Write-Host ""
Write-Host "Configuración completada." -ForegroundColor Green
Write-Host "Abre: https://$HostName" -ForegroundColor Green
