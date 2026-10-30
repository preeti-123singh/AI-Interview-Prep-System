import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaArrowLeft,
  FaArrowRight,
  FaClock,
  FaFlagCheckered,
  FaSignOutAlt,
  
} from "react-icons/fa";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

function loadSetup() {
  try {
    const saved = sessionStorage.getItem("interviewSetup");
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}
const QUESTION_TIME = 120;
const FILLER_WORDS = ["um", "uh", "uhh", "umm", "like", "actually", "basically", "you know"];

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function InterviewSession() {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
    const [setup] = useState(loadSetup);
  const QUESTIONS = setup ? setup.questions : [];

  useEffect(() => {
    if (!setup) navigate("/setup", { replace: true });
  }, [setup, navigate]);
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);
  const [permissionError, setPermissionError] = useState(null);
  const [waveLevels, setWaveLevels] = useState(new Array(20).fill(4));
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now());
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
 const recognitionRef = useRef(null);
const sessionDataRef = useRef([]);
const micOnRef = useRef(false);

  const question = QUESTIONS[qIndex];

  const startStream = useCallback(async (deviceId) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;
      setPermissionError(null);

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(cams);
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const settings = activeTrack.getSettings();
        if (settings.deviceId) setSelectedDeviceId(settings.deviceId);
      }
    } catch (err) {
      setPermissionError(
        "Camera/microphone access was denied or unavailable. Allow permissions and refresh to enable live features."
      );
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!cancelled) await startStream(null);
    })();

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let finalText = "";
        let interimText = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) finalText += res[0].transcript + " ";
          else interimText += res[0].transcript;
        }
        if (finalText) setTranscript((prev) => (prev + " " + finalText).trim());
        setInterim(interimText);
      };

     recognition.onerror = (event) => {
  console.warn("Speech recognition error:", event.error);
};

recognition.onend = () => {
  // Browsers sometimes stop recognition on their own after a while.
  // If the mic is still supposed to be on, restart it automatically.
  if (micOnRef.current) {
    try {
      recognition.start();
    } catch (e) {}
  }
};

