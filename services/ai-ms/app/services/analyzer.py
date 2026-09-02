import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional, Tuple, List

from app.config import Settings
from app.schemas import AnalysisResult
from app.services.providers.base import LLMProvider
from app.services.providers.gemini_provider import GeminiProvider
from app.services.providers.openrouter_provider import OpenRouterProvider

# Fallback date parsing library
import dateparser
from dateparser.search import search_dates

logger = logging.getLogger("analyzer")

# Mejora del prompt: instruir explícitamente formato ISO (naive) y ejemplos
SYSTEM_PROMPT_TEMPLATE = """Eres un asistente que extrae información de eventos
académicos (tareas, exámenes, entregas, clases) a partir de texto extraído
de una página web. Responde ÚNICAMENTE con un objeto JSON (sin explicaciones)
que siga exactamente este esquema (devuelve null si no hay valor):

{
  "title": string,
  "start_date_time": string|null, // ISO 8601 sin zona, ejemplo: "2026-09-10T15:00:00" o null
  "end_date_time": string|null,   // mismo formato o null
  "location": string|null,
  "description": string|null,
  "confidence": number // 0.0 a 1.0
}

Reglas importantes para las fechas:
- Si detectas una fecha/hora, conviértela y devuélvela en formato ISO 8601
  "naive" (sin zona) exacto hasta minutos/segundos: YYYY-MM-DDTHH:MM:SS.
- Si el texto solo indica una fecha (sin hora), devuelve la hora "00:00:00".
- Si la fecha es relativa ("próximo viernes", "en 2 semanas"), resuélvela
  respecto a la fecha de referencia proporcionada abajo y devuelve la fecha
  exacta en ISO naive.
- Si no hay fecha válida para el evento, devuelve null en start_date_time.

Ejemplos (entrada -> salida JSON):
- Texto: "Entrega: 10/09/2026 15:00" -> start_date_time: "2026-09-10T15:00:00"
- Texto: "Fecha límite: 2 de octubre" (hoy 2026-09-01) -> "2026-10-02T00:00:00"
- Texto: "Entrega el próximo viernes a las 3pm" (hoy 2026-09-01 y el viernes es 2026-09-03)
  -> "2026-09-03T15:00:00"

La fecha actual de referencia es __TODAY__.
"""


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


# Palabras clave que indican entregas / fecha límite
DEADLINE_KEYWORDS = [
    "entrega",
    "fecha de entrega",
    "fecha límite",
    "fecha limite",
    "deadline",
    "due",
    "vencimiento",
]


def _normalize_datetime_to_naive_iso(dt: datetime) -> str:
    # Remove tzinfo if present and return ISO without microseconds
    naive = dt.replace(tzinfo=None, microsecond=0)
    return naive.isoformat()


def _try_parse_iso_like(s: str) -> Optional[datetime]:
    if not s or not isinstance(s, str):
        return None
    try:
        # datetime.fromisoformat supports many ISO variants
        dt = datetime.fromisoformat(s)
        # return naive version
        return dt.replace(tzinfo=None)
    except Exception:
        return None


def _search_dates_candidates(text: str, base: datetime) -> List[Tuple[str, datetime]]:
    # Use dateparser's search_dates with settings tuned for spanish and english
    settings = {
        "RELATIVE_BASE": base,
        "PREFER_DAY_OF_MONTH": "first",
        "PREFER_DATES_FROM": "future",
        "RETURN_AS_TIMEZONE_AWARE": False,
    }
    found = search_dates(text, languages=["es", "en"], settings=settings)
    return found or []


def _choose_best_candidate(candidates: List[Tuple[str, datetime]], text: str) -> Optional[Tuple[str, datetime]]:
    if not candidates:
        return None

    # If any candidate is adjacent / contains a deadline keyword, prefer those
    keyword_positions = []
    lower_text = text.lower()
    for kw in DEADLINE_KEYWORDS:
        pos = lower_text.find(kw)
        if pos >= 0:
            keyword_positions.append(pos)

    best = None
    best_score = None

    for cand_text, cand_dt in candidates:
        # find position of candidate substring
        pos = lower_text.find(cand_text.lower())
        if pos < 0:
            # fallback to 0
            pos = 0
        score = 0
        # smaller distance to any keyword -> better (subtract distance)
        if keyword_positions:
            dist = min(abs(pos - kpos) for kpos in keyword_positions)
            score -= dist
        # prefer future dates (already configured) but as tie-breaker prefer larger datetime
        score += (cand_dt - datetime.now()).total_seconds() / (60 * 60 * 24 + 1)

        if best is None or score > best_score:
            best = (cand_text, cand_dt)
            best_score = score

    return best


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
            logger.warning("Respuesta del modelo no es JSON válido, se intentará fallback: %s", raw_content)
            parsed = {"title": None, "start_date_time": None, "end_date_time": None, "location": None, "description": None, "confidence": 0.0}

        # Normalizar/validar start_date_time
        start_dt_str = parsed.get("start_date_time")
        start_dt = _try_parse_iso_like(start_dt_str) if start_dt_str else None

        if start_dt is None:
            # fallback: buscar en el texto
            base = datetime.now()
            candidates = _search_dates_candidates(text, base)
            chosen = _choose_best_candidate(candidates, text)
            if chosen:
                _, cand_dt = chosen
                start_dt = cand_dt
                logger.info("Fallback date chosen: %s", start_dt)
            else:
                logger.debug("No se encontraron candidatos de fecha en el texto")

        if start_dt:
            parsed_start_iso = _normalize_datetime_to_naive_iso(start_dt)
        else:
            parsed_start_iso = None

        # Normalizar end_date_time si existe (simple try-parse)
        end_dt_str = parsed.get("end_date_time")
        end_dt = _try_parse_iso_like(end_dt_str) if end_dt_str else None
        parsed_end_iso = _normalize_datetime_to_naive_iso(end_dt) if end_dt else None

        title = parsed.get("title") or "Evento sin título"
        location = parsed.get("location")
        description = parsed.get("description")
        confidence = float(parsed.get("confidence", 0.0))

        return AnalysisResult(
            title=title,
            startDateTime=parsed_start_iso,
            endDateTime=parsed_end_iso,
            location=location,
            description=description,
            confidence=confidence,
        )
