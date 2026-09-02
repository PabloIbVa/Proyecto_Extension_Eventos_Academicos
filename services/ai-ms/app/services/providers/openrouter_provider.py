import logging

from openai import AsyncOpenAI

from app.services.providers.base import LLMProvider

logger = logging.getLogger("openrouter_provider")

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterProvider(LLMProvider):
    """OpenRouter expone una API compatible con el formato de OpenAI, así
    que reutilizamos el SDK de `openai` apuntando a otra base_url. Sirve
    como respaldo cuando se agota la cuota gratuita de Gemini.

    Antes de usar en producción, revisa https://openrouter.ai/models?max_price=0
    para confirmar qué modelos gratuitos siguen disponibles — la lista
    cambia con frecuencia.
    """

    def __init__(self, api_key: str, model: str):
        self._client = AsyncOpenAI(api_key=api_key, base_url=OPENROUTER_BASE_URL)
        self._model = model

    async def complete_json(self, system_prompt: str, user_content: str) -> str:
        response = await self._client.chat.completions.create(
            model=self._model,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        content = response.choices[0].message.content
        if not content:
            logger.error("OpenRouter devolvió una respuesta vacía.")
            raise ValueError("OpenRouter no devolvió contenido en la respuesta.")
        return content
