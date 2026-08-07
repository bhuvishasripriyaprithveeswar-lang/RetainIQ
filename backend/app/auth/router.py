"""Auth router — Phase 3: registration + login."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.database import get_db
from app.auth.jwt import create_access_token
from app.auth.schemas import LoginRequest, LoginResponse, TokenUserInfo, UserCreate, UserRead
from app.auth import service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
def auth_status() -> dict:
    """Health check confirming the auth module is mounted."""
    return {"module": "auth", "status": "ready", "phase": 3}


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    """
    Register a new user.

    - **full_name**: required, non-blank
    - **email**: must be a valid email address
    - **password**: minimum 8 characters

    Returns the created user without the password hash.
    Raises **409 Conflict** if the email is already registered.
    """
    if service.get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{payload.email}' is already registered.",
        )
    user = service.register_user(db, payload)
    return UserRead.model_validate(user)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    """
    Authenticate a user and return a JWT access token.

    - **email**: registered email address
    - **password**: account password

    Returns a bearer token (expires in 30 minutes) and basic user info.
    Raises **401 Unauthorized** if credentials are invalid.
    """
    user = service.authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(subject=user.id)
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=TokenUserInfo.model_validate(user),
    )
