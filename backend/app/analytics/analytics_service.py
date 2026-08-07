from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

from app.analytics.data_loader import load_full_dataset, load_scaled_dataset, load_test_scaled
from app.models.model_loader import loader
from app.segmentation.kmeans import CLUSTER_NAMES

_SHAP_SUMMARY_PATH = Path(__file__).resolve().parents[2] / "saved_models" / "shap_summary.json"

FEATURE_NAMES = [
    "CreditScore", "Age", "Tenure", "Balance", "NumOfProducts",
    "HasCrCard", "IsActiveMember", "EstimatedSalary",
    "Geography_Germany", "Geography_Spain", "Gender_Male",
]


def get_summary() -> dict:
    df = load_full_dataset()
    total = len(df)
    churn_count = int(df["Exited"].sum())
    active = int((df["IsActiveMember"] == 1).sum())
    return {
        "totalCustomers": total,
        "churnCount": churn_count,
        "churnRate": round(churn_count / total, 4),
        "activeCustomers": active,
        "inactiveCustomers": total - active,
    }


def get_geography() -> list[dict]:
    df = load_full_dataset()

    def _geo(row: pd.Series) -> str:
        if row["Geography_Germany"]:
            return "Germany"
        if row["Geography_Spain"]:
            return "Spain"
        return "France"

    df = df.copy()
    df["geography"] = df.apply(_geo, axis=1)
    grouped = df.groupby("geography")["Exited"].agg(
        total="count", churned="sum"
    ).reset_index()
    grouped["churnRate"] = (grouped["churned"] / grouped["total"]).round(4)
    return grouped.rename(columns={"geography": "geography"}).to_dict(orient="records")


def get_products() -> list[dict]:
    df = load_full_dataset()
    grouped = df.groupby("NumOfProducts")["Exited"].agg(
        total="count", churned="sum"
    ).reset_index()
    grouped["churnRate"] = (grouped["churned"] / grouped["total"]).round(4)
    grouped["NumOfProducts"] = grouped["NumOfProducts"].astype(int)
    grouped["churned"] = grouped["churned"].astype(int)
    grouped["total"] = grouped["total"].astype(int)
    return grouped.to_dict(orient="records")


def get_activity() -> list[dict]:
    df = load_full_dataset()
    grouped = df.groupby("IsActiveMember")["Exited"].agg(
        total="count", churned="sum"
    ).reset_index()
    grouped["churnRate"] = (grouped["churned"] / grouped["total"]).round(4)
    grouped["status"] = grouped["IsActiveMember"].map({1: "Active", 0: "Inactive"})
    grouped["IsActiveMember"] = grouped["IsActiveMember"].astype(int)
    grouped["churned"] = grouped["churned"].astype(int)
    grouped["total"] = grouped["total"].astype(int)
    return grouped[["status", "IsActiveMember", "total", "churned", "churnRate"]].to_dict(orient="records")


_SEGMENT_META: dict[str, dict] = {
    "High Value Loyal": {
        "description": "Highly loyal customers with low churn risk.",
        "recommendedAction": "Offer premium banking services.",
    },
    "High Risk": {
        "description": "Customers likely to churn with high probability.",
        "recommendedAction": "Immediate retention campaign.",
    },
    "Potential Growth": {
        "description": "Customers suitable for upselling opportunities.",
        "recommendedAction": "Recommend additional banking products.",
    },
    "Low Engagement": {
        "description": "Customers with low activity requiring engagement.",
        "recommendedAction": "Run engagement campaigns.",
    },
}


def get_segments() -> list[dict]:
    scaled = load_scaled_dataset()
    kmeans = loader.get_kmeans()
    labels = kmeans.predict(scaled.values)
    total = len(labels)
    unique, counts = np.unique(labels, return_counts=True)
    result = []
    for k, v in zip(unique, counts):
        name = CLUSTER_NAMES.get(int(k), f"Cluster {k}")
        meta = _SEGMENT_META.get(name, {"description": "", "recommendedAction": ""})
        result.append({
            "segment": name,
            "count": int(v),
            "percentage": round(int(v) / total * 100, 1),
            **meta,
        })
    return result


def get_model_performance() -> dict:
    xtes, y_true = load_test_scaled()
    model = loader.get_model()
    y_pred = model.predict(xtes.values)
    y_prob = model.predict_proba(xtes.values)[:, 1]
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(precision_score(y_true, y_pred)), 4),
        "recall": round(float(recall_score(y_true, y_pred)), 4),
        "f1Score": round(float(f1_score(y_true, y_pred)), 4),
        "rocAuc": round(float(roc_auc_score(y_true, y_prob)), 4),
    }


def get_shap_summary() -> list[dict]:
    """Return pre-computed mean |SHAP| values from saved_models/shap_summary.json."""
    return json.loads(_SHAP_SUMMARY_PATH.read_text())
