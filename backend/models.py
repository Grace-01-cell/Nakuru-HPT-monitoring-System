from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)

    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)

    role = Column(String, nullable=False)  # facility, county, admin

    facility_mfl_code = Column(String, nullable=True)
    facility_name = Column(String, nullable=True)
    subcounty_name = Column(String, nullable=True)

    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())