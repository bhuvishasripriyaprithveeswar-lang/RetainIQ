from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.models import User, PredictionRecord

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.get("/history")
def get_prediction_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    """Retrieve the prediction history specifically for the authenticated user."""
    records = (
        db.query(PredictionRecord)
        .filter(PredictionRecord.user_id == current_user.id)
        .order_by(PredictionRecord.timestamp.desc())
        .all()
    )

    return [
        {
            "id": f"P-{r.id}",
            "customer_id": r.customer_id,
            "prediction": r.prediction,
            "probability": r.probability,
            "segment": r.segment,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in records
    ]
