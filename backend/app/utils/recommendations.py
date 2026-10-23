from __future__ import annotations

from typing import Any
from app.recommendation.recommendation_service import generate_recommendations


class RecommendationEngine:
    """Generate retention recommendations from churn, SHAP, and segment context."""

    def __init__(self) -> None:
        self.default_segment = "unknown"

    def recommend(
        self,
        churn_probability: float,
        shap_features: list[dict[str, Any]] | None = None,
        customer_segment: Any = None,
        features: dict[str, Any] | None = None,
    ) -> list[str]:
        """Create personalized retention recommendations."""
        prediction = 1 if churn_probability >= 0.5 else 0
        return generate_recommendations(
            prediction=prediction,
            probability=churn_probability,
            customer_segment=customer_segment,
            shap_values=shap_features,
            features=features,
        )

