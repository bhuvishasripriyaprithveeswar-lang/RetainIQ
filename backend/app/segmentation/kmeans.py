from __future__ import annotations

import pandas as pd

from app.models.model_loader import loader

KMEANS_FEATURES = [
    "Tenure_Months", "Monthly_Spend", "Login_Frequency", "Monthly_Content_Hours",
    "Days_Since_Last_Login", "Content_Completion_Rate", "Support_Tickets",
    "Complaints_Count", "Satisfaction_Score",
]

CLUSTER_NAMES: dict[int, str] = {
    0: "Highly Engaged Customers",
    1: "At-Risk Customers",
    2: "Moderately Engaged Customers",
    3: "Critical Churn-Risk Customers",
}


def get_customer_segment(features: pd.DataFrame) -> str:
    """Predict the cluster for a single scaled feature row and return its business name."""
    kmeans = loader.get_kmeans()
    import joblib
    scaler = joblib.load(loader._artifact_path("kmeans_scaler.pkl"))
    cluster_id = int(kmeans.predict(scaler.transform(features[KMEANS_FEATURES]))[0])
    return CLUSTER_NAMES.get(cluster_id, f"Cluster {cluster_id}")
