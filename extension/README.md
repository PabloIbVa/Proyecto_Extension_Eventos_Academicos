# Extensión de Eventos Académicos (esqueleto Manifest V3)

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

## Instalación y compilación con Docker

La extensión ya puede compilarse automáticamente desde Docker. Cuando ejecutes:

```bash
docker compose up --build
```

el proyecto ejecuta `npm install` y `npm run build` para la carpeta `extension/` y genera la carpeta `dist/` lista para ser cargada en Chrome.

Si solo quieres recompilar la extensión manualmente:

```bash
docker compose run --rm extension-builder
```

## Cargar la extensión en Chrome (o cualquier navegador basado en Chromium)

1. Abre `chrome://extensions` en el navegador.
2. Activa el **"Modo de desarrollador"** (interruptor arriba a la derecha).
3. Haz clic en **"Cargar descomprimida"** (Load unpacked).
4. Selecciona la carpeta `dist/` dentro de `extension/`.
5. La extensión debe aparecer en la lista y su icono en la barra de herramientas del navegador.

Si haces cambios en el código, vuelve a ejecutar:

```bash
docker compose run --rm extension-builder
```

y luego recarga la extensión en `chrome://extensions`.

## Verificación rápida

- Haz clic en el icono de la extensión: debe abrirse el popup con el texto
  "Extensión cargada correctamente ✅".
- Abre la consola del *service worker* (en `chrome://extensions`, clic en
  "service worker" bajo la extensión) para ver los logs de `background.ts`.
- Abre la consola de cualquier página web (F12) para ver el log de
  `content-script.ts` confirmando que se inyectó.

## Siguientes pasos

- Conectar el botón "Analizar página actual" con el BFF (NestJS) real.
- Al crear eventos, enviar el `accessToken` guardado en `chrome.storage.local`
  (bajo la clave `googleSession`) como header `Authorization: Bearer <token>`
  al llamar `POST /events` del BFF.
- Sustituir los iconos placeholder por los definitivos.

## Flujo de login con Google (ya implementado)

1. En el popup, clic en **"Iniciar sesión con Google"**.
2. Se abre una nueva pestaña hacia `http://localhost:3000/auth/google` (BFF).
3. El BFF redirige al Calendar Service, que redirige a Google.
4. Al aceptar el consentimiento, Google regresa al Calendar Service, que
   redirige la pestaña a `http://localhost:3001/auth/success#access_token=...`
   (una página propia del backend, NO de la extensión).
5. El `background.ts` de la extensión está vigilando esa pestaña
   (`chrome.tabs.onUpdated`). En cuanto detecta esa URL, extrae el token
   del fragmento, lo guarda en `chrome.storage.local` (clave `googleSession`)
   y cierra la pestaña automáticamente.
6. El popup detecta el cambio en `chrome.storage` y muestra "Sesión activa ✅".

### Por qué no se redirige directamente a chrome-extension://

Los navegadores basados en Chromium (Chrome, Edge, Brave) bloquean por
diseño que una página web normal redirija automáticamente hacia una
página interna de una extensión — es una protección de seguridad, no un
bug ni cosa de un bloqueador de anuncios en particular. Por eso el
Calendar Service redirige a una página propia (`/auth/success`) y es la
extensión la que "vigila" esa pestaña desde su lado, en vez de esperar
una redirección hacia ella misma.
