from fastapi import APIRouter, HTTPException

from app.models.predictor import Predictor
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse

router = APIRouter(prefix="/predict", tags=["prediction"])
predictor = Predictor()


@router.post("", response_model=PredictionResponse)
async def predict_churn(request: PredictionRequest) -> PredictionResponse:
    """Use the saved trained model to predict churn for customer features."""
    if not request.features:
        raise HTTPException(status_code=400, detail="At least one feature must be provided.")

    try:
        result = predictor.predict(request.features)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return PredictionResponse(
        prediction=result["prediction"],
        probability=result["probability"],
        customer_segment=result["customer_segment"],
        shap_values=result["shap_values"],
        recommendations=result["recommendations"],
    )
