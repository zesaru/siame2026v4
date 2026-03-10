# Instalación de IIS + ARR para SIAME 2026

## Pasos para instalar Application Request Routing (ARR)

### Opción 1: Descargar e instalar manualmente

1. **Descargar ARR 3.0**:
   - Ve a: https://learn.microsoft.com/en-us/iis/extensions/planning-for-arr
   - Descarga: `requestRouter_amd64.msi`
   - Ejecuta el instalador

2. **Instalar URL Rewrite** (prerequisito):
   - Descarga: https://www.iis.net/downloads/microsoft/url-rewrite
   - Instala `rewrite_amd64.msi`

### Opción 2: Usar Web Platform Installer

1. Instalar Web Platform Installer:
   - Descargar: https://www.microsoft.com/web/installer
   - Ejecutar e instalar

2. Abrir Web Platform Installer
3. Buscar "Application Request Routing"
   - Products → Server → Application Request Routing 3.0
   - Add → Install

### Opción 3: Chocolatey (si está disponible)

```powershell
choco install iis-arr --installargs '/install'
```

## Una vez instalado ARR

Ejecuta este script para configurar IIS:
`scripts/setup-iis.ps1`

## Para desplegar

El script configurará:
1. Reglas de URL Rewrite para reverse proxy a puerto 3000
2. SSL en IIS (certificado mkcert)
3. Configuración de aplicación Next.js en IIS
