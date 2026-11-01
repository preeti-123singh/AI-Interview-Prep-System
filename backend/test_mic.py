import numpy as np
import sounddevice as sd

print(sd.query_devices())
print("\nDefault input and output device numbers:", sd.default.device)

SR = 16000
print("\nSpeak loudly for 5 seconds...")
a = sd.rec(int(5 * SR), samplerate=SR, channels=1, dtype="float32")
sd.wait()
print("Loudest level:", float(np.max(np.abs(a))))