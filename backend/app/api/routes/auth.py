from app.core.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, RegisterResponse, TokenResponse
from app.services.auth_service import register_user_service, login_user_service
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/register", response_model=RegisterResponse)
async def register_user(request: RegisterRequest, db: Session = Depends(get_db)):
    try:
        result = register_user_service(
            username=request.username,
            password=request.password,
            email=request.email,
            full_name=request.full_name,
            db=db
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during registration: {e}")


@router.post("/login", response_model=TokenResponse)
async def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        token_data = login_user_service(
            username=request.username,
            password=request.password,
            db=db
        )
        return token_data
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error during login: {e}")
