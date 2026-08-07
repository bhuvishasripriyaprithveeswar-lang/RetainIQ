from __future__ import annotations

import pandas as pd

from app.models.model_loader import loader

CLUSTER_NAMES: dict[int, str] = {
    0: "High Value Loyal",
    1: "High Risk",
    2: "Potential Growth",
    3: "Low Engagement",
}


def get_customer_segment(scaled_features: pd.DataFrame) -> str:
    """Predict the cluster for a single scaled feature row and return its business name."""
    kmeans = loader.get_kmeans()
    cluster_id = int(kmeans.predict(scaled_features)[0])
    return CLUSTER_NAMES.get(cluster_id, f"Cluster {cluster_id}")
