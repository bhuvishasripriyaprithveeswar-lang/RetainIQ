from __future__ import annotations

import json

import joblib
import lightgbm as lgb
import pandas as pd
import shap
import xgboost as xgb
from sklearn.cluster import KMeans
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import StackingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from app.preprocessing.feature_contract import (
    ARTIFACT_DIR, CATEGORICAL_FEATURES, MODEL_FEATURES, NUMERIC_FEATURES,
    RAW_DATA_PATH, TARGET, validate_dataset_columns,
)


def _make_preprocessor() -> ColumnTransformer:
    numeric = Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())])
    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    return ColumnTransformer([
        ("numeric", numeric, NUMERIC_FEATURES),
        ("categorical", categorical, CATEGORICAL_FEATURES),
    ])


def train() -> dict:
    df = pd.read_csv(RAW_DATA_PATH)
    validate_dataset_columns(df.columns.tolist())
    X = df[MODEL_FEATURES]
    y = df[TARGET].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    preprocessor = _make_preprocessor()
    X_train_transformed = preprocessor.fit_transform(X_train)
    X_test_transformed = preprocessor.transform(X_test)
    transformed_names = list(preprocessor.get_feature_names_out())

    xgb_model = xgb.XGBClassifier(n_estimators=250, max_depth=5, learning_rate=0.08, subsample=0.9,
                                  colsample_bytree=0.9, eval_metric="logloss", random_state=42, n_jobs=4)
    lgb_model = lgb.LGBMClassifier(n_estimators=250, max_depth=5, learning_rate=0.08, subsample=0.9,
                                   colsample_bytree=0.9, class_weight="balanced", random_state=42,
                                   verbosity=-1, n_jobs=4)
    stack_model = StackingClassifier(
        estimators=[("xgb", xgb_model), ("lgbm", lgb_model)],
        final_estimator=LogisticRegression(max_iter=1000, class_weight="balanced"), cv=3, n_jobs=2,
    )
    stack_model.fit(X_train_transformed, y_train)
    predictions = stack_model.predict(X_test_transformed)
    probabilities = stack_model.predict_proba(X_test_transformed)[:, 1]
    metrics = {
        "accuracy": float(accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1Score": float(f1_score(y_test, predictions, zero_division=0)),
        "rocAuc": float(roc_auc_score(y_test, probabilities)),
        "confusionMatrix": confusion_matrix(y_test, predictions).tolist(),
    }

    kmeans_features = ["Tenure_Months", "Monthly_Spend", "Login_Frequency", "Monthly_Content_Hours",
                       "Days_Since_Last_Login", "Content_Completion_Rate", "Support_Tickets",
                       "Complaints_Count", "Satisfaction_Score"]
    kmeans_scaler = StandardScaler()
    kmeans_model = KMeans(n_clusters=4, random_state=42, n_init=10)
    kmeans_model.fit(kmeans_scaler.fit_transform(df[kmeans_features]))

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(stack_model, ARTIFACT_DIR / "stacking_model.pkl")
    joblib.dump(preprocessor, ARTIFACT_DIR / "preprocessor.pkl")
    joblib.dump(preprocessor, ARTIFACT_DIR / "scaler.pkl")
    joblib.dump({"categorical_columns": CATEGORICAL_FEATURES, "feature_names": transformed_names}, ARTIFACT_DIR / "label_encoders.pkl")
    joblib.dump(kmeans_model, ARTIFACT_DIR / "kmeans_model.pkl")
    joblib.dump(kmeans_scaler, ARTIFACT_DIR / "kmeans_scaler.pkl")
    joblib.dump(shap.TreeExplainer(stack_model.named_estimators_["xgb"]), ARTIFACT_DIR / "shap_explainer.pkl")
    (ARTIFACT_DIR / "feature_metadata.json").write_text(json.dumps({
        "raw_features": MODEL_FEATURES, "transformed_features": transformed_names,
        "kmeans_features": kmeans_features, "target": TARGET,
    }, indent=2))
    (ARTIFACT_DIR / "model_metrics.json").write_text(json.dumps(metrics, indent=2))
    return metrics


if __name__ == "__main__":
    print(json.dumps(train(), indent=2))