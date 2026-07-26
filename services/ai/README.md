# AI Processing Service

Servicio en Python + FastAPI responsable de analizar el texto extraído de
una página web y devolver una propuesta estructurada de evento académico
(título, fecha/hora de inicio, fecha/hora de fin, nivel de confianza).

Soporta dos proveedores de IA intercambiables mediante una variable de
entorno, sin tocar código:

- **Gemini** (Google) — proveedor principal, gratis, sin tarjeta requerida.
- **OpenRouter** — respaldo, útil si se agota la cuota gratuita de Gemini.

## Estructura

```
app/
  main.py               App FastAPI, rutas: GET /health, POST /analyze
  config.py             Configuración centralizada (pydantic-settings)
  schemas.py            Modelos Pydantic (request/response)
  services/
    analyzer.py          Lógica de negocio: arma el prompt, parsea la respuesta
    providers/
      base.py             Interfaz común (contrato) que deben cumplir los proveedores
      gemini_provider.py   Implementación con Gemini
      openrouter_provider.py Implementación con OpenRouter (respaldo)
requirements.txt
.env.example
```

## Requisitos

- Python 3.11 o superior
- Una API key de Gemini (gratis, sin tarjeta): https://aistudio.google.com/apikey
- (Opcional) Una API key de OpenRouter como respaldo: https://openrouter.ai/keys

## Instalación

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

## Configuración

```bash
cp .env.example .env
```

Como mínimo, completa `GEMINI_API_KEY`. El resto de variables ya vienen
con valores por default razonables.

| Variable            | Descripción                                          | Default                                    |
|----------------------|--------------------------------------------------------|----------------------------------------------|
| PORT                 | Puerto del servicio                                    | 8000                                          |
| AI_PROVIDER          | `gemini` u `openrouter`                                | gemini                                        |
| GEMINI_API_KEY       | Tu clave de Gemini                                     | (vacío)                                       |
| GEMINI_MODEL         | Modelo de Gemini a usar                                | gemini-2.5-flash-lite                         |
| OPENROUTER_API_KEY   | Tu clave de OpenRouter (solo si AI_PROVIDER=openrouter) | (vacío)                                       |
| OPENROUTER_MODEL     | Modelo gratuito de OpenRouter a usar                    | meta-llama/llama-3.3-70b-instruct:free        |

### Cómo cambiar de proveedor

Si Gemini se queda sin cuota gratuita en algún momento, cambia en `.env`:
```
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=tu_clave
```
y reinicia el servicio. No hace falta tocar ningún otro archivo — la
capa de abstracción en `services/providers/` se encarga de todo.

**Importante:** los modelos gratuitos de OpenRouter cambian con
frecuencia. Antes de usarlo, verifica cuáles siguen disponibles en
https://openrouter.ai/models?max_price=0 y ajusta `OPENROUTER_MODEL` si
hace falta.

## Ejecutar en desarrollo

```bash
uvicorn app.main:app --reload --port 8000
```

Documentación interactiva autogenerada (Swagger UI): `http://localhost:8000/docs`

### Si te da error 404 "model no longer available"

Google retira y reemplaza nombres de modelo de Gemini con bastante
frecuencia. Si `GEMINI_MODEL` deja de funcionar, revisa el listado
vigente en https://ai.google.dev/gemini-api/docs/models, actualiza el
valor en tu `.env`, y reinicia el servicio.

## Endpoints

- `GET /health` — verifica que el servicio esté vivo.
- `POST /analyze` — body: `{ "text": string, "url"?: string }`.
  Devuelve: `{ "title": string, "startDateTime": string|null, "endDateTime": string|null, "confidence": number }`.

## Probar sin conectar aún el BFF

```bash
curl http://localhost:8000/health

curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Recuerda que el examen parcial es el 30 de julio a las 10am en el aula 204"}'
```

Si falta la API key del proveedor activo, este endpoint responde `500`.
Si hay un problema de red o cuota agotada, responde `502` de forma
controlada (no tumba el servicio).

## Notas de diseño

- El prompt fuerza a ambos proveedores a responder en JSON puro para que
  el parseo sea confiable.
- `confidence` sirve para que la extensión decida si mostrarle al usuario
  una vista previa editable antes de crear el evento, o pedir confirmación
  extra cuando la confianza es baja (esto se implementa en la extensión,
  no aquí).
- Este servicio no crea el evento en Google Calendar directamente — solo
  propone los datos. La creación real la hace el Calendar Service, a
  través del BFF.
