from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import pandas as pd

_BASE = Path(__file__).resolve().parents[2] / "datasets" / "processed"


@lru_cache(maxsize=1)
def load_full_dataset() -> pd.DataFrame:
    """Return the combined (train + test) unscaled dataset with the Exited label."""
    xt = pd.read_csv(_BASE / "X_train.csv")
    yt = pd.read_csv(_BASE / "y_train.csv")
    xte = pd.read_csv(_BASE / "X_test.csv")
    yte = pd.read_csv(_BASE / "y_test.csv")
    return pd.concat(
        [pd.concat([xt, yt], axis=1), pd.concat([xte, yte], axis=1)],
        ignore_index=True,
    )


@lru_cache(maxsize=1)
def load_scaled_dataset() -> pd.DataFrame:
    """Return the combined (train + test) scaled dataset without the label."""
    xts = pd.read_csv(_BASE / "X_train_scaled.csv")
    xtes = pd.read_csv(_BASE / "X_test_scaled.csv")
    return pd.concat([xts, xtes], ignore_index=True)


@lru_cache(maxsize=1)
def load_test_scaled() -> tuple[pd.DataFrame, pd.Series]:
    """Return (X_test_scaled, y_test) for model evaluation."""
    xtes = pd.read_csv(_BASE / "X_test_scaled.csv")
    yte = pd.read_csv(_BASE / "y_test.csv")
    return xtes, yte["Exited"]
