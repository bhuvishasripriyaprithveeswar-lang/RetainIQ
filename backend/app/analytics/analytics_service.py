from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score

from app.analytics.data_loader import load_full_dataset, load_test_scaled
from app.models.model_loader import loader
from app.segmentation.kmeans import KMEANS_FEATURES, CLUSTER_NAMES

_ARTIFACT_DIR = Path(__file__).resolve().parents[2] / "saved_models"


def _grouped(df: pd.DataFrame, column: str, label_name: str | None = None) -> list[dict]:
    grouped = df.groupby(column, dropna=False)["Churn"].agg(total="count", churned="sum").reset_index()
    grouped["churnRate"] = (grouped["churned"] / grouped["total"]).round(4)
    grouped["churned"] = grouped["churned"].astype(int)
    grouped["total"] = grouped["total"].astype(int)
    if label_name and label_name != column:
        grouped = grouped.rename(columns={column: label_name})
    return grouped.to_dict(orient="records")


def get_summary() -> dict:
    df = load_full_dataset()
    churned = int(df["Churn"].sum())
    active = int((df["Days_Since_Last_Login"] <= 30).sum())
    return {"totalCustomers": len(df), "churnCount": churned, "retainedCount": len(df) - churned,
            "churnRate": round(churned / len(df), 4), "activeCustomers": active, "inactiveCustomers": len(df) - active}


def get_geography() -> list[dict]:
    return []


def get_products() -> list[dict]:
    return _grouped(load_full_dataset(), "Subscription_Type", "subscriptionType")


def get_activity() -> list[dict]:
    df = load_full_dataset().copy()
    df["status"] = np.where(df["Days_Since_Last_Login"] <= 30, "Active", "Inactive")
    return _grouped(df, "status")


def get_churn_by_satisfaction() -> list[dict]:
    return _grouped(load_full_dataset(), "Satisfaction_Score", "satisfactionScore")


def get_churn_by_inactivity() -> list[dict]:
    df = load_full_dataset().copy()
    df["inactivityRange"] = pd.cut(
        df["Days_Since_Last_Login"],
        bins=[-1, 7, 30, 60, float("inf")],
        labels=["0-7 days", "8-30 days", "31-60 days", "61+ days"],
    )
    return _grouped(df, "inactivityRange")


def get_churn_by_payment_failures() -> list[dict]:
    return _grouped(load_full_dataset(), "Payment_Failures", "paymentFailures")


def get_segments() -> list[dict]:
    df = load_full_dataset().copy()
    labels = loader.get_kmeans().predict(loader.get_kmeans_scaler().transform(df[KMEANS_FEATURES]))
    df["segment_id"] = labels
    result = []
    for cluster_id, group in df.groupby("segment_id", sort=True):
        name = CLUSTER_NAMES.get(int(cluster_id), f"Cluster {cluster_id}")
        average_login = group["Login_Frequency"].mean()
        average_content = group["Monthly_Content_Hours"].mean()
        average_inactivity = group["Days_Since_Last_Login"].mean()
        dominant_subscription = group["Subscription_Type"].mode().iloc[0]
        descriptions = {
            0: "Customers with the highest engagement and satisfaction among the segments, showing relatively low churn.",
            1: "Customers showing lower engagement, increased inactivity and moderate satisfaction, indicating elevated churn risk.",
            2: "A large group of Basic-plan customers with relatively low engagement but lower inactivity and moderate churn risk.",
            3: "Customers with very high inactivity and the lowest satisfaction, associated with the highest churn risk among the segments.",
        }
        result.append({
            "segment_id": int(cluster_id),
            "segment": name,
            "count": int(len(group)),
            "percentage": round(len(group) / len(df) * 100, 1),
            "average_age": round(group["Age"].mean(), 2),
            "average_tenure": round(group["Tenure_Months"].mean(), 2),
            "average_monthly_spend": round(group["Monthly_Spend"].mean(), 2),
            "average_login_frequency": round(average_login, 2),
            "average_monthly_content_hours": round(average_content, 2),
            "average_days_since_last_login": round(average_inactivity, 2),
            "average_content_completion_rate": round(group["Content_Completion_Rate"].mean(), 2),
            "average_support_tickets": round(group["Support_Tickets"].mean(), 2),
            "average_complaints": round(group["Complaints_Count"].mean(), 2),
            "average_satisfaction": round(group["Satisfaction_Score"].mean(), 2),
            "churn_rate": round(group["Churn"].mean(), 4),
            "dominant_subscription_type": str(dominant_subscription),
            "description": descriptions.get(int(cluster_id), "Behavioural profile based on the measured customer attributes."),
        })
    return result


def get_model_performance() -> dict:
    xtest, y_true = load_test_scaled()
    model = loader.get_model()
    y_pred = model.predict(xtest)
    y_prob = model.predict_proba(xtest)[:, 1]
    return {"accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
            "precision": round(float(precision_score(y_true, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_true, y_pred, zero_division=0)), 4),
            "f1Score": round(float(f1_score(y_true, y_pred, zero_division=0)), 4),
            "rocAuc": round(float(roc_auc_score(y_true, y_prob)), 4),
            "confusionMatrix": confusion_matrix(y_true, y_pred).tolist()}


def get_shap_summary() -> list[dict]:
    return json.loads((_ARTIFACT_DIR / "shap_summary.json").read_text())


def get_churn_by_age() -> list[dict]:
    df = load_full_dataset().copy()
    df["age_group"] = pd.cut(df["Age"], bins=[0, 30, 40, 50, 60, 100], labels=["Under 30", "30-39", "40-49", "50-59", "60+"], right=False)
    return _grouped(df, "age_group")


def get_insights() -> list[dict]:
    df = load_full_dataset()
    subscription = max(get_products(), key=lambda item: item["churnRate"])
    inactivity = max(get_activity(), key=lambda item: item["churnRate"])
    top_shap = get_shap_summary()[0]
    return [{"tag": "Subscription", "text": f"{subscription['subscriptionType']} subscribers have the highest churn rate at {subscription['churnRate'] * 100:.1f}%.", "color": "#C56B62"},
            {"tag": "Engagement", "text": f"{inactivity['status']} customers have a {inactivity['churnRate'] * 100:.1f}% churn rate.", "color": "#6dbb8a"},
            {"tag": "Payments", "text": f"Customers with payment failures show churn patterns across {int(df['Payment_Failures'].max())} failure levels.", "color": "#DEA785"},
            {"tag": "Segments", "text": "Behavioral segments are based on tenure, spend, engagement, inactivity, support, complaints, and satisfaction.", "color": "#6C739C"},
            {"tag": "SHAP Feature", "text": f"SHAP identifies '{top_shap['feature']}' as the strongest measured driver of churn risk.", "color": "#8b5cf6"}]
