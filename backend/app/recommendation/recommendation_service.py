from __future__ import annotations

from typing import Any

MAX_RECOMMENDATIONS = 4


def generate_recommendations(
    prediction: int,
    probability: float,
    customer_segment: str,
    shap_values: dict[str, float],
    features: dict[str, Any] | None = None,
) -> list[str]:
    """Return only feature-supported subscription retention actions."""
    values = features or {}
    recommendations: list[tuple[int, str]] = []

    if probability >= 0.5 or prediction == 1:
        recommendations.append((1, "Provide a targeted retention offer combined with a personalized re-engagement campaign."))
    if values.get("Days_Since_Last_Login", 0) > 30:
        recommendations.append((1, "Launch a targeted reactivation campaign to bring the customer back to the platform."))
    if values.get("Payment_Failures", 0) > 0:
        recommendations.append((1, "Prompt the customer to update their payment method to prevent subscription interruption."))
    if values.get("Satisfaction_Score", 5) <= 2:
        recommendations.append((1, "Provide a personalized customer-support intervention or satisfaction recovery offer."))
    if values.get("Complaints_Count", 0) >= 2 or values.get("Support_Tickets", 0) >= 3:
        recommendations.append((1, "Prioritize a customer-support follow-up to address service concerns."))
    if values.get("Login_Frequency", 0) <= 4 or values.get("Monthly_Content_Hours", 0) < 8:
        recommendations.append((2, "Send personalized content recommendations to increase customer engagement."))
    if values.get("Auto_Renewal", 1) == 0:
        recommendations.append((2, "Encourage auto-renewal to reduce the risk of subscription lapse."))
    if values.get("Content_Completion_Rate", 100) < 40:
        recommendations.append((2, "Recommend relevant content based on the customer's interests to improve engagement."))
    if values.get("Subscription_Type") == "Basic" and values.get("Login_Frequency", 0) >= 10 and values.get("Monthly_Content_Hours", 0) >= 20:
        recommendations.append((3, "Consider recommending an upgrade to a higher subscription tier based on the customer's usage."))

    shap_priority = {
        "Days_Since_Last_Login": "Launch a targeted reactivation campaign to bring the customer back to the platform.",
        "Payment_Failures": "Prompt the customer to update their payment method to prevent subscription interruption.",
        "Satisfaction_Score": "Provide a personalized customer-support intervention or satisfaction recovery offer.",
        "Login_Frequency": "Send personalized content recommendations to increase customer engagement.",
        "Monthly_Content_Hours": "Send personalized content recommendations to increase customer engagement.",
    }
    for feature in shap_values:
        message = shap_priority.get(feature)
        if message and not any(existing == message for _, existing in recommendations):
            recommendations.append((2, message))
            break

    recommendations.sort(key=lambda item: item[0])
    unique = []
    for _, message in recommendations:
        if message not in unique:
            unique.append(message)
    if not unique:
        unique.append("Continue monitoring engagement and subscription health over the next cycle.")
    return unique[:MAX_RECOMMENDATIONS]
