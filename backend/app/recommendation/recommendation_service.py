from __future__ import annotations

# ---------------------------------------------------------------------------
# Recommendation Engine
# ---------------------------------------------------------------------------
# Rules are evaluated in three layers and tagged with a priority level so
# the final list can be sorted before it is returned.
#
# Priority levels (lower number = higher urgency):
#   1 – High   : Immediate retention actions (contact, assign manager, etc.)
#   2 – Medium : Loyalty, engagement, and segment-specific tactics
#   3 – Low    : Cross-selling and premium product suggestions
#
# Execution order:
#   Layer 1 – Churn probability  → urgency-based actions
#   Layer 2 – Customer segment   → segment-specific retention tactics
#   Layer 3 – Top SHAP feature   → personalised text from model explanation
#
# Post-processing:
#   • Duplicates are removed (first occurrence wins, order preserved)
#   • List is sorted by priority (High → Medium → Low)
#   • Capped at MAX_RECOMMENDATIONS items
#   • Falls back to DEFAULT_RECOMMENDATIONS when no rules fire
# ---------------------------------------------------------------------------

MAX_RECOMMENDATIONS = 5

# Default recommendations returned when no rules produce any output.
DEFAULT_RECOMMENDATIONS: list[str] = [
    "Continue monitoring customer behaviour.",
    "Offer personalised banking products.",
    "Encourage use of digital banking services.",
]

# Maps each SHAP feature name to a plain-string recommendation.
# Edit this dict to add, remove, or rephrase feature-level suggestions.
_SHAP_FEATURE_MESSAGES: dict[str, str] = {
    "Balance": "Offer balance-based rewards to increase account activity.",
    "IsActiveMember": "Increase customer engagement through targeted activity campaigns.",
    "NumOfProducts": "Recommend additional banking products to deepen the relationship.",
    "Age": "Tailor product offers and communication to the customer's life stage.",
    "CreditScore": "Highlight credit improvement programmes and related benefits.",
    "Tenure": "Recognise customer loyalty with tenure-based milestone rewards.",
    "EstimatedSalary": "Promote premium wealth-management services aligned to income level.",
    "Geography_Germany": "Provide localised offers relevant to the German market.",
    "Geography_Spain": "Provide localised offers relevant to the Spanish market.",
    "Gender_Male": "Personalise outreach based on demographic preferences.",
    "HasCrCard": "Promote credit card upgrade or cashback programmes.",
}

# Priority constants — used as sort keys; lower value = shown first.
_HIGH = 1
_MEDIUM = 2
_LOW = 3


def _deduplicate(items: list[str]) -> list[str]:
    """Return a new list with duplicate strings removed (first occurrence kept)."""
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def generate_recommendations(
    prediction: int,
    probability: float,
    customer_segment: str,
    shap_values: dict[str, float],
) -> list[str]:
    """Generate up to 5 prioritised, deduplicated retention recommendations.

    Args:
        prediction:       Binary churn label (0 = stay, 1 = churn).
        probability:      Predicted churn probability in [0, 1].
        customer_segment: Business segment name from the K-Means model.
        shap_values:      Top-5 feature → SHAP value mapping from the explainer.

    Returns:
        List of plain recommendation strings sorted High → Medium → Low,
        capped at MAX_RECOMMENDATIONS items.
    """
    # Each entry is (priority, recommendation_text).
    # Collecting tuples first allows sorting before deduplication.
    tagged: list[tuple[int, str]] = []

    # ------------------------------------------------------------------
    # Layer 1 – Churn probability rules
    # ------------------------------------------------------------------

    if probability >= 0.80:
        # Very high churn risk: immediate, high-urgency actions.
        tagged += [
            (_HIGH, "Offer a premium retention package immediately."),
            (_HIGH, "Assign a dedicated relationship manager."),
            (_HIGH, "Contact the customer within 7 days to prevent churn."),
        ]

    elif probability >= 0.50:
        # Moderate churn risk: loyalty and communication actions.
        tagged += [
            (_MEDIUM, "Offer a personalised loyalty reward."),
            (_MEDIUM, "Send a personalised retention email."),
        ]

    else:
        # Low churn risk: growth and cross-sell opportunity.
        tagged += [
            (_LOW, "Encourage cross-selling of complementary products."),
            (_LOW, "Recommend premium banking products to the customer."),
        ]

    # ------------------------------------------------------------------
    # Layer 2 – Customer segment rules
    # ------------------------------------------------------------------
    # Each segment maps to one targeted recommendation at the appropriate
    # priority level. Add new segments here without touching other layers.

    segment_rules: dict[str, tuple[int, str]] = {
        # Loyal high-value customers: reinforce with VIP treatment (medium
        # priority — they are not at immediate risk but worth protecting).
        "High Value Loyal": (
            _MEDIUM,
            "Offer exclusive VIP rewards and premium banking services.",
        ),
        # High-risk segment: needs urgent intervention regardless of the
        # probability band already captured in Layer 1.
        "High Risk": (
            _HIGH,
            "Launch an immediate targeted retention campaign.",
        ),
        # Growth-stage customers: upsell while engagement is rising.
        "Potential Growth": (
            _MEDIUM,
            "Upsell additional products to accelerate the customer's growth.",
        ),
        # Low-engagement customers: re-activate before they drift away.
        "Low Engagement": (
            _MEDIUM,
            "Run targeted engagement campaigns to re-activate the customer.",
        ),
    }

    segment_entry = segment_rules.get(customer_segment)
    if segment_entry:
        tagged.append(segment_entry)

    # ------------------------------------------------------------------
    # Layer 3 – SHAP-driven personalisation
    # ------------------------------------------------------------------
    # shap_values is already sorted by |SHAP| descending (top-5).
    # Pick the first feature that has a mapped message and append it as a
    # low-priority personalisation hint.

    top_feature = next(
        (f for f in shap_values if f in _SHAP_FEATURE_MESSAGES),
        None,
    )
    if top_feature:
        tagged.append((_LOW, _SHAP_FEATURE_MESSAGES[top_feature]))

    # ------------------------------------------------------------------
    # Post-processing: sort → extract text → deduplicate → cap → default
    # ------------------------------------------------------------------

    # Sort by priority so High actions always appear before Medium/Low.
    tagged.sort(key=lambda t: t[0])

    # Extract plain strings after sorting.
    ordered: list[str] = [text for _, text in tagged]

    # Remove any accidental duplicates while preserving the sorted order.
    ordered = _deduplicate(ordered)

    # Cap at the maximum allowed number of recommendations.
    ordered = ordered[:MAX_RECOMMENDATIONS]

    # Fall back to defaults when no rules produced any output.
    if not ordered:
        return DEFAULT_RECOMMENDATIONS.copy()

    return ordered
