# Instalación de Cliente SIAME 2026

## URL Oficial
**https://siame2026.local**

## Requisitos previos
- Windows 10/11
- Ejecución como Administrador
- Acceso a la red local (172.18.28.84)

## Método 1: Ejecutar script automático (Recomendado)

1. Copia el archivo `install-client.ps1` desde el servidor:
   ```
   \\172.18.28.84\c$\inetpub\siame2026\certs\install-client.ps1
   ```

2. Click derecho en el archivo → "Ejecutar como administrador"

3. Confirma las acciones cuando el script lo solicite

## Método 2: Instalación Manual

### Paso 1: Instalar Certificado CA

1. Copia el certificado desde:
   ```
   \\172.18.28.84\c$\inetpub\siame2026\certs\siame2026-root-ca.cer
   ```

2. Doble click en el certificado → "Instalar certificado"

3. Selecciona:
   - Ubicación: **Máquina local**
   - Colocar todos los certificados en: **Entidades de certificación raíz de confianza**

### Paso 2: Configurar archivo hosts

1. Abre el bloc de notas como Administrador

2. Abre el archivo: `C:\Windows\System32\drivers\etc\hosts`

3. Agrega esta línea al final:
   ```
   172.18.28.84  siame2026.local
   ```

4. Guarda el archivo

### Paso 3: Verificar

1. Abre el navegador: `https://siame2026.local`

2. No debería aparecer advertencia de certificado

## Solución de problemas

### "Su conexión no es privada"
- El certificado CA no está instalado correctamente
- Verifica que esté en "Entidades de certificación raíz de confianza"

### "No se puede acceder a este sitio"
- El archivo hosts no está configurado
- Verifica la conexión de red
- Prueba hacer ping a 172.18.28.84

### Eliminar configuración

**Eliminar entrada del hosts:**
1. Abre `C:\Windows\System32\drivers\etc\hosts`
2. Elimina la línea con siame2026.local

**Eliminar certificado:**
1. Ejecuta `certmgr.msc`
2. Ve a "Entidades de certificación raíz de confianza"
3. Busca "mkcert" y elimínalo
