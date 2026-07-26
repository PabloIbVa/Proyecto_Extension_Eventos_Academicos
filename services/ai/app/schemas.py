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
