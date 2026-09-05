
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    sessions = relationship("Session", back_populates="user")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    overall_confidence = Column(Float)
    overall_clarity = Column(Float)
    overall_pacing = Column(Float)
    filler_control = Column(Float)
    engagement = Column(Float)

    questions_data = Column(Text)

    user = relationship("User", back_populates="sessions")
