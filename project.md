# Altus UX Recovery Plan

## Objetivo

Transformar Altus en un cliente de WhatsApp Web con una experiencia de uso claramente superior a la actual.

La prioridad no es bajar RAM en abstracto. La prioridad es eliminar la degradacion progresiva de la experiencia:

- mensajes que tardan en salir;
- sensacion de lentitud creciente tras horas de uso;
- UI que responde peor a medida que la cache y el estado interno crecen;
- recuperacion pobre cuando el `webview` entra en estados extraños.

## Principios no negociables

- No introducir complejidad nueva si no mejora la experiencia percibida.
- No migrar a `wails` por intuicion o preferencia estetica.
- No optimizar primero por consumo de memoria; optimizar por fluidez, estabilidad y recuperacion.
- No trabajar con hipotesis vagas: toda decision de arquitectura debe apoyarse en mediciones locales.
- No expandir funciones no prioritarias como multi-sesion o temas.
- El producto debe priorizar una experiencia single-session first.

## Alcance del producto

### Dentro del alcance

- Una experiencia de uso rapida, estable y consistente.
- Arranque razonablemente rapido.
- Envio de mensajes sin degradacion perceptible prolongada.
- Recuperacion automatica o semiautomatica del `webview`.
- Observabilidad suficiente para detectar regresiones.

### Fuera del alcance

- Nuevos sistemas de temas.
- Mejoras de multi-sesion como objetivo.
- Mantener tabs como feature central del producto.
- Reescritura total por moda tecnologica.
- Migracion a `wails` sin evidencia dura de mejora real.

## Diagnostico actual

Hallazgos iniciales sobre el codigo:

- [src/App.tsx](/home/fly/projects/altusfork/src/App.tsx): monta un `webview` por tab y oculta los inactivos con `hidden`, pero siguen vivos.
- [src/components/WebView.tsx](/home/fly/projects/altusfork/src/components/WebView.tsx): cada tab usa una particion persistente (`persist:<tab.id>`), conserva estado y sigue ejecutando logica una vez cargado.
- [src/whatsapp.preload.ts](/home/fly/projects/altusfork/src/whatsapp.preload.ts): mantiene observers y handlers activos dentro del contexto de WhatsApp Web.
- [src/main.ts](/home/fly/projects/altusfork/src/main.ts): hay poda de particiones huerfanas al iniciar, pero no una politica de mantenimiento operativo del estado vivo.

Hipotesis principal:

- El problema dominante no es Electron como plataforma, sino la arquitectura de multiples `webview` activos, mas sus sesiones persistentes y trabajo en segundo plano.

## Decision arquitectonica inicial

### Decision

Mantener `Electron` como plataforma base durante la fase principal del proyecto.

### Razon

- WhatsApp Web depende de Chromium y de compatibilidad de navegador de nivel alto.
- El problema observado es de uso de `Electron`, no necesariamente del empaquetado.
- Migrar a `wails` ahora introduciria una reescritura costosa sin atacar la causa mas probable.

### Condicion para reconsiderar `wails`

Solo se reabre esa decision si, despues de ejecutar las fases 0 a 3, siguen presentes degradaciones severas que no puedan atribuirse al `webview` ni a la gestion de sesiones.

## Plan estricto por fases

## Fase 0: Medicion y linea base

### Objetivo

Crear una linea base verificable antes de tocar arquitectura.

### Entregables

- Instrumentacion para medir:
  - tiempo de arranque;
  - tiempo hasta `did-stop-loading`;
  - tiempo de envio percibido;
  - numero de procesos activos por tab;
  - eventos de larga duracion en el renderer;
  - crecimiento del almacenamiento por particion;
  - recargas, caidas y recuperaciones del `webview`.
- Modo debug local para inspeccion de rendimiento.
- Documento de baseline con pasos reproducibles.

### Criterios de aceptacion

- Debe existir una forma reproducible de comparar antes y despues.
- No se aprueban cambios de arquitectura sin baseline.

## Fase 1: Simplificacion del producto

### Objetivo

Reducir la superficie que no aporta al objetivo principal.

### Tareas

