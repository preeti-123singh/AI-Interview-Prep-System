from pydantic import BaseModel
from typing import List, Dict, Any
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


class SessionCreate(BaseModel):
    overall_confidence: float
    overall_clarity: float
    overall_pacing: float
    filler_control: float
    engagement: float
    questions_data: List[Dict[str, Any]]


class SessionOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime
    overall_confidence: float
    overall_clarity: float
    overall_pacing: float
    filler_control: float
    engagement: float
    questions_data: List[Dict[str, Any]]

    class Config:
        from_attributes = True
