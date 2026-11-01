"""Wav2Vec2 voice analysis: real speaking pace and pauses."""
import numpy as np
import torch
from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC

MODEL_NAME = "facebook/wav2vec2-base-960h"
SAMPLE_RATE = 16000
FRAME_SECONDS = 0.02      # Wav2Vec2 gives one result every 20 ms
PAUSE_SECONDS = 0.5       # a gap this long between words counts as a pause
MAX_SECONDS = 90          # we only look at the first 90 seconds of an answer

_processor = None
_model = None


def _load():
    """Load the model once. It downloads about 360 MB the first time."""
    global _processor, _model
    if _model is not None:
        return
    _processor = Wav2Vec2Processor.from_pretrained(MODEL_NAME)
    _model = Wav2Vec2ForCTC.from_pretrained(MODEL_NAME)
    _model.eval()


def _pace_score(wpm):
    if wpm <= 0:
        return 0
    if 110 <= wpm <= 160:
        return 100
    if wpm < 110:
        return max(0, int(100 - (110 - wpm) * 1.5))
    return max(0, int(100 - (wpm - 160) * 1.5))


def _pace_label(wpm):
    if wpm <= 0:
        return "Not enough speech"
    if wpm < 90:
        return "Too slow"
    if wpm < 110:
        return "A bit slow"
    if wpm <= 160:
        return "Good pace"
    if wpm <= 190:
        return "A bit fast"
    return "Too fast"


def _empty(seconds):
    return {
        "transcript": "",
        "word_count": 0,
        "speech_seconds": 0,
        "total_seconds": round(seconds, 1),
        "wpm": 0,
        "pace_label": "Not enough speech",
        "pace_score": 0,
        "pause_count": 0,
        "longest_pause": 0,
        "total_pause": 0,
    }


def analyze_audio(samples, sample_rate=SAMPLE_RATE):
    """samples = mono audio numbers, sample_rate must be 16000."""
    _load()
    samples = np.asarray(samples, dtype=np.float32).flatten()
    samples = samples[: MAX_SECONDS * sample_rate]
    total_seconds = len(samples) / sample_rate

    # too short or silent
    if total_seconds < 1.0 or float(np.max(np.abs(samples))) < 0.005:
        return _empty(total_seconds)

    inputs = _processor(samples, sampling_rate=sample_rate, return_tensors="pt")
    with torch.no_grad():
        logits = _model(inputs.input_values).logits
    ids = torch.argmax(logits, dim=-1)[0].tolist()
    transcript = _processor.decode(ids).lower().strip()

    # find where each word starts and ends
    tok = _processor.tokenizer
    special = set(tok.all_special_ids)
    delimiter = tok.word_delimiter_token_id

    words = []
    in_word = False
    start = last = 0
    for i, token_id in enumerate(ids):
        if token_id == delimiter:
            if in_word:
                words.append((start * FRAME_SECONDS, (last + 1) * FRAME_SECONDS))
                in_word = False
        elif token_id not in special:
            if not in_word:
                start = i
                in_word = True
            last = i
    if in_word:
        words.append((start * FRAME_SECONDS, (last + 1) * FRAME_SECONDS))

    # very short answers give silly pace numbers, so we ignore them
    if len(words) < 8:
        result = _empty(total_seconds)
        result["transcript"] = transcript
        result["word_count"] = len(words)
        return result

    # pauses = gaps between words
    gaps = [words[i][0] - words[i - 1][1] for i in range(1, len(words))]
    pauses = [g for g in gaps if g >= PAUSE_SECONDS]

    speech_seconds = words[-1][1] - words[0][0]
    wpm = len(words) / speech_seconds * 60 if speech_seconds > 0 else 0

    return {
        "transcript": transcript,
        "word_count": len(words),
        "speech_seconds": round(speech_seconds, 1),
        "total_seconds": round(total_seconds, 1),
        "wpm": int(round(wpm)),
        "pace_label": _pace_label(wpm),
        "pace_score": _pace_score(wpm),
        "pause_count": len(pauses),
        "longest_pause": round(max(pauses), 1) if pauses else 0,
        "total_pause": round(sum(pauses), 1),
    }


def analyze_wav_bytes(wav_bytes):
    """Read a 16 kHz mono WAV file sent by the browser and analyse it."""
    import io
    import wave

    with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
        sr = wf.getframerate()
        channels = wf.getnchannels()
        raw = wf.readframes(wf.getnframes())

    data = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    if channels > 1:
        data = data.reshape(-1, channels).mean(axis=1)
    return analyze_audio(data, sr)