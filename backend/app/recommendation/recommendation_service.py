from __future__ import annotations

from typing import Any


def generate_recommendations(
    prediction: int,
    probability: float,
    customer_segment: str | None = None,
    shap_values: dict[str, float] | list[dict[str, Any]] | None = None,
    features: dict[str, Any] | None = None,
) -> list[str]:
    """Return personalized Customer Insight and Recommended Action based on prediction context."""
    vals = features or {}
    prob_float = float(probability)
    prob_pct = round(prob_float * 100 if prob_float <= 1.0 else prob_float)

    # Determine segment string
    if isinstance(customer_segment, str) and customer_segment:
        segment_str = customer_segment.replace(" Customers", "").strip()
    elif customer_segment:
        segment_str = str(customer_segment)
    else:
        segment_str = "Standard"

    # Normalize SHAP values into dict[str, float]
    shap_dict: dict[str, float] = {}
    if isinstance(shap_values, list):
        for item in shap_values:
            if isinstance(item, dict):
                f_name = item.get("feature") or item.get("name")
                f_val = item.get("contribution") or item.get("value") or item.get("shap_value", 0.0)
                if f_name:
                    shap_dict[str(f_name)] = float(f_val)
    elif isinstance(shap_values, dict):
        shap_dict = {str(k): float(v) for k, v in shap_values.items()}

    # Rank SHAP factors by absolute magnitude
    sorted_shap = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)
    top_feature_names = [f for f, _ in sorted_shap[:3]]

    # Map top features & values to natural language factor descriptions
    factor_descriptions: list[str] = []

    for feat in top_feature_names:
        feat_lower = feat.lower()
        if any(k in feat_lower for k in ["login", "inactivity", "days_since"]):
            days = vals.get("Days_Since_Last_Login", 0)
            if days > 14:
                factor_descriptions.append("recent login inactivity")
            else:
                factor_descriptions.append("login activity patterns")
        elif "auto_renewal" in feat_lower or "renewal" in feat_lower:
            if vals.get("Auto_Renewal", 1) == 0:
                factor_descriptions.append("disabled auto-renewal status")
            else:
                factor_descriptions.append("account renewal settings")
        elif "payment" in feat_lower or "failure" in feat_lower:
            if vals.get("Payment_Failures", 0) > 0:
                factor_descriptions.append("recent payment failures")
            else:
                factor_descriptions.append("billing history")
        elif "satisfaction" in feat_lower:
            if vals.get("Satisfaction_Score", 5) <= 2:
                factor_descriptions.append("low customer satisfaction scores")
            else:
                factor_descriptions.append("satisfaction indicators")
        elif any(k in feat_lower for k in ["support", "complaint", "ticket"]):
            if vals.get("Support_Tickets", 0) >= 2 or vals.get("Complaints_Count", 0) >= 1:
                factor_descriptions.append("recent support interactions and complaints")
            else:
                factor_descriptions.append("service experience factors")
        elif any(k in feat_lower for k in ["hours", "content", "usage"]):
            hours = vals.get("Monthly_Content_Hours", 0)
            if hours < 8:
                factor_descriptions.append("low content consumption")
            else:
                factor_descriptions.append("content usage patterns")
        elif "completion" in feat_lower:
            factor_descriptions.append("content completion rates")
        elif any(k in feat_lower for k in ["spend", "tenure", "balance"]):
            factor_descriptions.append("account tenure and spend history")

    # If SHAP didn't yield specific factors, fall back to checking explicit feature values
    if not factor_descriptions:
        if vals.get("Auto_Renewal", 1) == 0:
            factor_descriptions.append("disabled auto-renewal status")
        if vals.get("Days_Since_Last_Login", 0) > 14 or vals.get("Login_Frequency", 10) <= 4:
            factor_descriptions.append("engagement and activity levels")
        if vals.get("Payment_Failures", 0) > 0:
            factor_descriptions.append("billing friction")
        if vals.get("Satisfaction_Score", 5) <= 2 or vals.get("Complaints_Count", 0) >= 1:
            factor_descriptions.append("customer feedback indicators")

    # Fallback if still empty
    if not factor_descriptions:
        factor_descriptions.append("engagement and account-related factors")

    # Deduplicate factor descriptions while maintaining order
    unique_factors: list[str] = []
    for f in factor_descriptions:
        if f not in unique_factors:
            unique_factors.append(f)

    if len(unique_factors) >= 2:
        factors_text = f"{unique_factors[0]} and {unique_factors[1]}"
    else:
        factors_text = unique_factors[0]

    # --- Section 1: Customer Insight ---
    insight_s1 = f"This customer has a {prob_pct}% churn probability and belongs to the {segment_str} segment."

    if prob_pct >= 40 or prediction == 1:
        insight_s2 = f"The prediction is mainly influenced by {factors_text}."
    else:
        insight_s2 = f"The prediction is mainly influenced by positive engagement and account-related factors."

    customer_insight = f"Customer Insight:\n{insight_s1} {insight_s2}"

    # --- Section 2: Recommended Action ---
    if prob_pct >= 40 or prediction == 1:
        # High / Moderate risk retention actions
        if vals.get("Auto_Renewal", 1) == 0 or "renewal" in factors_text:
            action_s1 = "Maintain engagement with relevant content recommendations and send a timely renewal reminder."
        elif vals.get("Payment_Failures", 0) > 0 or "payment" in factors_text or "billing" in factors_text:
            action_s1 = "Prompt the customer to verify payment details and resolve billing friction promptly."
        elif vals.get("Satisfaction_Score", 5) <= 2 or vals.get("Complaints_Count", 0) >= 1 or "support" in factors_text or "feedback" in factors_text:
            action_s1 = "Prioritize a support follow-up to address outstanding service concerns and restore satisfaction."
        elif vals.get("Days_Since_Last_Login", 0) > 14 or "inactivity" in factors_text or "engagement" in factors_text:
            action_s1 = "Launch a targeted re-engagement campaign featuring personalized content suggestions."
        else:
            action_s1 = "Provide a proactive retention offer tailored to the customer's account profile."

        action_s2 = "Monitor changes in login activity and content consumption for early signs of disengagement."
    else:
        # Low risk retention actions (focus on maintaining engagement)
        if vals.get("Auto_Renewal", 1) == 0:
            action_s1 = "Maintain engagement with relevant content recommendations and send a timely renewal reminder."
        else:
            action_s1 = "Maintain ongoing engagement with personalized content suggestions and value updates."

        action_s2 = "Continue tracking login frequency and feature adoption to preserve long-term customer loyalty."

    recommended_action = f"Recommended Action:\n{action_s1} {action_s2}"

    return [customer_insight, recommended_action]