- Tratar temas como opcionales o degradarlos de prioridad tecnica.
- Evitar trabajo nuevo relacionado con multi-sesion.
- Reorientar la aplicacion a un flujo single-session first.
- Revisar settings y eliminar o aislar toggles que añadan fragilidad sin valor claro.

### Criterios de aceptacion

- El flujo principal queda enfocado en estabilidad de una sesion de alta calidad.
- No se amplian features secundarias durante esta fase.

## Fase 2: Rehacer el ciclo de vida de tabs y `webview`

### Objetivo

Eliminar el modelo de multiples `webview` vivos en paralelo cuando no aporten valor.

### Tareas

- Sustituir el renderizado actual por un modelo con una sola superficie activa.
- Definir una estrategia explicita para tabs inactivas:
  - `sleep`;
  - destruccion controlada;
  - restauracion rapida.
- Asegurar cleanup real de listeners, observers y referencias cuando una tab sale de estado activo.
- Evitar que tabs ocultas sigan ejecutando trabajo de fondo innecesario.

### Criterios de aceptacion

- Al cambiar de tab no deben quedar varias instancias activas de WhatsApp Web trabajando de fondo sin necesidad.
- La navegacion entre tabs debe sentirse inmediata o casi inmediata.

## Fase 3: Higiene de cache, sesion y recuperacion

### Objetivo

Evitar la degradacion progresiva de la experiencia durante uso prolongado.

### Tareas

- Definir politica de mantenimiento de sesiones persistentes.
- Añadir acciones de recuperacion:
  - recarga suave;
  - reciclado del `webview`;
  - reinicio controlado de recursos no criticos.
- Evaluar limpieza selectiva de cache no esencial.
- Detectar estados atascados de red o render y ofrecer recuperacion visible.

### Criterios de aceptacion

- La app debe poder recuperarse sin obligar al usuario a matar el proceso completo.
- El rendimiento percibido tras uso prolongado debe mantenerse dentro de un rango aceptable medido.

## Fase 4: UX shell y ergonomia

### Objetivo

Hacer que la app se sienta cuidada, no solo tolerable.

### Tareas

- Mostrar estado claro de carga, reconexion y actividad.
- Mejorar feedback visual cuando el `webview` tarda o se reconecta.
- Refinar foco, atajos, abrir enlaces externos, drag and drop y acciones comunes.
- Garantizar que la UI del shell nunca bloquee interacciones basicas.

### Criterios de aceptacion

- El usuario entiende el estado de la app sin adivinar.
- Las acciones frecuentes tienen feedback inmediato.

## Fase 5: Endurecimiento y entrega

### Objetivo

Cerrar el ciclo con pruebas, criterios de regresion y empaquetado reproducible.

### Tareas

- Crear checklist de regresion para uso prolongado.
- Ejecutar pruebas manuales de humo y escenarios largos.
- Revisar errores de consola y warnings.
- Asegurar que el entorno de desarrollo sea reproducible.

### Criterios de aceptacion

- El proyecto queda listo para iteraciones futuras sin perder foco.

## Orden de implementacion obligatorio

1. Medir.
2. Simplificar.
3. Rehacer tabs y `webview`.
4. Endurecer cache y recuperacion.
5. Pulir UX shell.
6. Solo despues reconsiderar cambios grandes de plataforma.

## Regla de decision sobre `wails`

`wails` queda explicitamente descartado en la etapa inicial.

Solo puede evaluarse si se cumplen todas estas condiciones:

- existe baseline;
- la arquitectura de `webview` ya fue simplificada;
- la degradacion persiste;
- hay evidencia de que el cuello de botella principal es el shell y no WhatsApp Web;
- el costo de migracion es menor que seguir endureciendo Electron.

## Riesgos principales

- Atacar sintomas en vez de la causa.
- Reescribir demasiado pronto.
- Introducir regresiones por tocar tabs, sesiones y preload sin medicion.
- Confundir “menos RAM” con “mejor UX”.

## Definicion de exito

El proyecto sera exitoso si, tras varias horas de uso real:

- el envio de mensajes sigue siendo rapido;
- cambiar entre vistas no degrada la app;
- la UI sigue respondiendo con consistencia;
- existe una via clara de recuperacion cuando el `webview` falla;
- Altus se siente mas estable y mas comodo que antes, aunque internamente siga usando Electron.
