# Google Calendar Service

Servicio en NestJS responsable de:
1. Gestionar el flujo OAuth 2.0 con Google (login del usuario).
2. Crear eventos en el Google Calendar del usuario autenticado.

Es el único servicio que conoce el `GOOGLE_CLIENT_SECRET`. El BFF y la
extensión nunca lo ven directamente.

## Estructura

```
src/
  auth/     GET /auth/google            -> redirige al consentimiento de Google
            GET /auth/google/callback   -> intercambia el code por tokens
  events/   POST /events                -> crea el evento en Google Calendar
  health/   GET  /health
  config/   Configuración centralizada desde variables de entorno
```

## Requisito previo

Debes tener ya las credenciales del **Paso 1** (Google Cloud Console):
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, y el redirect URI autorizado
`http://localhost:3001/auth/google/callback`.

## Variables de entorno

```bash
cp .env.example .env
```

| Variable              | Descripción                                                        |
|------------------------|---------------------------------------------------------------------|
| PORT                   | Puerto del servicio (default 3001)                                  |
| GOOGLE_CLIENT_ID       | Del proyecto en Google Cloud Console                                 |
| GOOGLE_CLIENT_SECRET   | Del proyecto en Google Cloud Console (nunca lo subas al repo)        |
| GOOGLE_REDIRECT_URI    | Debe coincidir EXACTO con el configurado en Google Cloud Console     |

## Instalación y ejecución

```bash
npm install
cp .env.example .env   # y completa las credenciales
npm run start:dev
```

## Flujo de autenticación (cómo encaja todo)

1. La extensión abre una pestaña hacia `GET /auth/google` (a través del BFF).
2. Este servicio redirige al usuario a la pantalla de consentimiento de Google.
3. El usuario acepta, Google redirige de vuelta a `GET /auth/google/callback?code=...`.
4. Este servicio intercambia el `code` por un `access_token` (y `refresh_token`
   la primera vez), y redirige la pestaña a `GET /auth/success#access_token=...`
   — una página propia de este backend, no de la extensión.
5. La extensión vigila esa pestaña desde su `background.ts`
   (`chrome.tabs.onUpdated`), captura el token del fragmento de la URL, lo
   guarda, y cierra la pestaña. No hay redirección directa hacia
   `chrome-extension://`, porque Chromium bloquea ese tipo de navegación
   cuando la inicia una página web normal.
6. Para crear un evento, el llamador (normalmente el BFF) envía
   `POST /events` con `Authorization: Bearer <access_token>`.

## Pendiente para el siguiente incremento

- Persistir `refresh_token` de forma segura si se quiere evitar que el
  usuario tenga que loguearse cada vez que expira el `access_token`
  (actualmente no se guarda en ningún lado).

## Probar sin la extensión todavía

```bash
curl http://localhost:3001/health

# Abre esto en el navegador (no con curl, necesita interacción del usuario):
# http://localhost:3001/auth/google
```
