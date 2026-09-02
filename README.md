# Asistente de Eventos Académicos

Este proyecto combina una extensión de Chrome con un conjunto de microservicios para automatizar la captura de información académica, analizarla con inteligencia artificial y crear eventos en Google Calendar.

La idea principal es simple: mientras el usuario navega en páginas académicas o revisa información relacionada con tareas, entregas, fechas y actividades, la extensión detecta ese contenido, lo procesa con IA y ayuda a convertirlo en eventos o recordatorios útiles.

## ¿Qué es este proyecto?

Es una solución full-stack compuesta por:

- Una extensión para navegador (`extension/`), que se ejecuta en Chrome.
- Un backend BFF (`services/bff-ms/`), que expone la API principal y coordina la lógica de integración.
- Un servicio de calendario (`services/calendar-ms/`), encargado de la autenticación con Google y la creación de eventos.
- Un servicio de inteligencia artificial (`services/ai-ms/`), que analiza texto y extrae fechas, tareas o entregas relevantes.

La extensión no se ejecuta dentro de Docker; Docker solo levanta los servicios backend. La extensión se carga desde Chrome como una extensión local en modo desarrollador.

## ¿Cómo está compuesto?

```text
Proyecto_Extension_Eventos_Academicos/
├── .env                     # Variables de entorno para Docker
├── .env.example            # Ejemplo de configuración
├── docker-compose.yml      # Orquestación de los microservicios
├── README.md               # Documentación principal
├── extension/              # Extensión de Chrome
│   ├── manifest.json
│   ├── popup/
│   ├── background.js
│   ├── content-script.js
│   └── ...
├── services/
│   ├── bff-ms/             # API gateway / backend principal
│   ├── calendar-ms/        # Integración con Google Calendar
│   └── ai-ms/              # Procesamiento con IA
│       ├── app/
│       ├── tests/
│       └── Dockerfile
└── ...
```

### Descripción de cada servicio

#### 1) `extension/`
Es la parte del usuario. Se instala como extensión en Chrome y cumple funciones como:

- detectar contenido relevante en la página,
- enviar la información al backend,
- mostrar la información al usuario,
- iniciar el flujo de autenticación con Google Calendar.

#### 2) `services/bff-ms/`
Es el backend principal o API gateway del proyecto. Se encarga de:

- recibir solicitudes de la extensión,
- coordinar llamadas a otros servicios,
- orquestar la lógica de negocio,
- manejar peticiones de evento y procesamiento.

#### 3) `services/calendar-ms/`
Es el servicio que se conecta con Google Calendar. Su rol principal es:

- autenticar usuarios con Google,
- obtener permisos para crear eventos,
- registrar eventos con fecha, título y descripción.

#### 4) `services/ai-ms/`
Es el servicio de análisis inteligente. Aquí se procesa el texto detectado por la extensión y se intenta identificar:

- fechas de entrega,
- tareas o eventos,
- información relevante para automatizar la captura de datos.

## Requisitos previos

Antes de iniciar el proyecto, asegúrate de tener instalado lo siguiente:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) o Docker Engine con Docker Compose.
- [Google Chrome](https://www.google.com/chrome/) para cargar la extensión.
- Credenciales de Google Cloud para autenticación con Calendar.
- Una clave API de Gemini o OpenRouter para el servicio de IA.
- Una terminal con acceso a bash o PowerShell.

## Configuración antes de iniciar

### 1) Crear el archivo `.env`
En la raíz del proyecto copia el ejemplo:

```bash
cp .env.example .env
```

Luego llena las variables con tus credenciales reales. Un ejemplo sería:

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

- `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` son necesarios para OAuth con Google Calendar.
- `GEMINI_API_KEY` es necesaria si usas `AI_PROVIDER=gemini`.
- `OPENROUTER_API_KEY` solo es necesaria si decides usar proveedor OpenRouter.

### 2) Verifica que Docker esté corriendo
Abre Docker Desktop o asegúrate de que el servicio de Docker esté activo antes de ejecutar los contenedores.

### 3) Carga la extensión en Chrome
La extensión no se levanta con Docker. Debes cargarla manualmente:

1. Abrir Chrome.
2. Ir a `chrome://extensions`.
3. Activar "Modo desarrollador".
4. Seleccionar "Cargar descomprimida".
5. Elegir la carpeta `extension/` del proyecto.

## Paso a paso para iniciar el proyecto

Desde la raíz del repositorio, ejecuta:

```bash
docker compose up --build
```

Este comando:

- crea las imágenes de cada servicio,
- instanciará los contenedores de `bff-ms`, `calendar-ms` y `ai-ms`,
- levanta la red interna para que los microservicios se puedan comunicar entre sí.

### Espera a que los servicios estén listos
Puedes comprobar el estado de cada uno con:

```bash
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:8000/health
```

Si todo está correcto, cada endpoint debe responder con un JSON de estado positivo, por ejemplo `{"status":"ok"}`.

## ¿Cómo funcionan juntos?

El flujo general es el siguiente:

1. La extensión detecta contenido relevante en la página.
2. Envía ese contenido al `bff-ms`.
3. `bff-ms` coordina con `ai-ms` para analizar el texto.
4. `ai-ms` intenta identificar fechas, entregas o eventos relevantes.
5. `calendar-ms` se encarga de autenticar con Google y crear el evento final.
6. El usuario puede revisar la información dentro de la extensión y continuar con el flujo.

## Reiniciar y reconstruir

Si haces cambios en el código de los servicios, reconstruye las imágenes con:

```bash
docker compose up --build
```

Si quieres reconstruir desde cero y sin caché:

```bash
docker compose build --no-cache
```

## Detener los contenedores

Para apagar todo el entorno:

```bash
docker compose down
```

Si estás ejecutando la composición en la terminal actual, también puedes detenerla con `Ctrl + C`.

## Solución rápida a problemas comunes

### 1) Puerto ya en uso
Si ya tenías algo corriendo en los puertos 3000, 3001 o 8000, detén esos procesos antes de iniciar Docker.

### 2) Error de variables de entorno
Verifica que el archivo `.env` exista y que tenga valores válidos.

### 3) Error al construir imágenes
Revisa los logs de Docker:

```bash
docker compose logs -f
```

### 4) La extensión no carga
Asegúrate de:

- haber habilitado "Modo desarrollador",
- haber cargado la carpeta `extension/`,
- que el backend esté levantado antes de probar la extensión.

## Resumen rápido

Si quieres arrancar el proyecto en 3 pasos:

```bash
cp .env.example .env
# completar .env con tus claves

docker compose up --build
```

Y luego carga la carpeta `extension/` en Chrome para usar la app.

## Nota importante

Docker Compose solo levanta los servicios backend. La parte visual de la extensión se carga de forma independiente en el navegador, como cualquier otra extensión de Chrome.

Esto permite separar la lógica de negocio y la integración con IA del manejo de la UI del usuario.
