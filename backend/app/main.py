from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.config import settings
from app.routers.predict import router as prediction_router
from app.routers.predictions import router as predictions_router
from app.analytics.router import router as analytics_router
from app.auth.router import router as auth_router
from app.auth.database import engine, Base
import app.auth.models  # noqa: F401 — ensures User model is registered with Base

app = FastAPI(
    title="RetainIQ",
    description="FastAPI backend for customer churn prediction and retention insights.",
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router)
app.include_router(predictions_router)
app.include_router(analytics_router)
app.include_router(auth_router)



@app.on_event("startup")
async def startup_event() -> None:
    Base.metadata.create_all(bind=engine)
    app.state.ready = True


@app.get("/health")
def health_check() -> dict:
    return {"status": "ok", "service": "RetainIQ"}


# Configure static and SPA routing
frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

# Mount assets directory for serving styles, JS, images, etc.
app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_dir, "assets")), name="assets")


# SPA catch-all routing
@app.get("/{catchall:path}")
async def serve_spa(catchall: str):
    # If path is empty, serve index.html
    if not catchall:
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))

    # If the requested path corresponds to a file in dist directory, serve it
    file_path = os.path.join(frontend_dist_dir, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)

    # Otherwise, fall back to index.html for SPA client-side routing
    return FileResponse(os.path.join(frontend_dist_dir, "index.html"))

