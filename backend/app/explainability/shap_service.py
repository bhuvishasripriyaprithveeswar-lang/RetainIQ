from __future__ import annotations

import numpy as np
import pandas as pd

from app.models.model_loader import loader

TOP_K = 5


def get_shap_values(scaled_features: pd.DataFrame) -> dict[str, float]:
    """Return the top-K features by absolute SHAP value for a single scaled input row.

    Handles all known SHAP return shapes for binary classification:
      - list of arrays  → raw[1] is class-1 array of shape (1, n_features)
      - ndarray (1, n_features)       → already class-agnostic single row
      - ndarray (1, n_features, 2)    → slice [..., 1] for class 1
      - ndarray (n_features, 2)       → slice [:, 1] for class 1

    Args:
        scaled_features: Single-row DataFrame already scaled by the prediction pipeline.

    Returns:
        Dict mapping feature name → SHAP value, top-K by absolute importance.
    """
    explainer = loader.get_shap_explainer()
    raw = explainer.shap_values(scaled_features, silent=True)

    # ── normalise to numpy ──────────────────────────────────────────────────
    if isinstance(raw, list):
        # Old SHAP API: list[ndarray], one array per class
        # raw[1] → shape (n_samples, n_features) for class 1
        values = np.asarray(raw[1])
    else:
        values = np.asarray(raw)

    # ── debug prints (shape inspection) ────────────────────────────────────
    print("DEBUG shap raw type :", type(raw))
    print("DEBUG values shape  :", values.shape)

    # ── extract class-1 slice and flatten to (n_features,) ─────────────────
    if values.ndim == 3:
        # (n_samples, n_features, n_classes) → take sample 0, class 1
        values = values[0, :, 1]
    elif values.ndim == 2 and values.shape[-1] == 2:
        # (n_features, 2) — no sample dimension
        values = values[:, 1]
    elif values.ndim == 2:
        # (n_samples, n_features) — already class-1 or class-agnostic
        values = values[0]
    else:
        # 1-D already
        values = values.flatten()

    # ── build Series and return top-K ───────────────────────────────────────
    contributions = pd.Series(values, index=scaled_features.columns)
    top = contributions.reindex(contributions.abs().nlargest(TOP_K).index)
    return {feature: round(float(value), 4) for feature, value in top.items()}
