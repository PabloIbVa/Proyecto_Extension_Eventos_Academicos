from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Contrato común que debe cumplir cualquier proveedor de IA usado
    para extraer datos de eventos académicos. Permite cambiar de proveedor
    (Gemini, OpenRouter, etc.) sin tocar analyzer.py ni el resto del
    servicio.
    """

    @abstractmethod
    async def complete_json(self, system_prompt: str, user_content: str) -> str:
        """Envía el prompt al modelo y devuelve la respuesta cruda como
        texto (se espera que sea un JSON válido, pero el parseo lo hace
        quien llama, no el provider)."""
        raise NotImplementedError
