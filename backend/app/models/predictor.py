from __future__ import annotations

from typing import Any

import pandas as pd

from app.models.model_loader import loader
from app.segmentation.kmeans import get_customer_segment
from app.explainability.shap_service import get_shap_values
from app.recommendation.recommendation_service import generate_recommendations

FEATURE_ORDER = [
    "CreditScore", "Age", "Tenure", "Balance", "NumOfProducts",
    "HasCrCard", "IsActiveMember", "EstimatedSalary",
    "Geography_Germany", "Geography_Spain", "Gender_Male",
]


class Predictor:
    """Predict churn using the persisted trained model and preprocessing artifacts."""

    def __init__(self) -> None:
        self.is_ready = False
        self._loader = loader

    def _prepare_features(self, features: dict[str, Any]) -> pd.DataFrame:
        if not features:
            raise ValueError("Customer features must not be empty.")

        geography = features.get("Geography", "France")
        gender = features.get("Gender", "Female")

        row = {
            "CreditScore": features["CreditScore"],
            "Age": features["Age"],
            "Tenure": features["Tenure"],
            "Balance": features["Balance"],
            "NumOfProducts": features["NumOfProducts"],
            "HasCrCard": features["HasCrCard"],
            "IsActiveMember": features["IsActiveMember"],
            "EstimatedSalary": features["EstimatedSalary"],
            "Geography_Germany": int(geography == "Germany"),
            "Geography_Spain": int(geography == "Spain"),
            "Gender_Male": int(gender == "Male"),
        }

        return pd.DataFrame([row], columns=FEATURE_ORDER)

    def _apply_preprocessing(self, feature_frame: pd.DataFrame) -> pd.DataFrame:
        scaler = self._loader.get_scaler()
        transformed = scaler.transform(feature_frame)
        return pd.DataFrame(transformed, columns=FEATURE_ORDER)

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
        customer_segment = get_customer_segment(scaled_features)
        shap_values = get_shap_values(scaled_features)
        recommendations = generate_recommendations(
            prediction=prediction,
            probability=float(probability),
            customer_segment=customer_segment,
            shap_values=shap_values,
        )

        return {
            "prediction": prediction,
            "probability": float(probability),
            "customer_segment": customer_segment,
            "shap_values": shap_values,
            "recommendations": recommendations,
        }
