import os
import json
import re
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)
MODEL = "openai/gpt-oss-120b"


def judge_answer(question: str, answer: str):
    prompt = f"""You are a strict but fair technical interviewer.

Question: {question}

Candidate's answer (from speech-to-text, so ignore small spelling or transcription errors such as 'GRE' instead of 'JRE'):
{answer}

Score the answer from 0 to 100:
- relevance: how directly the answer addresses THIS exact question. An answer about a different topic must score below 30, even if it is about the same subject.
- correctness: how factually correct the answer is. Wrong statements must lower the score.

Also write:
- feedback: one or two short sentences telling the candidate what was good and what was missing or wrong.

Return ONLY JSON like this, with no other text:
{{"relevance": 0, "correctness": 0, "feedback": ""}}"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You grade interview answers. You reply with JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
        )
        text = response.choices[0].message.content.strip()
        text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
        data = json.loads(text)
        return {
            "relevance": max(0, min(100, int(data.get("relevance", 0)))),
            "correctness": max(0, min(100, int(data.get("correctness", 0)))),
            "feedback": str(data.get("feedback", ""))[:400],
        }
    except Exception as e:
        print("Judge failed:", e)
        return None