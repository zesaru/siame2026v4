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

function Remove-HostsEntry([string]$Ip, [string]$Name) {
  $hostsPath = Join-Path $env:SystemRoot "System32\\drivers\\etc\\hosts"
  $content = Get-Content -LiteralPath $hostsPath -ErrorAction Stop
  $normalizedPattern = "^\s*" + [regex]::Escape($Ip) + "\s+" + [regex]::Escape($Name) + "(\s+|$)"
  $updated = $content | Where-Object { $_ -notmatch $normalizedPattern }
  Set-Content -LiteralPath $hostsPath -Value $updated
  Write-Host "Entrada hosts eliminada para $Name." -ForegroundColor Green
}

function Remove-RootCertificate([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    Write-Warning "No se encontró el archivo de certificado en $Path. Se omitió la desinstalación del certificado."
    return
  }

  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($Path)
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "LocalMachine")
  $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)

  $matches = @($store.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint })
  foreach ($match in $matches) {
    $store.Remove($match)
  }

  $store.Close()

  if ($matches.Count -gt 0) {
    Write-Host "Certificado raíz eliminado." -ForegroundColor Green
  } else {
    Write-Host "El certificado raíz no estaba instalado." -ForegroundColor Yellow
  }
}

Assert-Administrator

Remove-HostsEntry -Ip $ServerIp -Name $HostName
Remove-RootCertificate -Path $RootCertificatePath

ipconfig /flushdns | Out-Null
Write-Host "Cache DNS limpiada." -ForegroundColor Green
