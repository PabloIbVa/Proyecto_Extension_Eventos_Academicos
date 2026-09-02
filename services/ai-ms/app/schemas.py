from typing import Literal

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=20000)
    url: str | None = None


class AnalysisResult(BaseModel):
    title: str
    start_date_time: str | None = Field(default=None, alias="startDateTime")
    end_date_time: str | None = Field(default=None, alias="endDateTime")
    location: str | None = None
    description: str | None = None
    confidence: float = Field(ge=0.0, le=1.0)

    model_config = {"populate_by_name": True}


class HealthResponse(BaseModel):
    status: str
    service: str


class EventState(BaseModel):
    """Estado editable del evento que el chat puede leer y actualizar."""

    title: str | None = None
    start_date_time: str | None = Field(default=None, alias="startDateTime")
    location: str | None = None
    description: str | None = None

    model_config = {"populate_by_name": True}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    # Vacío cuando is_greeting=True (el primer mensaje lo genera el
    # asistente, no el usuario).
    message: str = Field(default="", max_length=2000)
    current_event: EventState = Field(default_factory=EventState, alias="currentEvent")
    history: list[ChatMessage] = Field(default_factory=list)
    is_greeting: bool = Field(default=False, alias="isGreeting")

    model_config = {"populate_by_name": True}


class ChatResponse(BaseModel):
    reply: str
    event: EventState
    missing_fields: list[str] = Field(default_factory=list, alias="missingFields")

    model_config = {"populate_by_name": True}
