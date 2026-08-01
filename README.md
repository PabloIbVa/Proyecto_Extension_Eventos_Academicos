# Docker Compose — Extensión de Eventos Académicos

Levanta los 3 backends (BFF, Calendar Service, AI Service) con un solo
comando, en vez de abrir 3 terminales manualmente.

## Ubicación de estos archivos

`docker-compose.yml` y `.env.example` van en la **raíz** de tu proyecto,
al mismo nivel que las carpetas `extension/` y `services/`:

```
Proyecto_Extension_Eventos_Academicos/
├── docker-compose.yml       <- aquí
├── .env                     <- aquí (lo creas tú, ver abajo)
├── extension/
└── services/
    ├── bff/                  <- ya trae su propio Dockerfile
    ├── calendar-service/     <- ya trae su propio Dockerfile
    └── ai/                   <- ya trae su propio Dockerfile
```

Cada carpeta de servicio (`bff`, `calendar-service`, `ai`) ya incluye su
`Dockerfile` — asegúrate de haber aplicado las últimas actualizaciones
que te compartí de cada uno, porque ahí es donde viven.

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  instalado y corriendo (incluye Docker Compose).

## Configuración

```bash
copy .env.example .env
```

Completa el `.env` con tus credenciales reales:

```
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GEMINI_API_KEY=tu_api_key_de_gemini
```

(`OPENROUTER_API_KEY` solo hace falta si vas a usar `AI_PROVIDER=openrouter`.)

## Levantar todo

Desde la raíz del proyecto:

```bash
docker compose up --build
```

La primera vez tarda varios minutos (construye las 3 imágenes desde
cero). Las siguientes veces es mucho más rápido.

Vas a ver los logs de los 3 servicios mezclados en la misma terminal,
cada uno con un color distinto y su nombre al inicio de cada línea
(`bff-1`, `calendar-service-1`, `ai-service-1`).

## Verificar que los 3 están arriba

En otra terminal:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:8000/health
```

Los tres deben responder `{"status":"ok",...}`.

## Detener todo

`Ctrl+C` en la terminal donde corre, o desde otra terminal:

```bash
docker compose down
```

## Volver a levantar tras cambiar código

Si modificas algo dentro de `services/bff`, `services/calendar-service` o
`services/ai`, necesitas reconstruir la imagen de ese servicio:

```bash
docker compose up --build
```

(`--build` reconstruye solo lo que cambió, Docker es inteligente con el
cache de capas.)

## Diferencia importante con correr cada servicio manualmente

Dentro de Docker Compose, los servicios se comunican entre sí usando su
**nombre de servicio** como si fuera un hostname (`http://calendar-service:3001`,
`http://ai-service:8000`), no `localhost` — así están configuradas las
variables de entorno en `docker-compose.yml`. Esto es transparente para
ti; no necesitas cambiar nada en la extensión, que sigue hablando con
`http://localhost:3000` normalmente porque ese puerto sí está expuesto a
tu máquina.

La única excepción es la redirección del login de Google
(`CALENDAR_SERVICE_PUBLIC_URL`), que se mantiene en `localhost` a
propósito, porque esa URL la sigue el navegador del usuario, no un
contenedor.

## Nota sobre la extensión

La extensión (carpeta `extension/`) NO se levanta con Docker — sigue
cargándose igual que siempre en `chrome://extensions`. Docker Compose
solo maneja los 3 backends.

## Si algo falla

- **Puerto ya en uso**: si tenías los servicios corriendo manualmente
  (`npm run start:dev`, `uvicorn`), deténlos antes de usar Docker Compose
  — ambos no pueden usar el mismo puerto a la vez.
- **Ver logs de un solo servicio**: `docker compose logs -f bff` (o
  `calendar-service`, `ai-service`).
- **Reconstruir desde cero sin cache**: `docker compose build --no-cache`.
