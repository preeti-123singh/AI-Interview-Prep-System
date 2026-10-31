from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import List
import json
import os
import re
from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

from database import Base, engine, SessionLocal
import models
import schemas
import auth_utils
import nlp_engine
nlp_engine._load()
import llm_judge
import face_engine
try:
    face_engine._load()
except Exception as e:
    print("Face model not loaded:", e)

Base.metadata.create_all(bind=engine)
load_dotenv()

llm_client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
LLM_MODEL = "openai/gpt-oss-120b"

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
class QuestionRequest(BaseModel):
    domain: str
    difficulty: str = "medium"


def fallback_questions(domain: str):
    # Used only if the AI call fails, so the demo never breaks
    return [
        f"Tell me about yourself and why you chose {domain}.",
        f"What are the core concepts every beginner in {domain} must know?",
        f"Describe a project you worked on related to {domain}.",
        f"What tools or technologies do you use in {domain}, and why?",
        f"Explain a difficult problem you faced in {domain} and how you solved it.",
        f"How do you keep your {domain} skills up to date?",
        f"Where do you see yourself in {domain} in the next three years?",
        "Why should we hire you?",
    ]


@app.post("/questions/generate")
def generate_questions(
    req: QuestionRequest,
    current_user: models.User = Depends(get_current_user),
):
    domain = req.domain.strip()[:100]
    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")

    difficulty = req.difficulty.strip().lower()
    if difficulty not in ("easy", "medium", "hard"):
        difficulty = "medium"

    prompt = (
        f"Generate exactly 8 mock interview questions for a student applying in the "
        f"domain: {domain}. Difficulty level: {difficulty}. "
        f"Mix technical and behavioural questions. Each question must be answerable "
        f"verbally in about one minute. "
        f"Return ONLY a JSON array of 8 strings. No numbering, no explanation, no markdown."
    )

    try:
        response = llm_client.chat.completions.create(
            model=LLM_MODEL,
            messages=[
                {"role": "system", "content": "You are an interview question generator. You reply with JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
        questions = json.loads(text)
        if not isinstance(questions, list):
            raise ValueError("Not a list")
        questions = [str(q).strip() for q in questions if str(q).strip()][:8]
        if len(questions) < 5:
            raise ValueError("Too few questions")
        source = "ai"
    except Exception as e:
        print("Question generation failed:", e)
        questions = fallback_questions(domain)
        source = "fallback"

    return {
        "domain": domain,
        "difficulty": difficulty,
        "source": source,
        "questions": questions,
    }
class AnalyzeRequest(BaseModel):
    question: str
    answer: str


@app.post("/analyze")
def analyze(
    req: AnalyzeRequest,
    current_user: models.User = Depends(get_current_user),
):
    result = nlp_engine.analyze_answer(req.question, req.answer)
    result["bert_similarity"] = result["relevance"]
    result["correctness"] = 0
    result["feedback"] = ""
    result["model_answer"] = ""
    result["study_topics"] = []

    judged = llm_judge.judge_answer(req.question, req.answer)
    if judged:
        result["feedback"] = judged["feedback"]
        result["model_answer"] = judged["model_answer"]
        result["study_topics"] = judged["study_topics"]

        if result["word_count"] > 0 and not result["gave_up"]:
            fluency = result.get("fluency", 0)
            result["relevance"] = judged["relevance"]
            result["correctness"] = judged["correctness"]
            result["clarity"] = round(0.5 * judged["relevance"] + 0.5 * fluency)
            result["answer_quality"] = round(
                0.45 * judged["correctness"]
                + 0.25 * judged["relevance"]
                + 0.15 * result["depth"]
                + 0.15 * fluency
            )

            content = (judged["relevance"] + judged["correctness"]) / 2
            result["confidence"] = round(
                result["confidence"] * (0.3 + 0.7 * content / 100)
            )

            if result["word_count"] < 8:
                result["relevance"] = min(result["relevance"], 30)
                result["correctness"] = min(result["correctness"], 30)
                result["clarity"] = min(result["clarity"], 30)
                result["answer_quality"] = min(result["answer_quality"], 25)

    return result
class FaceRequest(BaseModel):
    frames: List[str]


@app.post("/face/analyze")
def face_analyze(
    req: FaceRequest,
    current_user: models.User = Depends(get_current_user),
):
    return face_engine.analyze_frames(req.frames[:8])

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

