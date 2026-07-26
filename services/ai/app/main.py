import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.schemas import AnalyzeRequest, HealthResponse
from app.services.analyzer import AnalyzerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai-service")

settings = get_settings()

app = FastAPI(title="AI Processing Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

analyzer_service = AnalyzerService(settings)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="ai-service")


@app.post("/analyze")
async def analyze(payload: AnalyzeRequest) -> JSONResponse:
    if settings.ai_provider == "gemini" and not settings.gemini_api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY no está configurada en el AI Processing Service.",
        )
    if settings.ai_provider == "openrouter" and not settings.openrouter_api_key:
        raise HTTPException(
            status_code=500,
            detail="OPENROUTER_API_KEY no está configurada en el AI Processing Service.",
        )

    try:
        result = await analyzer_service.analyze(payload.text, payload.url)
    except Exception as error:  # noqa: BLE001 - se traduce a un 502 controlado
        logger.error("Error al analizar el contenido: %s", error)
        raise HTTPException(
            status_code=502,
            detail="No fue posible analizar el contenido con el modelo de IA.",
        ) from error

    # by_alias=True para que la respuesta use camelCase (startDateTime, etc.)
    # y coincida con lo que espera el BFF en NestJS.
    return JSONResponse(content=result.model_dump(by_alias=True))
