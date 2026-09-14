from __future__ import annotations

from typing import Any

import pandas as pd

from app.models.model_loader import loader
from app.segmentation.kmeans import get_customer_segment
from app.explainability.shap_service import get_shap_values
from app.recommendation.recommendation_service import generate_recommendations
from app.preprocessing.feature_contract import MODEL_FEATURES

FEATURE_ORDER = MODEL_FEATURES


class Predictor:
    """Predict churn using the persisted trained model and preprocessing artifacts."""

    def __init__(self) -> None:
        self.is_ready = False
        self._loader = loader

    def _prepare_features(self, features: dict[str, Any]) -> pd.DataFrame:
        if not features:
            raise ValueError("Customer features must not be empty.")

        missing = [feature for feature in FEATURE_ORDER if feature not in features]
        if missing:
            raise ValueError(f"Missing customer features: {', '.join(missing)}")
        return pd.DataFrame([{feature: features[feature] for feature in FEATURE_ORDER}], columns=FEATURE_ORDER)

    def _apply_preprocessing(self, feature_frame: pd.DataFrame) -> pd.DataFrame:
        preprocessor = self._loader.get_preprocessor()
        transformed = preprocessor.transform(feature_frame)
        return pd.DataFrame(transformed, columns=self._loader.get_feature_names())

    def predict(self, features: dict[str, Any]) -> dict[str, Any]:
        if not self.is_ready:
            self._loader.load()
            self.is_ready = True

        if hasattr(features, "model_dump"):
            features = features.model_dump()

        prepared = self._prepare_features(features)
        scaled_features = self._apply_preprocessing(prepared)

        model = self._loader.get_model()
        probability = model.predict_proba(scaled_features)[0, 1]
        prediction = int(model.predict(scaled_features)[0])
        customer_segment = get_customer_segment(prepared)
        shap_values = get_shap_values(scaled_features)
        recommendations = generate_recommendations(
            prediction=prediction,
            probability=float(probability),
            customer_segment=customer_segment,
            shap_values=shap_values,
            features=features,
        )

        return {
            "prediction": prediction,
            "probability": float(probability),
            "customer_segment": customer_segment,
            "shap_values": shap_values,
            "recommendations": recommendations,
        }
