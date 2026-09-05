import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaRobot, FaChartLine, FaMicrophoneAlt, FaFileAlt, FaArrowRight } from "react-icons/fa";

const QUESTION = "Tell me about a time you handled a tight deadline.";
const ANSWER_PREVIEW =
  "In my final semester project, I had 48 hours to fix a critical bug before demo day...";

const SCORES = [
  { label: "Clarity", value: 87 },
  { label: "Confidence", value: 92 },
  { label: "Relevance", value: 78 },
];

const FEATURES = [
  {
    icon: FaRobot,
    title: "Real AI Interview Sessions",
    desc: "Practice with an AI interviewer that asks role-specific questions and adapts follow-ups based on your answers.",
  },
  {
    icon: FaMicrophoneAlt,
    title: "Speech & Confidence Analysis",
    desc: "Get scored on pace, filler words, tone, and clarity using Wav2Vec2 speech analysis.",
  },
  {
    icon: FaChartLine,
    title: "Performance Analytics Dashboard",
    desc: "Track your progress across sessions with trend lines on clarity, confidence, and technical accuracy.",
  },
  {
    icon: FaFileAlt,
    title: "Personalized Feedback Reports",
    desc: "After every session, get a breakdown of what worked, what didn't, and what to fix next.",
  },
];

function InterviewConsole() {
  const [stage, setStage] = useState(0); // 0 question, 1 listening, 2 scores
  const [cycle, setCycle] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    setTyped("");
    let i = 0;
    const typeId = setInterval(() => {
      i += 1;
      setTyped(QUESTION.slice(0, i));
      if (i >= QUESTION.length) clearInterval(typeId);
    }, 30);
    return () => clearInterval(typeId);
  }, [cycle]);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 1600);
    const t2 = setTimeout(() => setStage(2), 3600);
    const t3 = setTimeout(() => {
      setStage(0);
      setCycle((c) => c + 1);
    }, 7600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [cycle]);

  return (
    <div
      className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-500/60 backdrop-blur shadow-2xl shadow-black/40 overflow-hidden"
      role="img"
      aria-label="Animated preview of a live AI interview session with performance scoring"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="h-2 w-2 rounded-full bg-white/20" />
        <span className="ml-2 font-mono text-[11px] text-navy-100/60">live_session.ai</span>
        <span
          className={`ml-auto flex items-center gap-1.5 font-mono text-[10px] tracking-wider transition-opacity duration-300 ${
            stage === 1 ? "opacity-100 text-teal-400" : "opacity-0"
          }`}
        >
          <motion.span
            className="h-1.5 w-1.5 rounded-full bg-teal-400"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 0.7, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          LISTENING
        </span>
      </div>

      <div className="px-5 py-6 min-h-[260px]">
        <div className="flex gap-3 mb-5">
          <span className="shrink-0 h-fit rounded-md bg-teal-500/10 px-2 py-1 font-mono text-[10px] text-teal-400">
            AI
          </span>
          <p className="text-sm leading-relaxed text-white/90">
            {typed}
            {stage === 0 && (
              <span className="inline-block w-[2px] h-4 bg-teal-400 ml-0.5 animate-pulse align-text-bottom" />
            )}
          </p>
        </div>

        {stage >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 mb-5 items-center">
            <span className="shrink-0 h-fit rounded-md bg-teal-500/10 px-2 py-1 font-mono text-[10px] text-teal-400">
              YOU
            </span>
            <div className="flex items-center gap-[3px] h-7">
              {Array.from({ length: 22 }).map((_, i) => (
                <motion.span
                  key={i}
                  className="w-[3px] rounded-full bg-teal-400/80"
                  animate={{ height: [6, 22, 6] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.045 }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {stage === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 mb-5"
            >
              <p className="text-xs italic text-navy-100/60 leading-relaxed">&ldquo;{ANSWER_PREVIEW}&rdquo;</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {stage === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {SCORES.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between font-mono text-[11px] text-navy-100/60 mb-1.5">
                    <span>{s.label}</span>
                    <span className="text-teal-400 font-medium">{s.value}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${s.value}%` }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-navy-600 overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-teal-500/20 blur-[100px] rounded-full" />

      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <span className="text-teal-400">◆</span> InterviewIQ
        </div>
        <div className="hidden md:flex gap-8 text-sm text-navy-100/60">
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#how" className="hover:text-white transition-colors">
            How it works
          </a>
        </div>
        <Link
          to="/interview"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:border-teal-400 transition-colors"
        >
          Start Interview
        </Link>
      </nav>

      <header className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-10 pb-24 grid md:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-block font-mono text-xs tracking-widest text-teal-400 mb-5">
            AI-POWERED INTERVIEW PREP
          </span>
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.1] mb-6">
            Practice interviews with an AI that{" "}
            <span className="bg-gradient-to-r from-teal-400 to-teal-500 bg-clip-text text-transparent">
              actually tells you the truth.
            </span>
          </h1>
          <p className="text-navy-100/60 text-lg leading-relaxed max-w-md mb-9">
            Real-time AI-driven mock interviews with speech, confidence, and answer-quality
            analysis — so you walk into the real one already knowing your weak spots.
          </p>
          <div className="flex items-center gap-5 mb-14">
            <Link
              to="/interview"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-semibold shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 transition-transform"
            >
              Start Interview <FaArrowRight className="text-sm" />
            </Link>
            <a href="#how" className="text-navy-100/60 hover:text-white text-sm font-medium transition-colors">
              See how it works
            </a>
          </div>
          <div className="flex gap-10 flex-wrap">
            <div>
              <div className="text-2xl font-bold">10k+</div>
              <div className="text-xs text-navy-100/50">Mock sessions run</div>
            </div>
            <div>
              <div className="text-2xl font-bold">3</div>
              <div className="text-xs text-navy-100/50">Analytics dimensions per answer</div>
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <div className="text-xs text-navy-100/50">Judgement. Just data.</div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="flex justify-center"
        >
          <InterviewConsole />
        </motion.div>
      </header>

      <section id="features" className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pb-24 text-center">
        <span className="block font-mono text-xs tracking-widest text-teal-400 mb-4">WHAT YOU GET</span>
        <h2 className="text-3xl font-bold mb-12">Everything a real prep session needs</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-left">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-xl border border-white/10 bg-navy-500/40 p-6 hover:border-teal-400/40 hover:-translate-y-1 transition-all"
            >
              <f.icon className="text-teal-400 text-2xl mb-4" />
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-navy-100/60 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="how" className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 mb-20">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-teal-500/10 to-transparent px-10 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to see where you actually stand?</h2>
          <p className="text-navy-100/60 mb-8">No sign-up friction. Start a session and get scored in minutes.</p>
          <Link
            to="/interview"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-7 py-3.5 font-semibold shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 transition-transform"
          >
            Start Interview <FaArrowRight className="text-sm" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10 flex flex-wrap justify-between gap-3 border-t border-white/10 px-6 md:px-12 py-8 text-xs text-navy-100/40">
        <span>© {new Date().getFullYear()} InterviewIQ</span>
        <span>Final year project · AI Interview Prep & Analytics</span>
      </footer>
    </div>
  );
}