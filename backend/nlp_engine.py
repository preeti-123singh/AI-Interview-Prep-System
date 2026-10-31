import re
import spacy
from sentence_transformers import SentenceTransformer, util

_nlp = None
_model = None

FILLERS = {"um", "uh", "umm", "uhh", "actually", "basically", "literally", "like"}
GIVE_UP = ["don't know", "do not know", "dont know", "no idea", "not sure",
           "can't remember", "cannot remember", "forgot", "can't recall"]
HEDGES = ["i think", "i guess", "maybe", "probably", "kind of", "sort of", "i believe"]


def _load():
    global _nlp, _model
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _nlp, _model


def _clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))


def analyze_answer(question: str, answer: str):
    nlp, model = _load()
    answer = (answer or "").strip()

    if not answer:
              return {
            "word_count": 0, "filler_count": 0, "sentence_count": 0,
            "relevance": 0, "depth": 0, "clarity": 0, "confidence": 0,
            "answer_quality": 0, "gave_up": False, "fluency": 0,
        }
    text = answer.lower().replace("’", "'")

    doc = nlp(answer)
    words = [t for t in doc if t.is_alpha]
    word_count = len(words)
    filler_count = sum(1 for t in words if t.lower_ in FILLERS)
    filler_count += len(re.findall(r"\byou know\b", text))
    content_words = [t for t in words if not t.is_stop]
    sentence_count = len(list(doc.sents))

    gave_up = word_count < 20 and any(p in text for p in GIVE_UP)
    hedge_count = sum(text.count(h) for h in HEDGES)

    emb = model.encode([question, answer], convert_to_tensor=True)
    similarity = float(util.cos_sim(emb[0], emb[1]))
    relevance = round(_clamp((similarity - 0.10) / 0.50 * 100))

    depth = round(_clamp(len(content_words) / 45 * 100))
    if sentence_count < 2:
        depth = round(depth * 0.7)

    filler_ratio = filler_count / word_count if word_count else 0
    fluency = _clamp(100 - filler_ratio * 300)

    # Confidence: fluent, not hedging, and not a one-line answer
    length_factor = min(1.0, word_count / 25)
    confidence = fluency * (0.5 + 0.5 * length_factor) - min(30, hedge_count * 8)
    confidence = round(_clamp(confidence))

    clarity = round(0.5 * relevance + 0.5 * fluency)
    answer_quality = round(0.5 * relevance + 0.3 * depth + 0.2 * fluency)
    if word_count < 8:
        relevance = min(relevance, 30)
        depth = min(depth, 20)
        confidence = min(confidence, 20)
        clarity = min(clarity, 30)
        answer_quality = min(answer_quality, 25)
    if gave_up:
        relevance = min(relevance, 10)
        depth = min(depth, 10)
        confidence = min(confidence, 15)
        clarity = min(clarity, 15)
        answer_quality = min(answer_quality, 10)

    return {
        "word_count": word_count,
        "filler_count": filler_count,
        "sentence_count": sentence_count,
        "relevance": relevance,
        "depth": depth,
        "clarity": clarity,
        "confidence": confidence,
        "answer_quality": answer_quality,
        "gave_up": gave_up,
        "fluency": round(fluency),
    }