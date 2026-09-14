from __future__ import annotations

from functools import lru_cache
import pandas as pd

from app.preprocessing.feature_contract import RAW_DATA_PATH


@lru_cache(maxsize=1)
def load_full_dataset() -> pd.DataFrame:
    """Return the finalized raw dataset used by training and analytics."""
    return pd.read_csv(RAW_DATA_PATH)


@lru_cache(maxsize=1)
def load_scaled_dataset() -> pd.DataFrame:
    """Return transformed model features for the full raw dataset."""
    from app.models.model_loader import loader
    from app.preprocessing.feature_contract import MODEL_FEATURES
    df = load_full_dataset()
    return pd.DataFrame(loader.get_preprocessor().transform(df[MODEL_FEATURES]), columns=loader.get_feature_names())


@lru_cache(maxsize=1)
def load_test_scaled() -> tuple[pd.DataFrame, pd.Series]:
    """Return the held-out transformed test set and target."""
    from app.models.model_loader import loader
    from app.preprocessing.feature_contract import MODEL_FEATURES, TARGET
    from sklearn.model_selection import train_test_split
    df = load_full_dataset()
    _, test = train_test_split(df, test_size=0.2, random_state=42, stratify=df[TARGET])
    return (
        pd.DataFrame(loader.get_preprocessor().transform(test[MODEL_FEATURES]), columns=loader.get_feature_names()),
        test[TARGET].astype(int),
    )
