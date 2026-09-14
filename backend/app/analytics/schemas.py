from __future__ import annotations

from pydantic import BaseModel


class SummaryResponse(BaseModel):
    totalCustomers: int
    churnCount: int
    churnRate: float
    retainedCount: int
    activeCustomers: int
    inactiveCustomers: int


class GeographyItem(BaseModel):
    geography: str
    total: int
    churned: int
    churnRate: float


class ProductsItem(BaseModel):
    subscriptionType: str
    total: int
    churned: int
    churnRate: float


class ActivityItem(BaseModel):
    status: str
    total: int
    churned: int
    churnRate: float


class SatisfactionItem(BaseModel):
    satisfactionScore: int
    total: int
    churned: int
    churnRate: float


class InactivityItem(BaseModel):
    inactivityRange: str
    total: int
    churned: int
    churnRate: float


class PaymentFailuresItem(BaseModel):
    paymentFailures: int
    total: int
    churned: int
    churnRate: float


class SegmentItem(BaseModel):
    segment_id: int
    segment: str
    count: int
    percentage: float
    average_age: float
    average_tenure: float
    average_monthly_spend: float
    average_login_frequency: float
    average_monthly_content_hours: float
    average_days_since_last_login: float
    average_content_completion_rate: float
    average_support_tickets: float
    average_complaints: float
    average_satisfaction: float
    churn_rate: float
    dominant_subscription_type: str
    description: str


class ModelPerformanceResponse(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1Score: float
    rocAuc: float
    confusionMatrix: list[list[int]]


class ShapFeatureItem(BaseModel):
    feature: str
    meanAbsShap: float
