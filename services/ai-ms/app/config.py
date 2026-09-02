from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    port: int = 8000

    # Proveedor activo. Cambiar esto (y reiniciar el servicio) es lo único
    # necesario para pasar de Gemini a OpenRouter o viceversa.
    ai_provider: Literal["gemini", "openrouter"] = "gemini"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.1-flash-lite"

    openrouter_api_key: str = ""
    # Verifica modelos gratuitos vigentes en https://openrouter.ai/models?max_price=0
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"

    cors_allow_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
