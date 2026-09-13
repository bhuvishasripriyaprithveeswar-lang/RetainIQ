from pydantic import BaseModel, Field


class PredictionResponse(BaseModel):
    """Response schema for churn prediction with explanation and recommendations."""

    customer_id: str | None = Field(default=None, description="Customer identifier")
    prediction: int | None = Field(default=None, description="Predicted churn label")
    probability: float | None = Field(default=None, description="Prediction probability")
    customer_segment: str | None = Field(default=None, description="Assigned customer segment")
    shap_values: dict[str, float] | None = Field(default=None, description="Top-5 SHAP feature contributions")
    recommendations: list[str] | None = Field(default=None, description="Prioritised retention recommendations")

