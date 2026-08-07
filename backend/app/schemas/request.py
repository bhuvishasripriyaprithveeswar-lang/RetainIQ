from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    """Customer features matching the churn modeling dataset."""

    CreditScore: int = Field(..., description="Credit score of the customer")
    Geography: str = Field(..., description="Customer geography")
    Gender: str = Field(..., description="Customer gender")
    Age: int = Field(..., description="Customer age")
    Tenure: int = Field(..., description="Customer tenure in years")
    Balance: float = Field(..., description="Customer account balance")
    NumOfProducts: int = Field(..., description="Number of products held by the customer")
    HasCrCard: int = Field(..., description="Whether the customer has a credit card (0 or 1)")
    IsActiveMember: int = Field(..., description="Whether the customer is an active member (0 or 1)")
    EstimatedSalary: float = Field(..., description="Estimated annual salary")


class PredictionRequest(BaseModel):
    """Request payload for churn prediction."""

    customer_id: str | None = Field(default=None, description="Customer identifier")
    features: CustomerFeatures = Field(..., description="Customer feature values for churn scoring")
