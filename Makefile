SHELL := /usr/bin/env bash
COREPACK_HOME ?= /tmp/altus-corepack
YARN := COREPACK_HOME=$(COREPACK_HOME) corepack yarn

.PHONY: help install ensure-deps dev perf-dev build package make lint clean

help:
	@echo "Targets disponibles:"
	@echo "  make install  - instala dependencias con yarn"
	@echo "  make ensure-deps - valida que las dependencias esten instaladas"
	@echo "  make dev      - inicia Altus en modo desarrollo"
	@echo "  make perf-dev - inicia Altus con trazas de rendimiento"
	@echo "  make build    - genera el paquete de la app"
	@echo "  make package  - alias de build"
	@echo "  make make     - genera artefactos distribuibles con electron-forge"
	@echo "  make lint     - ejecuta TypeScript y ESLint"
	@echo "  make clean    - elimina artefactos generados"

install:
	$(YARN) install

ensure-deps:
	@test -f node_modules/.yarn-state.yml || (echo "Faltan dependencias. Ejecuta: make install" >&2; exit 1)

dev: ensure-deps
	$(YARN) start

perf-dev: ensure-deps
	ALTUS_DEBUG_PERF=1 $(YARN) start

build: package

package: ensure-deps
	$(YARN) package

make: ensure-deps
	$(YARN) make

lint: ensure-deps
	$(YARN) lint

clean:
	rm -rf out .vite
