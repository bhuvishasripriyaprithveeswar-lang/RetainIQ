from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from app.models.model_loader import loader

try:
    import shap
except ImportError:  # pragma: no cover - import guard for environments without SHAP
    shap = None


class SHAPExplainer:
    """Generate local SHAP-based explanations for churn predictions."""

    def __init__(self, model: Any | None = None, scaler: Any | None = None) -> None:
        self.is_ready = False
        self._loader = loader
        self.model = model
        self.scaler = scaler
        self.explainer: Any | None = None
        self.background_data: pd.DataFrame | None = None
        self.feature_names: list[str] = []

    def _resolve_training_data_path(self) -> Path | None:
        candidates = [
            Path(__file__).resolve().parents[2] / "datasets" / "processed" / "x_train.csv",
            Path(__file__).resolve().parents[2] / "datasets" / "processed" / "X_train.csv",
            Path(__file__).resolve().parents[2] / "datasets" / "processed" / "X_train_scaled.csv",
        ]
        for path in candidates:
            if path.exists():
                return path
        return None

    def _load_background_data(self) -> pd.DataFrame:
        path = self._resolve_training_data_path()
        if path is None:
            raise FileNotFoundError("Processed training dataset not found for SHAP explanation generation.")

        data = pd.read_csv(path)
        if data.empty:
            raise ValueError("The processed training dataset is empty.")

        return data

    def _ensure_ready(self) -> None:
        if self.is_ready:
            return

        if self.model is None:
            self.model = self._loader.get_model()
        if self.scaler is None:
            try:
                self.scaler = self._loader.get_scaler()
            except FileNotFoundError:
                self.scaler = None

        self.background_data = self._load_background_data()
        self.feature_names = list(self.background_data.columns)

        if shap is None:
            raise ImportError("SHAP is not installed in the current environment.")

        self.explainer = shap.Explainer(self.model, self.background_data)
        self.is_ready = True

    def _prepare_features(self, features: dict[str, Any] | pd.DataFrame) -> pd.DataFrame:
        if isinstance(features, dict):
            prepared = pd.DataFrame([features])
        elif isinstance(features, pd.DataFrame):
            prepared = features.copy()
        else:
            raise TypeError("Features must be provided as a dictionary or a pandas DataFrame.")

        if self.background_data is not None and not prepared.empty:
            prepared = prepared.reindex(columns=self.feature_names, fill_value=0)

        return prepared

    def _transform_features(self, features: pd.DataFrame) -> pd.DataFrame:
        if self.scaler is None:
            return features
        transformed = self.scaler.transform(features)
        return pd.DataFrame(transformed, columns=features.columns, index=features.index)

    def _get_shap_values(self, prepared_features: pd.DataFrame) -> np.ndarray:
        explanation = self.explainer(prepared_features)
        values = explanation.values

        if isinstance(values, list):
            values = np.asarray(values)

        if values.ndim == 3:
            values = values[:, :, 1]
        elif values.ndim == 2:
            values = values
        else:
            values = np.asarray(values).reshape(1, -1)

        if values.ndim == 1:
            values = values.reshape(1, -1)

        return np.asarray(values)[0]

    def explain_local(self, features: dict[str, Any] | pd.DataFrame, top_k: int = 5) -> dict[str, Any]:
        """Generate a local SHAP explanation and return JSON-serializable details."""
        self._ensure_ready()

        prepared_features = self._prepare_features(features)
        transformed_features = self._transform_features(prepared_features)
        shap_values = self._get_shap_values(transformed_features)

        contributions = pd.Series(shap_values, index=prepared_features.columns)
        contribution_pairs = contributions.to_dict()

        positive_features = [
            {
                "feature": feature,
                "contribution": float(value),
            }
            for feature, value in contributions[contributions > 0].sort_values(ascending=False).head(top_k).items()
        ]
        negative_features = [
            {
                "feature": feature,
                "contribution": float(value),
            }
            for feature, value in contributions[contributions < 0].sort_values(ascending=True).head(top_k).items()
        ]

        prediction = int(self.model.predict(transformed_features)[0])
        probability = float(self.model.predict_proba(transformed_features)[0, 1])

        return {
            "prediction": prediction,
            "probability": probability,
            "top_positive_features": positive_features,
            "top_negative_features": negative_features,
            "feature_contributions": [
                {"feature": feature, "contribution": float(value)} for feature, value in contribution_pairs.items()
            ],
        }
