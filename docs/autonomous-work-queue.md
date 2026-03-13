# Cola De Trabajo Autónomo

## Propósito
Este archivo define cómo debe ejecutarse el trabajo autónomo cuando el responsable del repositorio no esté disponible.

El objetivo es simple:
- mantener la aplicación estable,
- entregar mejoras útiles y pequeñas,
- evitar regresiones en flujos críticos,
- dejar commits limpios y trazables.

## Reglas De Ejecución

Cuando se trabaje de forma autónoma, seguir este orden:
1. Reproducir el estado actual del proyecto.
2. Ejecutar validación antes de tocar código.
3. Tomar la tarea de mayor prioridad que no esté bloqueada.
4. Agregar o actualizar tests para el comportamiento modificado.
5. Ejecutar validación otra vez.
6. Hacer commit y push solo si el área tocada queda limpia.

## Comandos De Validación

Usar este comando como puerta de control diaria:

```bash
pnpm verify:smoke
```

Este comando ejecuta:
- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm exec playwright test`

Para una pasada más completa:

```bash
pnpm verify:all
```

Este comando añade:
- `pnpm run db:verify`

## Qué Se Puede Hacer Sin Preguntar

Trabajo permitido en modo autónomo:
- corrección de bugs
- mejoras de parsers
- endurecimiento de validaciones
- limpieza UX sin cambiar la intención funcional
- ampliación de cobertura de tests
- correcciones de permisos y roles
- reducción de ruido en logs o consola
- documentación operativa y de testing

Commits permitidos:
- commits pequeños y enfocados
- mensajes con convención tipo `feat:`, `fix:`, `refactor:`, `test:`
- push directo a `master` si la validación pasa

## Qué No Debe Hacerse De Forma Autónoma

No hacer esto sin instrucción explícita:
- reseteos destructivos de datos en entornos compartidos
- migraciones de esquema riesgosas sobre datos productivos
- rediseño del modelo de autenticación
- reemplazo de arquitectura de despliegue
- eliminación de funcionalidades grandes
- rehacer secciones completas de UI solo por estética

## Orden De Prioridades

### P0 Estabilidad
- rutas rotas
- regresiones de autenticación
- errores de permisos
- fallos de subida
- manejo incorrecto de archivos faltantes
- parsers que fallen con documentos reales del negocio

### P1 Flujo De Negocio
- guías de valija
- hojas de remisión
- oficios
- items de valija
- revisión por lote

### P2 Calidad
- cobertura E2E para flujos reales
- mejores diagnósticos
- fallbacks más seguros
- mensajes de error más claros

### P3 Pulido UX
- limpieza visual
- consistencia entre pantallas
- estados de carga, error y vacío

## Definición De Terminado

Una tarea se considera terminada solo si:
1. el comportamiento funciona localmente,
2. el área cambiada tiene tests o evidencia fuerte de validación,
3. `pnpm lint` pasa,
4. el commit es enfocado,
5. el push quedó completado.

## Plantilla De Ticket

Usar este formato para dejar tareas antes de una sesión offline:

```md
### TAREA
Título: <nombre corto de la tarea>
Prioridad: P0 | P1 | P2 | P3
Objetivo: <resultado esperado>
Alcance: <rutas/módulos/archivos probables>
Aceptación:
- <criterio 1>
- <criterio 2>
- <criterio 3>
Notas:
- <restricciones o reglas de negocio>
```

## Plantilla De Cola Activa

Reemplazar esta sección por tareas reales antes de dejar una sesión autónoma.

### TAREA
Título: Validar flujos críticos diarios
Prioridad: P0
Objetivo: Confirmar que login, dashboard, guías, hojas, oficios e items sigan funcionando.
Alcance: `app/dashboard/*`, rutas de auth, APIs protegidas, suite Playwright smoke
Aceptación:
- login funciona
- las rutas protegidas cargan
- no hay errores bloqueantes en módulos críticos
- `pnpm verify:smoke` pasa
Notas:
- esta tarea debe ejecutarse primero al iniciar una sesión offline

### TAREA
Título: Mejorar confiabilidad del parser de HR
Prioridad: P1
Objetivo: Reducir corrección manual en `documento`, `asunto` y `destino`.
Alcance: `lib/hojas-remision-parser.ts`, tests relacionados
Aceptación:
- la extracción de tabla funciona en HR de una y varias páginas
- el fallback no inventa `destino` con valores inválidos
- los tests del parser pasan
Notas:
- preferir heurísticas resistentes sobre supuestos rígidos de fila/columna

### TAREA
Título: Activar cobertura E2E por rol
Prioridad: P1
Objetivo: Ejecutar cobertura real para `USER` y `SUPER_ADMIN`.
Alcance: `.env.e2e`, `e2e/roles.spec.ts`
Aceptación:
- tests de `USER` corren sin `skip`
- tests de `SUPER_ADMIN` corren sin `skip`
- las restricciones por rol se validan de extremo a extremo
Notas:
- requiere credenciales válidas en `.env.e2e`

## Formato De Reporte Al Cierre

Al terminar una sesión autónoma, reportar así:

```md
Implementado:
- <qué cambió>

Validado:
- <comandos ejecutados>
- <resultado>

Commits:
- <hash> <mensaje>

Pendiente:
- <siguiente tarea útil>
```
