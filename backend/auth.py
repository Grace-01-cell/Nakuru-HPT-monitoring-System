from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import get_db
from models import User


router = APIRouter(prefix="/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str  # facility, county, admin
    facility_mfl_code: Optional[str] = None
    facility_name: Optional[str] = None
    subcounty_name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


@router.post("/register")
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )

    if existing_user:
        return {
            "success": False,
            "message": "User already exists",
        }
    approved = payload.role == "facility"  # Facility users are auto-approved, others require admin approval
    new_user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        facility_mfl_code=payload.facility_mfl_code,
        facility_name=payload.facility_name,
        subcounty_name=payload.subcounty_name,
        is_active=True,
        is_approved=approved,
        
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "success": True,
        "message": "Account created successfully",
        "user": {
            "user_id": new_user.user_id,
            "first_name": new_user.first_name,
            "last_name": new_user.last_name,
            "email": new_user.email,
            "role": new_user.role,
            "facility_mfl_code": new_user.facility_mfl_code,
            "facility_name": new_user.facility_name,
            "subcounty_name": new_user.subcounty_name,
            "is_active": new_user.is_active,
        },
    }


@router.post("/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.email == payload.email.lower())
        .first()
    )

    if not user:
        return {
            "success": False,
            "message": "Invalid email or password",
        }

    if not user.is_active:
        return {
            "success": False,
            "message": "Account is inactive",
        }
    if not user.is_approved:
        return {
            "success": False,
            "message": "Account is pending approval by admin",
        }

    if not verify_password(payload.password, user.password_hash):
        return {
            "success": False,
            "message": "Invalid email or password",
        }

    return {
        "success": True,
        "message": "Login successful",
        "user": {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "facility_mfl_code": user.facility_mfl_code,
            "facility_name": user.facility_name,
            "subcounty_name": user.subcounty_name,
            "is_active": user.is_active,
        },
    }
@router.post("/login")
def login_user(login_data: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(
        User.email == login_data.email
    ).first()

    if not user:
        return {
            "success": False,
            "message": "Invalid email or password"
        }

    if not user.is_approved:
        return {
            "success": False,
            "message": "Your account is awaiting administrator approval."
        }

    if not verify_password(login_data.password, user.password_hash):
        return {
            "success": False,
            "message": "Invalid email or password"
        }

    return {
        "success": True,
        "user": user
    }


@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()

    return [
        {
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "facility_mfl_code": user.facility_mfl_code,
            "facility_name": user.facility_name,
            "subcounty_name": user.subcounty_name,
            "is_active": user.is_active,
            "created_at": user.created_at,
        }
        for user in users
    ]