# BFF (Backend for Frontend) — Eventos Académicos

API en NestJS que sirve de único punto de entrada para la extensión de
Chrome. No contiene lógica de negocio pesada: valida las peticiones y las
reenvía al servicio correspondiente.

## Estructura

```
src/
  analyze/    POST /analyze  -> reenvía al AI Processing Service (FastAPI)
  events/     POST /events   -> reenvía al Google Calendar Service (NestJS)
  auth/       GET  /auth/google -> redirige al flujo OAuth del Calendar Service
  health/     GET  /health   -> chequeo de salud (útil para Docker/monitoreo)
  config/     Configuración centralizada leída desde variables de entorno
```

## Variables de entorno

Copia `.env.example` a `.env` y ajusta si es necesario:

```bash
cp .env.example .env
```

| Variable              | Descripción                                      | Default                  |
|------------------------|--------------------------------------------------|---------------------------|
| PORT                   | Puerto donde corre el BFF                        | 3000                      |
| FRONTEND_ORIGINS       | Orígenes adicionales permitidos por CORS          | (vacío)                   |
| CALENDAR_SERVICE_URL   | URL del Google Calendar Service                  | http://localhost:3001    |
| AI_SERVICE_URL         | URL del AI Processing Service                    | http://localhost:8000    |

Nota: el origen `chrome-extension://<id>` de la extensión se permite
automáticamente en CORS, no hace falta agregarlo a `FRONTEND_ORIGINS`.

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo (con recarga automática)

```bash
npm run start:dev
```

## Compilar y ejecutar en producción

```bash
npm run build
node dist/main.js
```

## Endpoints disponibles

- `GET /health` — verifica que el servicio esté vivo.
- `POST /analyze` — body: `{ "text": string, "url"?: string }`. Reenvía al
  AI Service y devuelve la propuesta de evento.
- `POST /events` — body: `{ "title", "startDateTime", "endDateTime"?, "description"? }`,
  requiere header `Authorization: Bearer <token>`. Reenvía al Calendar Service.
- `GET /auth/google` — redirige al flujo de login de Google gestionado por
  el Calendar Service.

## Estado actual

Este BFF ya valida datos y maneja errores de red (502 controlado) cuando
el AI Service o el Calendar Service no están disponibles. Aún no existen
esos dos servicios — se implementan en los siguientes pasos del proyecto.

## Probar sin los otros servicios todavía

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/analyze -H "Content-Type: application/json" -d '{"text":"prueba"}'
```

El segundo comando debe devolver un error 502 controlado (Bad Gateway),
que es el comportamiento esperado hasta que el AI Service exista.
