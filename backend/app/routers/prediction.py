from fastapi import APIRouter, HTTPException

from app.models.predictor import Predictor
from app.models.shap_explainer import SHAPExplainer
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse
from app.segmentation.kmeans import Segmenter
from app.utils.recommendations import RecommendationEngine

router = APIRouter(prefix="/predict", tags=["prediction"])
predictor = Predictor()
shap_explainer = SHAPExplainer()
segmenter = Segmenter()
recommendation_engine = RecommendationEngine()


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@router.post("", response_model=PredictionResponse)
async def predict_customer(request: PredictionRequest) -> PredictionResponse:
    """Run prediction, explanation, segmentation, and recommendations for a customer."""
    if request.features is None:
        raise HTTPException(status_code=400, detail="At least one feature must be provided.")

    try:
        feature_payload = request.features.model_dump()
        prediction_result = predictor.predict(feature_payload)
        shap_result = shap_explainer.explain_local(feature_payload)
        segment_result = segmenter.segment_customer(feature_payload)
        recommendations = recommendation_engine.recommend(
            churn_probability=prediction_result["probability"],
            shap_features=shap_result.get("top_positive_features", []) + shap_result.get("top_negative_features", []),
            customer_segment=segment_result.get("segment"),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ImportError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return PredictionResponse(
        prediction=prediction_result["prediction"],
        probability=prediction_result["probability"],
        customer_segment=segment_result.get("segment"),
        shap_values=shap_result.get("feature_contributions", []),
        recommendations=recommendations,
    )
