# Asistente de Eventos Académicos

Este proyecto combina una extensión de Chrome con varios microservicios para detectar contenido académico, analizarlo con inteligencia artificial y convertirlo en eventos en Google Calendar.

La idea principal es automatizar la captura de información importante para el usuario, como tareas, fechas de entrega, recordatorios o eventos académicos, sin que tenga que copiar manualmente cada detalle.

## ¿Qué es este proyecto?

Es una solución full-stack compuesta por:

- una extensión de navegador para Chrome (`extension/`),
- un backend principal (`services/bff-ms/`),
- un servicio de Google Calendar (`services/calendar-ms/`),
- un servicio de IA (`services/ai-ms/`).

El objetivo es que el usuario navegue normalmente en páginas académicas, la extensión detecte contenido relevante, lo procese con IA, y luego el sistema pueda crear eventos o recordatorios automáticamente.

## ¿Cómo está estructurado?

```text
Proyecto_Extension_Eventos_Academicos/
├── .env                     # variables de entorno para Docker
├── .env.example            # ejemplo de configuración
├── docker-compose.yml      # orquestación de todos los servicios
├── README.md               # documentación del proyecto
├── extension/              # extensión de chrome
│   ├── Dockerfile          # crea la build de la extensión
│   ├── dist/               # carpeta generada con la versión lista para cargar
│   ├── manifest.json
│   ├── package.json
│   ├── esbuild.config.js
│   ├── scripts/
│   ├── src/
│   └── icons/
├── services/
│   ├── bff-ms/             # backend principal / API
│   ├── calendar-ms/        # integración con Google Calendar
│   └── ai-ms/              # análisis con IA
│       ├── app/
│       ├── tests/
│       └── Dockerfile
└── ...
```

### Descripción del flujo

#### 1) `extension/`
Es la parte visible del sistema. Se instala como extensión en Chrome y realiza tareas como:

- detectar contenido en la página,
- leer el texto relevante,
- enviar la información al backend,
- abrir el flujo de autenticación con Google,
- permitir al usuario visualizar y confirmar la información.

#### 2) `services/bff-ms/`
Es el backend principal. Actúa como puente entre la extensión y el resto de servicios. Coordina llamadas a la IA y al calendario.

#### 3) `services/calendar-ms/`
Se encarga de autenticar al usuario con Google y crear eventos dentro de Google Calendar.

#### 4) `services/ai-ms/`
Recibe texto y lo analiza para detectar fechas, entregas, tareas o elementos importantes que puedan convertirse en eventos o recordatorios.

## Requisitos previos

Antes de iniciar el proyecto, asegúrate de tener:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) o Docker con Docker Compose funcionando.
- [Google Chrome](https://www.google.com/chrome/).
- Credenciales de Google Cloud para autenticación con Calendar.
- Una API key de Gemini o OpenRouter para el servicio de IA.
- Node.js y npm (solo si quieres compilar la extensión manualmente fuera de Docker).

## Preparación inicial

### 1) Crear el archivo `.env`
Copia el ejemplo desde la raíz del proyecto:

```bash
cp .env.example .env
```

Luego rellena tus valores reales:

```env
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_api_key_de_gemini
GEMINI_MODEL=gemini-3.1-flash-lite
OPENROUTER_API_KEY=
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

Importante:

- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` son necesarios para el login con Google Calendar.
- `GEMINI_API_KEY` es necesaria si usas `AI_PROVIDER=gemini`.
- `OPENROUTER_API_KEY` solo es necesaria si vas a usar OpenRouter.

### 2) Confirmar que Docker esté en ejecución
Antes de correr los contenedores, verifica que Docker Desktop o el servicio de Docker esté activo.

## Cómo iniciar el proyecto

Desde la raíz del proyecto ejecuta:

```bash
docker compose up --build
```

Este comando hace varias cosas automáticamente:

- construye los contenedores de los servicios backend,
- instala dependencias del frontend de la extensión,
- ejecuta el build de la extensión,
- genera la carpeta `extension/dist` en tu proyecto.

La carpeta `dist` queda lista para cargarla en Chrome como una extensión sin necesidad de ejecutar `npm install` ni `npm run build` manualmente.

## Verificar que los servicios están funcionando

Abre otra terminal y ejecuta:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:8000/health
```

Cada endpoint debe responder con un JSON correcto, como por ejemplo `{"status":"ok"}`.

## Cargar la extensión en Chrome

Una vez que Docker haya generado la carpeta `extension/dist`, haz esto:

1. Abre `chrome://extensions`.
2. Activa el modo desarrollador.
3. Haz clic en `Cargar descomprimida`.
4. Selecciona la carpeta `extension/dist`.
5. La extensión quedará instalada y lista para usar.

## Cómo volver a compilar la extensión

Si haces cambios en el código de la extensión, puedes reconstruirla con:

```bash
docker compose run --rm extension-builder
```

O también con:

```bash
docker compose up --build
```

Esto vuelve a ejecutar `npm install` y `npm run build`, y genera nuevamente la carpeta `dist`.

## Detener los servicios

Para apagar todo el entorno:

```bash
docker compose down
```

Si lo ejecutas desde la terminal actual, también puedes usar `Ctrl + C`.

## Solución rápida a problemas comunes

### 1) Error de puertos ya ocupados
Si otros procesos ya están usando 3000, 3001 o 8000, deténlos antes de levantar Docker.

### 2) Error de variables de entorno
Verifica que el archivo `.env` existe y que contiene valores válidos para Google y la IA.

### 3) La carpeta `dist` no aparece
Ejecuta:

```bash
docker compose run --rm extension-builder
```

y revisa si la build terminó correctamente.

### 4) La extensión no carga en Chrome
Asegúrate de:

- haber cargado la carpeta `extension/dist`, no la carpeta raíz,
- que los servicios backend estén levantados,
- que la extensión haya sido compilada correctamente.

## Nota importante

Docker ya no solo levanta el backend; también se encarga de preparar la extensión para que el usuario final solo tenga que cargar la carpeta `dist` en Chrome. Esto simplifica mucho el flujo de instalación y evita que el usuario tenga que ejecutar `npm install` y `npm run build` manualmente.
