from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class CustomerFeatures(BaseModel):
    """Customer attributes matching the finalized churn dataset and model contract."""

    model_config = ConfigDict(extra="forbid")

    Gender: Literal["Female", "Male", "Other"] = Field(..., description="Customer gender")
    Age: int = Field(..., ge=18, le=65, description="Customer age")
    Subscription_Type: Literal["Basic", "Standard", "Premium"] = Field(..., description="Subscription tier")
    Tenure_Months: int = Field(..., ge=1, le=60, description="Tenure in months")
    Monthly_Spend: float = Field(..., ge=158.35, le=836.49, description="Monthly spend in currency units")
    Login_Frequency: int = Field(..., ge=0, le=49, description="Logins per month")
    Avg_Session_Duration: float = Field(..., ge=5.0, le=65.12, description="Average session duration in minutes")
    Monthly_Content_Hours: float = Field(..., ge=0.2, le=50.84, description="Monthly content hours")
    Days_Since_Last_Login: int = Field(..., ge=0, le=90, description="Days since last login")
    Content_Completion_Rate: float = Field(..., ge=6.25, le=100.0, description="Content completion rate percentage")
    Search_Frequency: int = Field(..., ge=0, le=32, description="Searches per month")
    Subscription_Changes: int = Field(..., ge=0, le=4, description="Number of subscription changes")
    Payment_Failures: int = Field(..., ge=0, le=3, description="Payment failures")
    Support_Tickets: int = Field(..., ge=0, le=6, description="Support tickets count")
    Complaints_Count: int = Field(..., ge=0, le=3, description="Complaints count")
    Discount_Usage: int = Field(..., ge=0, le=6, description="Discount uses count")
    Auto_Renewal: int = Field(..., ge=0, le=1, description="Auto-renewal flag")
    Satisfaction_Score: int = Field(..., ge=1, le=5, description="Customer satisfaction score")


class PredictionRequest(BaseModel):
    """Request payload for churn prediction."""

    model_config = ConfigDict(extra="forbid")

    customer_id: str | None = Field(default=None, description="Customer identifier")
    features: CustomerFeatures = Field(..., description="Customer feature values for churn scoring")
