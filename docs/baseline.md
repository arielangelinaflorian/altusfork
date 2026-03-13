# Baseline Guide

## Objetivo

Registrar una linea base reproducible del comportamiento actual de Altus antes de tocar la arquitectura principal.

## Modo debug de rendimiento

Usar:

```bash
ALTUS_DEBUG_PERF=1 make dev
```

O de forma equivalente:

```bash
make perf-dev
```

Esto habilita trazas de rendimiento emitidas desde:

- proceso principal;
- renderer principal;
- eventos clave de cada `webview`.

## Que medir en la baseline

Registrar como minimo:

1. Tiempo desde arranque hasta `main-window:ready-to-show`
2. Tiempo desde arranque hasta `webview:dom-ready`
3. Tiempo desde arranque hasta `webview:did-stop-loading`
4. Numero total de tabs abiertas
5. Numero de `webview` montados
6. Presencia de eventos `renderer:long-task`
7. Estados de error como `did-fail-load`, `unresponsive` o `render-process-gone`

## Escenario manual reproducible

1. Arrancar Altus con una sola tab.
2. Esperar a que WhatsApp Web termine de cargar.
3. Abrir y cerrar conversaciones durante varios minutos.
4. Cambiar entre tabs si existen varias.
5. Intentar enviar mensajes tras un tiempo de uso.
6. Registrar si la app se vuelve progresivamente mas lenta.

## Registro sugerido

Anotar para cada corrida:

- fecha;
- commit o estado del arbol;
- numero de tabs;
- tiempos observados;
- errores observados;
- percepcion subjetiva de fluidez;
- notas sobre degradacion progresiva.

## Corrida inicial

### 2026-03-13 - arranque con una sola tab

- `app:ready`: `+86ms`
- `create-window:start`: `+90ms`
- `renderer:app-mounted`: `+3286ms`
- `renderer:dom-content-loaded`: `+3288ms`
- `main-window:dom-ready`: `+3288ms`
- `main-window:ready-to-show`: `+3292ms`
- `main-window:did-finish-load`: `+3307ms`
- `webview:created`: `+3316ms`
- `webview:did-start-loading`: `+3331ms`
- `webview:dom-ready`: `+4250ms`
- `webview:did-stop-loading`: `+5001ms`

Observaciones:

- La ventana principal queda visible alrededor de `3.29s` despues del arranque.
- El primer `webview` llega a `dom-ready` alrededor de `4.25s`.
- El primer `webview` llega a `did-stop-loading` alrededor de `5.00s`.
- Solo hay `1` `webview` montado en la corrida inicial.
- No aparecieron eventos `renderer:long-task`, `unresponsive` ni `render-process-gone` en esta corrida.
- Hubo una segunda secuencia corta de `did-start-loading` y `did-stop-loading` alrededor de `10.12s`, probablemente asociada a navegacion interna, bootstrap de la app web o actividad de sesion.
- Aparecen warnings de entorno grafico (`GLib-GIO-CRITICAL` y errores de `GetVSyncParametersIfAvailable()`), que no demuestran todavia un problema de la aplicacion.
