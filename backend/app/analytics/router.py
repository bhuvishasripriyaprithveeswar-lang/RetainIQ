from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.analytics import analytics_service as svc
from app.analytics.schemas import (
    ActivityItem,
    GeographyItem,
    ModelPerformanceResponse,
    ProductsItem,
    SegmentItem,
    ShapFeatureItem,
    SummaryResponse,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=SummaryResponse)
def summary() -> SummaryResponse:
    """Overall churn summary derived from the full processed dataset."""
    return SummaryResponse(**svc.get_summary())


@router.get("/geography", response_model=list[GeographyItem])
def geography() -> list[GeographyItem]:
    """Churn counts and rate grouped by customer geography."""
    return [GeographyItem(**item) for item in svc.get_geography()]


@router.get("/products", response_model=list[ProductsItem])
def products() -> list[ProductsItem]:
    """Churn counts and rate grouped by number of products held."""
    return [ProductsItem(**item) for item in svc.get_products()]


@router.get("/activity", response_model=list[ActivityItem])
def activity() -> list[ActivityItem]:
    """Active vs Inactive customer distribution with churn breakdown."""
    return [ActivityItem(**item) for item in svc.get_activity()]


@router.get("/segments", response_model=list[SegmentItem])
def segments() -> list[SegmentItem]:
    """Customer counts per KMeans segment across the full dataset."""
    try:
        return [SegmentItem(**item) for item in svc.get_segments()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/model-performance", response_model=ModelPerformanceResponse)
def model_performance() -> ModelPerformanceResponse:
    """Accuracy, Precision, Recall, F1, and ROC-AUC on the held-out test set."""
    try:
        return ModelPerformanceResponse(**svc.get_model_performance())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/shap-summary", response_model=list[ShapFeatureItem])
def shap_summary() -> list[ShapFeatureItem]:
    """Mean absolute SHAP value per feature, read from pre-computed shap_summary.json."""
    try:
        return [ShapFeatureItem(**item) for item in svc.get_shap_summary()]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/churn-by-age")
def churn_by_age() -> list:
    """Churn rates grouped by customer age brackets."""
    try:
        return svc.get_churn_by_age()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/insights")
def insights() -> list:
    """Actionable AI insights generated from dataset metrics and models."""
    try:
        return svc.get_insights()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

