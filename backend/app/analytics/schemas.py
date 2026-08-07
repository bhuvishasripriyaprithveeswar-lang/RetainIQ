from __future__ import annotations

from pydantic import BaseModel


class SummaryResponse(BaseModel):
    totalCustomers: int
    churnCount: int
    churnRate: float
    activeCustomers: int
    inactiveCustomers: int


class GeographyItem(BaseModel):
    geography: str
    total: int
    churned: int
    churnRate: float


class ProductsItem(BaseModel):
    NumOfProducts: int
    total: int
    churned: int
    churnRate: float


class ActivityItem(BaseModel):
    status: str
    IsActiveMember: int
    total: int
    churned: int
    churnRate: float


class SegmentItem(BaseModel):
    segment: str
    count: int
    percentage: float
    description: str
    recommendedAction: str


class ModelPerformanceResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1Score: float
    rocAuc: float


class ShapFeatureItem(BaseModel):
    feature: str
    meanAbsShap: float
