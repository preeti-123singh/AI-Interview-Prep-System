from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
import json

from database import Base, engine, SessionLocal
import models
import schemas
import auth_utils

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Interview Prep API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


@app.get("/")
def root():
    return {"message": "Interview Prep API is running"}


@app.post("/signup", response_model=schemas.Token)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=auth_utils.hash_password(user.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = auth_utils.create_access_token({"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "user": new_user}


@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not auth_utils.verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = auth_utils.create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "user": user}


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = auth_utils.decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = db.query(models.User).filter(models.User.email == payload.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@app.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.post("/interviews", response_model=schemas.SessionOut)
def create_interview(
    session_data: schemas.SessionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_session = models.Session(
        user_id=current_user.id,
        overall_confidence=session_data.overall_confidence,
        overall_clarity=session_data.overall_clarity,
        overall_pacing=session_data.overall_pacing,
        filler_control=session_data.filler_control,
        engagement=session_data.engagement,
        questions_data=json.dumps(session_data.questions_data),
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return schemas.SessionOut(
        id=new_session.id,
        user_id=new_session.user_id,
        created_at=new_session.created_at,
        overall_confidence=new_session.overall_confidence,
        overall_clarity=new_session.overall_clarity,
        overall_pacing=new_session.overall_pacing,
        filler_control=new_session.filler_control,
        engagement=new_session.engagement,
        questions_data=json.loads(new_session.questions_data),
    )


@app.get("/interviews", response_model=List[schemas.SessionOut])
def list_interviews(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sessions = (
        db.query(models.Session)
        .filter(models.Session.user_id == current_user.id)
        .order_by(models.Session.created_at.desc())
        .all()
    )

    return [
        schemas.SessionOut(
            id=s.id,
            user_id=s.user_id,
            created_at=s.created_at,
            overall_confidence=s.overall_confidence,
            overall_clarity=s.overall_clarity,
            overall_pacing=s.overall_pacing,
            filler_control=s.filler_control,
            engagement=s.engagement,
            questions_data=json.loads(s.questions_data),
        )
        for s in sessions
    ]

