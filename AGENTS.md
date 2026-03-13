# AGENTS.md

## Contexto del proyecto

Este repositorio es un fork de Altus orientado a mejorar la experiencia de uso de WhatsApp Web en escritorio.

La prioridad del proyecto es una UX de alta calidad durante uso prolongado. No es un proyecto para experimentar con features laterales.

## Objetivo principal

Toda decision debe favorecer:

- fluidez sostenida;
- estabilidad operativa;
- recuperacion cuando el `webview` se degrada;
- reduccion de complejidad accidental.
- experiencia single-session first.

## Objetivos explicitamente secundarios

- bajar RAM como objetivo aislado;
- sistemas de temas;
- multi-sesion;
- reescrituras tecnologicas por preferencia personal.

## Reglas de producto

- No proponer features nuevas si no mejoran la experiencia principal.
- No expandir temas ni multi-sesion.
- Tratar tabs y multi-sesion como deuda tecnica salvo instruccion explicita del usuario.
- No migrar a `wails` salvo evidencia tecnica fuerte y medible.
- No asumir que Electron es el problema sin medir primero.
- Priorizar una sola sesion de calidad sobre flexibilidad innecesaria.

## Reglas tecnicas

- Antes de proponer cambios grandes, inspeccionar primero [src/App.tsx](/home/fly/projects/altusfork/src/App.tsx), [src/components/WebView.tsx](/home/fly/projects/altusfork/src/components/WebView.tsx), [src/whatsapp.preload.ts](/home/fly/projects/altusfork/src/whatsapp.preload.ts) y [src/main.ts](/home/fly/projects/altusfork/src/main.ts).
- Tratar la arquitectura de `webview` como area critica. Cambios aqui requieren razonamiento explicito sobre ciclo de vida, cleanup y trabajo en background.
- Si una solucion mantiene multiples `webview` activos, justificarlo con mediciones.
- Si el usuario no necesita tabs, el flujo principal debe funcionar con una sola sesion visible y una sola particion activa.
- No introducir listeners, observers o timers persistentes sin estrategia de cleanup.
- No añadir cache, store o persistencia nueva sin explicar por que mejora la experiencia.
- No mover el proyecto a otra plataforma sin una comparativa concreta de tradeoffs.

## Reglas de implementacion

- Hacer cambios pequeños, reversibles y medibles.
- Si el cambio afecta rendimiento o estabilidad, añadir instrumentacion o al menos puntos de observacion.
- Conservar compatibilidad con WhatsApp Web como restriccion fuerte.
- Favorecer soluciones simples sobre abstracciones elegantes pero innecesarias.
- Si una opcion mejora “arquitectura” pero empeora UX o riesgo de compatibilidad, se rechaza.

## Reglas de revision

- En revisiones, priorizar:
  - degradacion progresiva;
  - fugas de listeners o observers;
  - `webview` ocultos pero vivos;
  - sesiones persistentes mal gestionadas;
  - falta de mecanismos de recuperacion.
- No aprobar PRs que aumenten complejidad de producto fuera del foco principal.

## Habilidades y workflow

- Si el usuario pide encontrar o instalar skills, usar `find-skills` y/o `skill-installer` segun corresponda.
- Si la tarea implica escribir o revisar Rust, usar `rust-best-practices`.
- Si en el futuro se evalua una migracion hacia otra shell nativa, documentar primero benchmark, compatibilidad y costo de mantenimiento.

## Forma de trabajar esperada

- Medir antes de reescribir.
- Documentar antes de ampliar alcance.
- Optimizar para experiencia percibida, no para metricas aisladas.
- Mantener el proyecto enfocado.
