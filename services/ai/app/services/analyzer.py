import json
import logging
from datetime import datetime, timezone

from app.config import Settings
from app.schemas import AnalysisResult
from app.services.providers.base import LLMProvider
from app.services.providers.gemini_provider import GeminiProvider
from app.services.providers.openrouter_provider import OpenRouterProvider

logger = logging.getLogger("analyzer")

SYSTEM_PROMPT_TEMPLATE = """Eres un asistente que extrae información de eventos \
académicos (tareas, exámenes, entregas, clases) a partir de texto extraído \
de una página web. Responde ÚNICAMENTE con un objeto JSON, sin texto \
adicional, con esta forma exacta:

{
  "title": string,              // título breve y claro del evento
  "start_date_time": string|null,  // fecha/hora en formato ISO 8601, o null si no se encuentra
  "end_date_time": string|null,    // opcional, ISO 8601, o null
  "confidence": number           // 0.0 a 1.0, qué tan seguro estás de la extracción
}

Si el texto no contiene un evento académico identificable, responde con
confidence bajo (menor a 0.3) y title describiendo brevemente por qué no
se pudo determinar. La fecha actual de referencia es __TODAY__ (usa este
año si el texto no especifica uno)."""


def build_provider(settings: Settings) -> LLMProvider:
    if settings.ai_provider == "gemini":
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY no está configurada.")
        return GeminiProvider(settings.gemini_api_key, settings.gemini_model)

    if settings.ai_provider == "openrouter":
        if not settings.openrouter_api_key:
            raise ValueError("OPENROUTER_API_KEY no está configurada.")
        return OpenRouterProvider(settings.openrouter_api_key, settings.openrouter_model)

    raise ValueError(f"AI_PROVIDER desconocido: {settings.ai_provider}")


class AnalyzerService:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._provider = build_provider(settings)

    async def analyze(self, text: str, url: str | None) -> AnalysisResult:
        today = datetime.now(timezone.utc).date().isoformat()
        system_prompt = SYSTEM_PROMPT_TEMPLATE.replace("__TODAY__", today)
        user_content = f"URL de origen: {url or 'desconocida'}\n\nTexto:\n{text}"

        raw_content = await self._provider.complete_json(system_prompt, user_content)

        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            logger.error("Respuesta del modelo no es JSON válido: %s", raw_content)
            raise ValueError("La respuesta del modelo no pudo interpretarse como JSON.")

        return AnalysisResult(
            title=parsed.get("title", "Evento sin título"),
            startDateTime=parsed.get("start_date_time"),
            endDateTime=parsed.get("end_date_time"),
            confidence=float(parsed.get("confidence", 0.0)),
        )
