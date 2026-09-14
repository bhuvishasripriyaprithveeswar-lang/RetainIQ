from __future__ import annotations

from pathlib import Path

TARGET = "Churn"
ID_COLUMN = "Customer_ID"
CATEGORICAL_FEATURES = ["Gender", "Subscription_Type"]
NUMERIC_FEATURES = [
    "Age", "Tenure_Months", "Monthly_Spend", "Login_Frequency",
    "Avg_Session_Duration", "Monthly_Content_Hours", "Days_Since_Last_Login",
    "Content_Completion_Rate", "Search_Frequency", "Subscription_Changes",
    "Payment_Failures", "Support_Tickets", "Complaints_Count", "Discount_Usage",
    "Auto_Renewal", "Satisfaction_Score",
]
MODEL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
RAW_DATA_PATH = Path(__file__).resolve().parents[3] / "datasets" / "raw" / "retainiq_synthetic_churn.csv"
ARTIFACT_DIR = Path(__file__).resolve().parents[2] / "saved_models"


def validate_dataset_columns(columns: list[str]) -> None:
    expected = {ID_COLUMN, TARGET, *MODEL_FEATURES}
    actual = set(columns)
    if actual != expected:
        missing = sorted(expected - actual)
        unexpected = sorted(actual - expected)
        raise ValueError(f"Dataset schema mismatch. Missing: {missing}; unexpected: {unexpected}")