# Configuracion cliente HTTPS local para SIAME

Este flujo sirve para equipos Windows que deben abrir SIAME con:

```txt
https://siame2026.local
```

Servidor:

```txt
172.18.28.84
```

## Que resuelve

1. instala la CA raiz del certificado de SIAME en Windows
2. agrega una entrada en `hosts`
3. limpia cache DNS

No usa DNS corporativo ni dominio Active Directory.

## Archivos

- [install-siame-client.ps1](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/docs/local-https/install-siame-client.ps1)
- [uninstall-siame-client.ps1](/mnt/c/Users/embto/Documents/GitHub/siame2026v4/docs/local-https/uninstall-siame-client.ps1)

## Requisito previo

Necesitas el certificado raiz de la CA que emitio el certificado del servidor.

Nombre sugerido:

```txt
siame2026-root-ca.cer
```

Colocalo junto al script `install-siame-client.ps1`.

Si hoy el servidor usa un certificado local o self-signed, primero exporta la CA raiz desde el servidor Windows o desde la herramienta con la que emitiste el certificado.

## Instalacion en cada PC cliente

1. Copia estos archivos a una carpeta temporal:
   - `install-siame-client.ps1`
   - `siame2026-root-ca.cer`

2. Abre PowerShell como Administrador.

3. Si la politica de ejecucion bloquea scripts, ejecuta solo para esa sesion:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

4. Ejecuta:

```powershell
.\install-siame-client.ps1
```

5. El script hara:
   - instalacion del certificado raiz en `LocalMachine\Root`
   - agregado de `172.18.28.84 siame2026.local` al archivo `hosts`
   - `ipconfig /flushdns`
   - prueba TCP a `siame2026.local:443`

6. Abre en el navegador:

```txt
https://siame2026.local
```

## Reversion

Para quitar la configuracion del cliente:

```powershell
.\uninstall-siame-client.ps1
```

## Limites de este enfoque

- requiere ejecutar como Administrador
- usa `hosts`, por lo que si cambia la IP del servidor debes volver a distribuir el cambio
- es una solucion operativa para red local sin DNS interno

## Recomendacion posterior

Cuando estabilices la operacion:

1. mover la resolucion de nombre a DNS interno
2. mantener `siame2026.local` como hostname oficial
3. terminar HTTPS en IIS con certificado emitido para `siame2026.local`
