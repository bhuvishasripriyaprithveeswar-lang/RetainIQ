from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    """Customer attributes matching the finalized churn dataset."""

    Gender: str = Field(..., description="Customer gender")
    Age: int = Field(..., description="Customer age")
    Subscription_Type: str = Field(..., description="Subscription tier")
    Tenure_Months: int
    Monthly_Spend: float
    Login_Frequency: int
    Avg_Session_Duration: float
    Monthly_Content_Hours: float
    Days_Since_Last_Login: int
    Content_Completion_Rate: float
    Search_Frequency: int
    Subscription_Changes: int
    Payment_Failures: int
    Support_Tickets: int
    Complaints_Count: int
    Discount_Usage: int
    Auto_Renewal: int
    Satisfaction_Score: int


class PredictionRequest(BaseModel):
    """Request payload for churn prediction."""

    customer_id: str | None = Field(default=None, description="Customer identifier")
    features: CustomerFeatures = Field(..., description="Customer feature values for churn scoring")
