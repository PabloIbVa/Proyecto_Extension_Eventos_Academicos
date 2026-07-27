import json
import logging
from datetime import datetime, timezone

from app.config import Settings
from app.schemas import ChatMessage, ChatResponse, EventState
from app.services.analyzer import build_provider

logger = logging.getLogger("chat_service")

CHAT_SYSTEM_PROMPT_TEMPLATE = """Eres el asistente conversacional de una extensión \
que crea eventos académicos (tareas, exámenes, entregas) en Google Calendar. \
Tu trabajo es platicar de forma breve, cálida y directa con el estudiante \
para completar o modificar los datos de UN evento.

Los campos del evento son:
- title (texto)
- start_date_time (fecha y hora en formato ISO 8601)
- location (texto, opcional)
- description (texto, opcional)

Reglas:
1. Si el usuario da un dato nuevo o pide cambiar uno (ej. "mejor entregarlo \
antes", "el viernes a las 3pm", "cambia el aula a la 204"), actualiza el \
campo correspondiente. Si menciona un día relativo (viernes, mañana, la \
próxima semana), interpreta la fecha usando como referencia __TODAY__, y \
conserva la hora que ya tenía si no la menciona de nuevo.
2. Nunca inventes un dato que el usuario no haya dado ni que ya existiera \
en el evento.
3. Si siguen faltando datos importantes (sobre todo title o \
start_date_time), pregúntalos de forma natural, uno o dos a la vez, no \
como una lista fría de requisitos.
4. Sé breve (2 a 4 líneas), amigable, y ve directo al punto. No repitas \
un saludo largo en cada mensaje, solo en el primero.

Responde ÚNICAMENTE con un objeto JSON de esta forma exacta:
{
  "reply": string,
  "title": string|null,
  "start_date_time": string|null,
  "location": string|null,
  "description": string|null,
  "missing_fields": string[]
}

Los campos title/start_date_time/location/description deben reflejar el \
ESTADO ACTUALIZADO COMPLETO del evento (no solo lo que cambió en este \
turno) — usa null únicamente si de verdad no se conoce ese dato todavía. \
"missing_fields" es un subconjunto de ["title","start_date_time"] con los \
campos obligatorios que aún faltan (location y description son \
opcionales, nunca los marques como faltantes)."""


class ChatService:
    def __init__(self, settings: Settings):
        self._provider = build_provider(settings)

    async def chat(
        self,
        message: str,
        current_event: EventState,
        history: list[ChatMessage],
        is_greeting: bool,
    ) -> ChatResponse:
        today = datetime.now(timezone.utc).date().isoformat()
        system_prompt = CHAT_SYSTEM_PROMPT_TEMPLATE.replace("__TODAY__", today)

        event_json = json.dumps(current_event.model_dump(by_alias=True), ensure_ascii=False)
        history_text = (
            "\n".join(f"{m.role}: {m.content}" for m in history)
            if history
            else "(sin mensajes previos)"
        )

        if is_greeting:
            instruction = (
                "Este es el inicio de la conversación. Preséntate en una "
                "frase breve, dile al usuario qué datos del evento ya "
                "tienes (menciónalos) y cuáles faltan, invitándolo a "
                "completarlos o corregir cualquiera si quiere."
            )
            user_content = f"Estado actual del evento (JSON): {event_json}\n\nInstrucción: {instruction}"
        else:
            user_content = (
                f"Estado actual del evento (JSON): {event_json}\n\n"
                f"Historial de la conversación:\n{history_text}\n\n"
                f"Mensaje del usuario: {message}"
            )

        raw_content = await self._provider.complete_json(system_prompt, user_content)

        try:
            parsed = json.loads(raw_content)
        except json.JSONDecodeError:
            logger.error("Respuesta del chat no es JSON válido: %s", raw_content)
            raise ValueError("La respuesta del asistente no pudo interpretarse.")

        return ChatResponse(
            reply=parsed.get("reply", ""),
            event=EventState(
                title=parsed.get("title"),
                startDateTime=parsed.get("start_date_time"),
                location=parsed.get("location"),
                description=parsed.get("description"),
            ),
            missingFields=parsed.get("missing_fields", []),
        )