recognitionRef.current = recognition;
    }

    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (recognitionRef.current) recognitionRef.current.stop();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
  }, [cameraOn]);

 useEffect(() => {
  micOnRef.current = micOn;
  if (!streamRef.current) return;
  streamRef.current.getAudioTracks().forEach((t) => (t.enabled = micOn));

  

    if (micOn) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }
      const loop = () => {
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const bars = Array.from({ length: 20 }, (_, i) => {
            const v = data[i * 2] || 0;
            return Math.max(4, Math.min(32, (v / 255) * 32));
          });
          setWaveLevels(bars);
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setWaveLevels(new Array(20).fill(4));
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [micOn]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [timeLeft, qIndex]);

  const goToQuestion = useCallback((nextIndex) => {
    setQIndex(nextIndex);
    setTimeLeft(QUESTION_TIME);
    setTranscript("");
    setInterim("");
    setQuestionStartedAt(Date.now());
  }, []);

  const handleNext = () => {
  sessionDataRef.current.push({
    question,
    transcript: transcript.trim(),
    wordCount,
    fillerCount,
    pace,
    confidence,
    clarity,
  });

  if (qIndex < QUESTIONS.length - 1) {
    goToQuestion(qIndex + 1);
  } else {
    const finalData = sessionDataRef.current;

    try {
      sessionStorage.setItem("interviewResults", JSON.stringify(finalData));
    } catch (e) {}
        sessionStorage.removeItem("interviewSetup");

    const avg = (key) =>
      finalData.length
        ? Math.round(finalData.reduce((sum, d) => sum + d[key], 0) / finalData.length)
        : 0;

    const totalWords = finalData.reduce((s, d) => s + d.wordCount, 0);
    const totalFillers = finalData.reduce((s, d) => s + d.fillerCount, 0);
    const fillerControlScore =
      totalWords > 0 ? Math.max(0, Math.round(100 - (totalFillers / totalWords) * 400)) : 100;
    const engagementScore = Math.min(100, Math.round(avg("wordCount") / 1.3));

    axios
      .post(
        "http://localhost:8000/interviews",
        {
          overall_confidence: avg("confidence"),
          overall_clarity: avg("clarity"),
          overall_pacing: avg("pace"),
          filler_control: fillerControlScore,
          engagement: engagementScore,
          questions_data: finalData,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .catch((err) => console.error("Failed to save interview to history:", err));

    navigate("/results");
  }
};

  const words = transcript.trim() ? transcript.trim().split(/\s+/) : [];
  const wordCount = words.length;
  const fillerCount = words.filter((w) => FILLER_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, ""))).length;
  const elapsedMin = Math.max((Date.now() - questionStartedAt) / 60000, 1 / 60);
  const pace = wordCount > 0 ? Math.round(wordCount / elapsedMin) : 0;
  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  const confidence = wordCount > 0 ? Math.max(20, Math.min(98, Math.round(100 - fillerRatio * 260))) : 0;
  const clarity = wordCount > 0 ? Math.max(15, Math.min(96, Math.round(100 - Math.abs(pace - 130) * 0.4))) : 0;

  return (
    <div className="relative min-h-screen bg-navy-600 text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]" />

      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 text-sm text-navy-100/60 hover:text-white transition-colors">
          <FaArrowLeft /> Exit
        </Link>
        <div className="flex items-center gap-6 font-mono text-xs text-navy-100/60">
          <span>
            Question <span className="text-white font-semibold">{qIndex + 1}</span> of {QUESTIONS.length}
          </span>
                   <span className={`flex items-center gap-1.5 ${timeLeft <= 20 ? "text-red-400" : "text-teal-400"}`}>
            <FaClock /> {formatTime(timeLeft)}
          </span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-1.5 hover:text-red-400 transition-colors"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>

      {permissionError && (
        <div className="relative z-10 mx-6 md:mx-10 mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {permissionError}
        </div>
      )}

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-8 grid lg:grid-cols-[1.3fr_1fr] gap-6">
        <div className="space-y-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-white/10 bg-navy-500/50 px-6 py-5"
            >
              <span className="inline-block font-mono text-[11px] tracking-widest text-teal-400 mb-2">
                AI INTERVIEWER
              </span>
              <p className="text-lg md:text-xl font-medium leading-snug">{question}</p>
            </motion.div>
          </AnimatePresence>

          <div className="relative rounded-2xl border border-white/10 bg-black/40 overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${cameraOn ? "opacity-100" : "opacity-0"}`}
            />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center text-navy-100/40 text-sm">
                Camera is off
              </div>
            )}

            {videoDevices.length > 1 && (
              <div className="absolute top-4 left-4">
                <select
                  value={selectedDeviceId || ""}
                  onChange={(e) => startStream(e.target.value)}
                  className="bg-black/60 border border-white/20 rounded-md text-xs text-white px-2 py-1.5 max-w-[180px]"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-colors ${
                  micOn
                    ? "bg-teal-500 border-teal-400 text-navy-900"
                    : "bg-black/50 border-white/20 text-white hover:border-teal-400"
                }`}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
              >
                {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
              <button
                onClick={() => setCameraOn((v) => !v)}
                className={`h-11 w-11 rounded-full flex items-center justify-center border transition-colors ${
                  cameraOn
                    ? "bg-white/10 border-white/20 text-white hover:border-teal-400"
                    : "bg-red-500/20 border-red-400/40 text-red-300"
                }`}
                aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
              >
                {cameraOn ? <FaVideo /> : <FaVideoSlash />}
              </button>
            </div>

            <div className="absolute top-4 right-4 flex items-end gap-[3px] h-8 bg-black/40 rounded-lg px-2 py-1">
              {waveLevels.map((h, i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-teal-400 transition-all duration-75"
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-navy-500/40 px-5 py-4 min-h-[100px]">
            <span className="block font-mono text-[11px] tracking-widest text-teal-400 mb-2">
              LIVE TRANSCRIPT
            </span>
            {!speechSupported ? (
              <p className="text-sm text-navy-100/50">
                Live transcription isn't supported in this browser. Try Chrome or Edge for real-time speech-to-text.
              </p>
            ) : transcript || interim ? (
              <p className="text-sm text-navy-100/80 leading-relaxed">
                {transcript} <span className="text-navy-100/40 italic">{interim}</span>
              </p>
            ) : (
              <p className="text-sm text-navy-100/40">
                {micOn ? "Listening — start speaking your answer..." : "Turn on your mic to start answering."}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-semibold shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 transition-transform"
            >
              {qIndex < QUESTIONS.length - 1 ? (
                <>
                  Next Question <FaArrowRight className="text-sm" />
                </>
              ) : (
                <>
                  Finish Interview <FaFlagCheckered className="text-sm" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-navy-500/50 px-5 py-5">
            <span className="block font-mono text-[11px] tracking-widest text-teal-400 mb-1">
              LIVE ANALYSIS
            </span>
            <p className="text-xs text-navy-100/40 mb-5">
              Heuristic preview from your transcript. Full BERT / Wav2Vec2 scoring runs on the backend after
              submission.
            </p>

            <div className="space-y-4">
              {[
                { label: "Confidence", value: confidence },
                { label: "Clarity", value: clarity },
                { label: "Pace (WPM)", value: pace, isRaw: true },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between font-mono text-[11px] text-navy-100/60 mb-1.5">
                    <span>{m.label}</span>
                    <span className="text-teal-400 font-medium">{m.isRaw ? m.value : `${m.value}%`}</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                      animate={{ width: `${m.isRaw ? Math.min(100, (m.value / 200) * 100) : m.value}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-xl font-bold">{wordCount}</div>
                <div className="text-[11px] text-navy-100/50">words spoken</div>
              </div>
              <div>
                <div className="text-xl font-bold">{fillerCount}</div>
                <div className="text-[11px] text-navy-100/50">filler words</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-navy-500/40 px-5 py-4">
            <span className="block font-mono text-[11px] tracking-widest text-teal-400 mb-3">SESSION</span>
            <div className="flex flex-wrap gap-2">
              {QUESTIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToQuestion(i)}
                  className={`h-2.5 w-6 rounded-full transition-colors ${
                    i === qIndex ? "bg-teal-400" : i < qIndex ? "bg-teal-400/40" : "bg-white/10"
                  }`}
                  aria-label={`Go to question ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}