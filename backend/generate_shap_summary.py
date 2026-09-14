"""One-time script: compute mean |SHAP| summary and save to saved_models/shap_summary.json.

Run from the backend/ directory:
    python generate_shap_summary.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Make app importable when run from backend/
sys.path.insert(0, str(Path(__file__).parent))

import numpy as np
import pandas as pd

from app.analytics.data_loader import load_scaled_dataset
from app.models.model_loader import loader
from app.explainability.shap_service import _display_name

FEATURE_NAMES = loader.get_feature_names()
_SHAP_SAMPLE_SIZE = 30
_OUT = Path(__file__).parent / "saved_models" / "shap_summary.json"


def compute() -> list[dict]:
    scaled = load_scaled_dataset()
    sample = scaled.sample(n=min(_SHAP_SAMPLE_SIZE, len(scaled)), random_state=42)
    explainer = loader.get_shap_explainer()

    display_names = [_display_name(feature) for feature in FEATURE_NAMES]
    mean_abs: dict[str, float] = {f: 0.0 for f in set(display_names)}

    for _, row in sample.iterrows():
        row_df = pd.DataFrame([row.values], columns=FEATURE_NAMES)
        try:
            raw = explainer.shap_values(row_df, silent=True)
        except TypeError:
            raw = explainer.shap_values(row_df)

        if isinstance(raw, list):
            values = np.asarray(raw[1])
        else:
            values = np.asarray(raw)

        if values.ndim == 3:
            values = values[0, :, 1]
        elif values.ndim == 2 and values.shape[-1] == 2:
            values = values[:, 1]
        elif values.ndim == 2:
            values = values[0]
        else:
            values = values.flatten()

        for i, feat in enumerate(display_names):
            mean_abs[feat] += abs(float(values[i]))

    result = [{"feature": feat, "meanAbsShap": round(value / len(sample), 4)} for feat, value in mean_abs.items()]
    return sorted(result, key=lambda x: x["meanAbsShap"], reverse=True)


if __name__ == "__main__":
    print(f"Computing SHAP summary over {_SHAP_SAMPLE_SIZE} samples...")
    data = compute()
    _OUT.write_text(json.dumps(data, indent=2))
    print(f"Saved to {_OUT}")
    for item in data:
        print(f"  {item['feature']:25s} {item['meanAbsShap']:.4f}")
