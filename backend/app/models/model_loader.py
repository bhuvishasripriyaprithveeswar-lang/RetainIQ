import joblib
from pathlib import Path
from typing import Any


class ModelLoader:
    """Load persisted model artifacts once for reuse by the FastAPI backend."""

    def __init__(self, base_dir: str | None = None) -> None:
        if base_dir is None:
            base_dir = Path(__file__).resolve().parents[2]
        self.base_dir = Path(base_dir).resolve()
        self._model = None
        self._scaler = None
        self._preprocessor = None
        self._feature_names = None
        self._label_encoders = None
        self._kmeans = None
        self._kmeans_scaler = None
        self._shap_explainer = None
        self.is_ready = False

    def _artifact_path(self, filename: str) -> Path:
        path = self.base_dir / "saved_models" / filename
        if not path.exists():
            alt_path = self.base_dir / filename
            if alt_path.exists():
                return alt_path
            raise FileNotFoundError(f"Required model artifact not found: {path}")
        return path

    def load(self) -> None:
        """Load all available model artifacts exactly once."""
        if self.is_ready:
            return

        model_path = self._artifact_path("stacking_model.pkl")
        preprocessor_path = self._artifact_path("preprocessor.pkl")

        self._model = joblib.load(model_path)
        self._preprocessor = joblib.load(preprocessor_path)
        self._scaler = self._preprocessor
        metadata_path = self.base_dir / "saved_models" / "feature_metadata.json"
        if metadata_path.exists():
            import json
            self._feature_names = json.loads(metadata_path.read_text())["transformed_features"]

        label_encoder_path = self.base_dir / "saved_models" / "label_encoders.pkl"
        if label_encoder_path.exists():
            self._label_encoders = joblib.load(label_encoder_path)
        else:
            self._label_encoders = None

        kmeans_path = self.base_dir / "saved_models" / "kmeans_model.pkl"
        if not kmeans_path.exists():
            raise FileNotFoundError(f"Required model artifact not found: {kmeans_path}")
        self._kmeans = joblib.load(kmeans_path)
        kmeans_scaler_path = self._artifact_path("kmeans_scaler.pkl")
        self._kmeans_scaler = joblib.load(kmeans_scaler_path)

        shap_path = self.base_dir / "saved_models" / "shap_explainer.pkl"
        if not shap_path.exists():
            raise FileNotFoundError(f"Required model artifact not found: {shap_path}")
        self._shap_explainer = joblib.load(shap_path)

        self.is_ready = True

    def get_model(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._model

    def get_scaler(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._scaler

    def get_preprocessor(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._preprocessor

    def get_feature_names(self) -> list[str]:
        if not self.is_ready:
            self.load()
        return self._feature_names or list(self._preprocessor.get_feature_names_out())

    def get_label_encoders(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._label_encoders

    def get_kmeans(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._kmeans

    def get_kmeans_scaler(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._kmeans_scaler

    def get_shap_explainer(self) -> Any:
        if not self.is_ready:
            self.load()
        return self._shap_explainer


loader = ModelLoader()
