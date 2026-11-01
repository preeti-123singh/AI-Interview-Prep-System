import json
import numpy as np
import sounddevice as sd
import voice_engine

SR = 16000
SECONDS = 15

print("Loading the model, please wait...")
voice_engine._load()

input("\nPress ENTER, then start speaking at once for 15 seconds: ")
print("RECORDING... speak now")
audio = sd.rec(int(SECONDS * SR), samplerate=SR, channels=1, dtype="float32")
sd.wait()
print("Recording done. Analysing...\n")

samples = audio[:, 0]
print("Loudest level:", float(np.max(np.abs(samples))))

result = voice_engine.analyze_audio(samples, SR)
print(json.dumps(result, indent=2))