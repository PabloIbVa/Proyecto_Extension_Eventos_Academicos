import logging

from google import genai
from google.genai import types

from app.services.providers.base import LLMProvider

logger = logging.getLogger("gemini_provider")


class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def complete_json(self, system_prompt: str, user_content: str) -> str:
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=user_content,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        if not response.text:
            logger.error("Gemini devolvió una respuesta vacía.")
            raise ValueError("Gemini no devolvió contenido en la respuesta.")
        return response.text
