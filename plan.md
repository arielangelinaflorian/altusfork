# Altus Execution Plan

Este archivo traduce [project.md](/home/fly/projects/altusfork/project.md) a hitos marcables de ejecucion.

Reglas de uso:

- Este archivo se actualiza durante el proyecto.
- Un hito se marca solo cuando su entregable esta realmente terminado.
- No se salta de fase sin cerrar los criterios minimos de la anterior.
- Si un cambio contradice [project.md](/home/fly/projects/altusfork/project.md), prevalece `project.md`.

## Estado general

- [ ] Fase 0 completada: medicion y linea base
- [ ] Fase 1 completada: simplificacion del producto
- [ ] Fase 2 completada: nuevo ciclo de vida de tabs y `webview`
- [ ] Fase 3 completada: higiene de cache, sesion y recuperacion
- [ ] Fase 4 completada: UX shell y ergonomia
- [ ] Fase 5 completada: endurecimiento y entrega

## Fase 0: Medicion y linea base

Objetivo: establecer una base medible antes de tocar arquitectura.

- [x] Documentar el flujo actual de arranque y carga de WhatsApp Web
- [x] Añadir puntos de observacion para tiempos de arranque y `did-stop-loading`
- [x] Añadir observacion del numero de `webview` y procesos activos
- [ ] Añadir observacion del crecimiento de almacenamiento por particion
- [x] Añadir observacion de bloqueos largos o estados de UI degradada
- [x] Definir un escenario manual reproducible de prueba prolongada
- [x] Escribir baseline inicial con resultados y problemas observados

Condicion de cierre:

- [ ] Existe una baseline reproducible para comparar antes y despues

## Fase 1: Simplificacion del producto

Objetivo: recortar complejidad no prioritaria.

- [ ] Auditar features fuera de foco: temas, multi-sesion, toggles fragiles
- [ ] Clasificar cada feature secundaria como mantener, aislar o retirar
- [x] Forzar un flujo single-session first en store y UI principal
- [ ] Reducir o encapsular dependencias de temas en el flujo principal
- [ ] Evitar nueva complejidad de multi-sesion durante el refactor
- [ ] Actualizar documentacion del foco del producto

Condicion de cierre:

- [ ] El flujo principal queda centrado en una experiencia estable de alta calidad

## Fase 2: Nuevo ciclo de vida de tabs y `webview`

Objetivo: eliminar el costo de mantener varias instancias vivas sin necesidad.

- [ ] Diseñar la estrategia objetivo para tabs inactivas
- [ ] Reemplazar el modelo actual de multiples `webview` montados
- [ ] Implementar activacion controlada de una sola superficie principal
- [ ] Implementar suspension o destruccion de tabs inactivas
- [ ] Implementar restauracion rapida de tabs inactivas
- [ ] Garantizar cleanup de listeners, observers y referencias al salir de estado activo
- [ ] Verificar que tabs ocultas no sigan haciendo trabajo innecesario
- [ ] Medir impacto del cambio respecto a la baseline

Condicion de cierre:

- [ ] Cambiar de tab ya no mantiene varias superficies activas de WhatsApp Web sin justificacion

## Fase 3: Higiene de cache, sesion y recuperacion

Objetivo: evitar degradacion progresiva durante uso largo.

- [x] Definir politica de mantenimiento de sesiones persistentes
- [x] Implementar mecanismo de recarga suave del `webview`
- [x] Implementar reciclado controlado del `webview`
- [x] Evaluar y aplicar limpieza selectiva de cache no critica
- [ ] Detectar estados atascados o degradados del `webview`
- [x] Exponer accion de recuperacion visible para el usuario
- [ ] Medir impacto de las estrategias de recuperacion

Condicion de cierre:

- [ ] La app puede recuperarse sin obligar al usuario a matar el proceso completo

## Fase 4: UX shell y ergonomia

Objetivo: hacer visible y comoda la salud operativa de la app.

- [ ] Mostrar estado de carga inicial del `webview`
- [ ] Mostrar estado de reconexion o recuperacion
- [ ] Mejorar feedback visual durante acciones lentas
- [ ] Revisar foco y atajos mas usados
- [ ] Revisar apertura de enlaces externos y acciones comunes
- [ ] Revisar drag and drop y comportamiento de shell relevante
- [ ] Validar que la UI del shell no quede bloqueada por estados intermedios

Condicion de cierre:

- [ ] La app comunica claramente su estado y responde mejor en acciones comunes

## Fase 5: Endurecimiento y entrega

Objetivo: dejar una base mantenible y verificable.

- [ ] Crear checklist de regresion para sesiones largas
- [ ] Ejecutar pruebas de humo de arranque, envio, cambio de tab y recuperacion
- [ ] Revisar errores de consola y warnings relevantes
- [ ] Confirmar flujo reproducible de desarrollo y build
- [ ] Actualizar documentacion final del estado del proyecto

Condicion de cierre:

- [ ] El proyecto queda listo para continuar sin perder foco ni calidad

## Registro de avance

Usar esta seccion para anotar progreso real durante el trabajo.

### 2026-03-13

- [x] Plan base creado a partir de `project.md`
- [x] Reglas de proyecto documentadas en `AGENTS.md`
- [x] Entorno inicial con `shell.nix` y `.envrc`
- [x] `find-skills` instalado en el directorio de skills de Codex
- [x] Instrumentacion inicial de rendimiento anadida a `main`, `preload`, `App` y `WebView`
- [x] Guia inicial de baseline creada en `docs/baseline.md`
- [x] Baseline inicial registrada tras pruebas reales de arranque y uso con 4 tabs
- [x] Flujo principal simplificado a single-session first en store y UI
- [x] Herramientas iniciales de recuperacion de sesion añadidas al menu Session
- [x] Politica inicial de auto-reciclado añadida para blur y tray
- [x] Arquitectura multi-sesion residual recortada a una sola particion persistente
