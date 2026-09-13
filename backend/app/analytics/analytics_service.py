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


def get_churn_by_age() -> list[dict]:
    """Group customer age into brackets and calculate churn metrics."""
    df = load_full_dataset()
    bins = [0, 30, 40, 50, 60, 100]
    labels = ["Under 30", "30-39", "40-49", "50-59", "60+"]
    df = df.copy()
    df["age_group"] = pd.cut(df["Age"], bins=bins, labels=labels, right=False)
    grouped = df.groupby("age_group", observed=False)["Exited"].agg(
        total="count", churned="sum"
    ).reset_index()
    grouped["churnRate"] = (grouped["churned"] / grouped["total"]).round(4)
    grouped["churned"] = grouped["churned"].astype(int)
    grouped["total"] = grouped["total"].astype(int)
    return grouped.rename(columns={"age_group": "age_group"}).to_dict(orient="records")


def get_insights() -> list[dict]:
    """Dynamically generate insights from geography, active/inactive, product usage, segment sizes and SHAP features."""
    # 1. Geography
    geo = get_geography()
    highest_geo = max(geo, key=lambda x: x["churnRate"])
    geo_details = ", ".join([f"{g['geography']} ({round(g['churnRate']*100, 1)}%)" for g in geo])
    insight_geo = f"Highest regional churn rate is in {highest_geo['geography']} at {round(highest_geo['churnRate']*100, 1)}%. (All regions: {geo_details})."

    # 2. Activity
    act = get_activity()
    inactive = next(x for x in act if x["status"] == "Inactive")
    active = next(x for x in act if x["status"] == "Active")
    diff = round((inactive["churnRate"] - active["churnRate"]) * 100, 1)
    insight_activity = f"Inactive members churn {diff}% more than active members (Inactive Churn: {round(inactive['churnRate']*100, 1)}% vs. Active: {round(active['churnRate']*100, 1)}%)."

    # 3. Products
    prods = get_products()
    highest_prod = max(prods, key=lambda x: x["churnRate"])
    insight_prod = f"Customers holding {highest_prod['NumOfProducts']} product(s) represent the highest risk group with a {round(highest_prod['churnRate']*100, 1)}% churn rate."

    # 4. KMeans Clusters
    segs = get_segments()
    high_risk_seg = next((x for x in segs if x["segment"] == "High Risk"), None)
    if high_risk_seg:
        insight_seg = f"The 'High Risk' behavioral cohort comprises {high_risk_seg['percentage']}% of the customer base ({high_risk_seg['count']:,} customers)."
    else:
        insight_seg = "Behavioral cohort distribution analyzed. Run targeted retention campaigns."

    # 5. SHAP Features
    sh = get_shap_summary()
    top_shap = max(sh, key=lambda x: x["meanAbsShap"])
    insight_shap = f"Explainable AI (SHAP) identifies '{top_shap['feature']}' as the most critical driver of customer churn risk across the entire database."

    return [
        {"tag": "Critical", "text": insight_geo, "color": "#C56B62"},
        {"tag": "Activity", "text": insight_activity, "color": "#6dbb8a"},
        {"tag": "Products", "text": insight_prod, "color": "#DEA785"},
        {"tag": "KMeans", "text": insight_seg, "color": "#6C739C"},
        {"tag": "SHAP Feature", "text": insight_shap, "color": "#8b5cf6"},
    ]
