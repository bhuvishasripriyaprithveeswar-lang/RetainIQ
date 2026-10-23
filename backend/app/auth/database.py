"""SQLAlchemy engine, session factory, and Base for the auth database."""
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Place users.db next to this file's package root (backend/users.db)
_configured_db_path = os.getenv("RETAINIQ_DATABASE_PATH")
_DB_PATH = (
    Path(_configured_db_path).expanduser()
    if _configured_db_path
    else Path(__file__).resolve().parents[2] / "users.db"
)
_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
