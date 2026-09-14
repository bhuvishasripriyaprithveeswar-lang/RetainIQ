from __future__ import annotations

from typing import Any


class RecommendationEngine:
    """Generate retention recommendations from churn, SHAP, and segment context."""

    def __init__(self) -> None:
        self.default_segment = "unknown"

    def _get_segment_label(self, segment: Any) -> str:
        if isinstance(segment, str) and segment:
            return segment
        if isinstance(segment, (int, float)):
            return f"segment_{int(segment)}"
        return self.default_segment

    def _get_priority(self, churn_probability: float) -> str:
        if churn_probability >= 0.75:
            return "critical"
        if churn_probability >= 0.5:
            return "high"
        if churn_probability >= 0.3:
            return "medium"
        return "low"

    def recommend(
        self,
        churn_probability: float,
        shap_features: list[dict[str, Any]] | None = None,
        customer_segment: Any = None,
    ) -> list[dict[str, Any]]:
        """Create 3-5 personalized retention recommendations."""
        segment_label = self._get_segment_label(customer_segment)
        priority = self._get_priority(churn_probability)
        features = shap_features or []
        important_features = [item.get("feature", "") for item in features if item.get("feature")]

        recommendations: list[dict[str, Any]] = []

        if priority in {"critical", "high"}:
            recommendations.append(
                {
                    "title": "Launch an immediate retention offer",
                    "reason": "The customer is at elevated churn risk and should receive a proactive incentive.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        if any(feature.lower().startswith("tenure") for feature in important_features):
            recommendations.append(
                {
                    "title": "Re-engage the customer with a lifecycle-based offer",
                    "reason": "Tenure is a strong driver of churn risk for this profile.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        if any(feature.lower().startswith("monthly_spend") or feature.lower().startswith("payment_failures") for feature in important_features):
            recommendations.append(
                {
                    "title": "Offer a value-preserving subscription incentive",
                    "reason": "The explanation highlights spend or payment friction, which often signals subscription risk.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        if any(feature.lower().startswith("age") or feature.lower().startswith("gender") for feature in important_features):
            recommendations.append(
                {
                    "title": "Personalize outreach with segment-aware messaging",
                    "reason": "Demographic factors suggest the retention message should be tailored.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        if not recommendations:
            recommendations.append(
                {
                    "title": "Send a targeted check-in campaign",
                    "reason": "A standard retention touchpoint is appropriate for this customer profile.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        if priority == "critical" and len(recommendations) < 5:
            recommendations.append(
                {
                    "title": "Escalate to a retention specialist",
                    "reason": "This customer needs high-touch intervention due to very high churn risk.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        if len(recommendations) < 3:
            recommendations.append(
                {
                    "title": "Monitor engagement closely over the next cycle",
                    "reason": "The customer should be watched for further deterioration in product usage.",
                    "priority": priority,
                    "segment": segment_label,
                }
            )

        while len(recommendations) > 5:
            recommendations.pop()

        return recommendations
