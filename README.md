# Extensión de Eventos Académicos

Esqueleto inicial de la extensión de Chrome. Aún no tiene la lógica de
análisis ni la integración con el BFF/AI Service — solo el andamiaje base
para confirmar que carga sin errores en el navegador.

## Estructura

```
manifest.json          # Configuración de la extensión (Manifest V3)
src/
  background.ts        # Service worker
  content-script.ts     # Script inyectado en las páginas
  popup/
    popup.html
    popup.css
    popup.ts
icons/                  # Iconos (16, 48, 128 px)
esbuild.config.js       # Bundler
scripts/copy-static.js  # Copia manifest/html/css/iconos a dist/
```

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Compilar

```bash
npm run build
```

Esto genera la carpeta `dist/` con todo listo para cargar en el navegador.
Para recompilar automáticamente mientras desarrollas:

```bash
npm run watch
```

## Cargar la extensión en Chrome (o cualquier navegador basado en Chromium)

1. Ejecuta `npm run build` para generar `dist/`.
2. Abre `chrome://extensions` en el navegador.
3. Activa el **"Modo de desarrollador"** (interruptor arriba a la derecha).
4. Haz clic en **"Cargar descomprimida"** (Load unpacked).
5. Selecciona la carpeta `dist/` (no la raíz del proyecto).
6. La extensión debe aparecer en la lista y su icono en la barra de
   herramientas del navegador.

Si haces cambios en el código, corre `npm run build` de nuevo y luego
pulsa el botón de recarga de la extensión en `chrome://extensions`.

## Verificación rápida

- Haz clic en el icono de la extensión: debe abrirse el popup con el texto
  "Extensión cargada correctamente ".
- Abre la consola del *service worker* (en `chrome://extensions`, clic en
  "service worker" bajo la extensión) para ver los logs de `background.ts`.
- Abre la consola de cualquier página web (F12) para ver el log de
  `content-script.ts` confirmando que se inyectó.
