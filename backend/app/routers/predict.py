import random
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.auth.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.models import User, PredictionRecord
from app.models.predictor import Predictor
from app.schemas.request import PredictionRequest
from app.schemas.response import PredictionResponse

router = APIRouter(prefix="/predict", tags=["prediction"])
predictor = Predictor()


@router.post("", response_model=PredictionResponse)
async def predict_churn(
    request: PredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictionResponse:
    """Use the saved trained model to predict churn for customer features."""
    if not request.features:
        raise HTTPException(status_code=400, detail="At least one feature must be provided.")

    try:
        result = predictor.predict(request.features)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    cust_id = request.customer_id
    if not cust_id or not cust_id.strip():
        cust_id = f"C-{random.randint(10000, 99999)}"

    # Persist the prediction history in the database under the logged-in user's record
    record = PredictionRecord(
        user_id=current_user.id,
        customer_id=cust_id,
        prediction=result["prediction"],
        probability=result["probability"],
        segment=result["customer_segment"],
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return PredictionResponse(
        customer_id=cust_id,
        prediction=result["prediction"],
        probability=result["probability"],
        customer_segment=result["customer_segment"],
        shap_values=result["shap_values"],
        recommendations=result["recommendations"],
    )

