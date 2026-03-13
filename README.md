# Altus Fork

Fork personal de Altus orientado a una sola sesion de WhatsApp Web con mejor experiencia de uso en escritorio.

Este proyecto ya no persigue los objetivos clasicos de Altus original. La direccion actual es:

- una sola sesion de calidad;
- recuperacion rapida cuando el `webview` se degrada;
- menos complejidad accidental;
- UX sobria y util para uso diario.

## Estado actual

Este fork mantiene Electron y SolidJS, pero reduce el enfoque en features secundarios como temas o multi-sesion.

Cambios principales frente a Altus original:

- flujo principal single-session;
- menos peso heredado de multi-sesion;
- herramientas de sesion desde menu y tray;
- reciclado manual y automatico del `webview`;
- tray mejorado;
- configuracion mas limpia y en espanol;
- instrumentacion basica para observar degradacion y tiempos de carga.

## Filosofia del fork

La prioridad no es bajar RAM como metrica aislada.

La prioridad es que WhatsApp Web siga sintiendose rapido y recuperable durante uso prolongado. Si Chromium envejece peor que Firefox en sesiones largas, este fork favorece una recuperacion rapida de la sesion antes que obligarte a cerrar y abrir toda la app.

## Funciones utiles

- `Session -> Reload Session`
- `Session -> Recycle Webview`
- `Session -> Clear Session Cache`
- `Session -> Show Session Diagnostics`
- refresh rapido desde el tray
- auto-reciclado conservador cuando la app lleva suficiente tiempo abierta y queda fuera de foco

## Desarrollo local

El repo ya incluye entorno Nix y comandos base.

### Requisitos

- `nix`
- `direnv`

### Entrar al entorno

```bash
direnv allow
```

### Instalar dependencias

```bash
make install
```

### Desarrollo

```bash
make dev
```

### Desarrollo con trazas de rendimiento

```bash
make perf-dev
```

### Build local

```bash
make build
make package
make make
```

## Releases

Las releases se generan desde GitHub Actions cuando se empuja un tag con formato `v*`.

Ejemplo:

```bash
git tag v0.1.0
git push origin v0.1.0
```

El workflow publica los artefactos soportados por Electron Forge en GitHub Releases.

## Seguridad y datos de sesion

Los datos de la sesion de WhatsApp no se guardan en este repositorio.

Electron guarda la sesion y la particion persistente en el directorio `userData` del sistema, normalmente fuera del repo. En Linux eso suele vivir bajo `~/.config/Altus/` o ruta equivalente, incluyendo `Partitions/primary`.

Publicar este repositorio no publica tu sesion, salvo que exportes o subas manualmente esos directorios externos.

## Alcance

Este fork no busca convertirse en una plataforma nueva ni en un laboratorio de features. Si una idea no mejora la experiencia principal de usar WhatsApp Web todos los dias, probablemente no pertenece aqui.
