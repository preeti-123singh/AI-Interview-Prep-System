import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  FaArrowLeft,
  FaRedo,
  FaChevronDown,
  FaLightbulb,
  FaTrophy,
} from "react-icons/fa";

function average(arr, key) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((sum, d) => sum + d[key], 0) / arr.length);
}

function buildRecommendations(data) {
  const recs = [];
  const avgConfidence = average(data, "confidence");
  const avgClarity = average(data, "clarity");
  const avgPace = average(data, "pace");
  const totalFillers = data.reduce((s, d) => s + d.fillerCount, 0);
  const totalWords = data.reduce((s, d) => s + d.wordCount, 0);
  const fillerRatio = totalWords > 0 ? totalFillers / totalWords : 0;

  if (fillerRatio > 0.06) {
    recs.push({
      title: "Cut down on filler words",
      detail: `You used ${totalFillers} filler word${totalFillers === 1 ? "" : "s"} across this session. Try pausing silently instead of saying "um" or "like" — it reads as more confident.`,
    });
  }
  if (avgPace > 0 && avgPace < 110) {
    recs.push({
      title: "Pick up your pace slightly",
      detail: `Your average pace was ${avgPace} words/minute, a bit slow for an interview setting. Aim for 120-150 WPM to sound more engaged.`,
    });
  } else if (avgPace > 170) {
    recs.push({
      title: "Slow down a little",
      detail: `Your average pace was ${avgPace} words/minute — on the faster side. Slowing down slightly can make answers easier to follow.`,
    });
  }
  if (avgClarity < 60) {
    recs.push({
      title: "Structure your answers more clearly",
      detail: "Try the STAR method (Situation, Task, Action, Result) to keep answers focused and easy to follow.",
    });
  }
  if (avgConfidence >= 80 && fillerRatio <= 0.06) {
    recs.push({
      title: "Strong session overall",
      detail: "Your confidence and filler-word control were both solid this round. Keep practicing under time pressure to build consistency.",
    });
  }
  if (recs.length === 0) {
    recs.push({
      title: "Solid, balanced performance",
      detail: "No major red flags this session — keep practicing across different question types to build range.",
    });
  }
  return recs;
}

function QuestionCard({ item, index, isOpen, onToggle }) {
  return (
    <div className="rounded-xl border border-white/10 bg-navy-500/40 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 h-7 w-7 rounded-full bg-navy-600 flex items-center justify-center font-mono text-[11px] text-teal-400">
            {index + 1}
          </span>
          <span className="text-sm text-white/90 truncate">{item.question}</span>
        </div>
        <div className="flex items-center gap-4 shrink-0 pl-4">
          <span className="hidden sm:block font-mono text-[11px] text-navy-100/50">
            {item.wordCount} words
          </span>
          <span className="font-mono text-xs text-teal-400 font-medium">{item.confidence}%</span>
          <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <FaChevronDown className="text-navy-100/40 text-xs" />
          </motion.span>
        </div>
      </button>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.25 }}
          className="px-5 pb-5"
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              ["Confidence", item.confidence, "%"],
              ["Clarity", item.clarity, "%"],
              ["Pace", item.pace, " WPM"],
            ].map(([label, val, suffix]) => (
              <div key={label} className="rounded-lg bg-navy-600/60 px-3 py-2.5 text-center">
                <div className="text-lg font-bold text-white">
                  {val}
                  <span className="text-xs text-navy-100/50">{suffix}</span>
                </div>
                <div className="text-[10px] text-navy-100/50 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-navy-100/40 mb-1.5 font-mono tracking-wide">YOUR ANSWER</p>
          <p className="text-sm text-navy-100/70 leading-relaxed italic">
            {item.transcript ? `"${item.transcript}"` : "No speech was captured for this question."}
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default function ResultsDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("interviewResults");
      if (raw) setData(JSON.parse(raw));
      else setData([]);
    } catch (e) {
      setData([]);
    }
  }, []);

  if (data === null) return null;

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-navy-600 text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-3">No session data yet</h1>
          <p className="text-navy-100/60 mb-8">
            Complete a mock interview first and your results will show up here automatically.
          </p>
          <Link
            to="/interview"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-semibold"
          >
            Start an Interview
          </Link>
        </div>
      </div>
    );
  }

  const avgConfidence = average(data, "confidence");
  const avgClarity = average(data, "clarity");
  const avgPace = average(data, "pace");
  const overallScore = Math.round((avgConfidence + avgClarity) / 2);

  const radarData = [
    { skill: "Confidence", value: avgConfidence },
    { skill: "Clarity", value: avgClarity },
    { skill: "Pacing", value: Math.max(0, 100 - Math.abs(avgPace - 135) * 0.6) },
    {
      skill: "Filler Control",
      value: Math.max(
        0,
        100 - (data.reduce((s, d) => s + d.fillerCount, 0) / Math.max(1, data.reduce((s, d) => s + d.wordCount, 0))) * 400
      ),
    },
    { skill: "Engagement", value: Math.min(100, average(data, "wordCount") / 1.3) },
  ];

  const trendData = data.map((d, i) => ({ name: `Q${i + 1}`, Confidence: d.confidence, Clarity: d.clarity }));
  const recommendations = buildRecommendations(data);

  return (
    <div className="relative min-h-screen bg-navy-600 text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]" />

      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 text-sm text-navy-100/60 hover:text-white transition-colors">
          <FaArrowLeft /> Home
        </Link>
        <button
          onClick={() => navigate("/interview")}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:border-teal-400 transition-colors"
        >
          <FaRedo className="text-xs" /> Retake Interview
        </button>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-4 mb-8"
        >
          <div>
            <span className="font-mono text-xs tracking-widest text-teal-400">SESSION COMPLETE</span>
            <h1 className="text-3xl font-bold mt-1">Your Performance Summary</h1>
            <p className="text-navy-100/50 text-sm mt-1">{data.length} questions answered</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-500/50 px-6 py-4">
            <FaTrophy className="text-teal-400 text-2xl" />
            <div>
              <div className="text-3xl font-bold leading-none">{overallScore}%</div>
              <div className="text-[11px] text-navy-100/50 mt-1">Overall Score</div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-5 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-white/10 bg-navy-500/40 px-5 py-5"
          >
            <span className="block font-mono text-[11px] tracking-widest text-teal-400 mb-4">SKILL PROFILE</span>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: "#8B94A8", fontSize: 11 }} />
                  <Radar dataKey="value" stroke="#00B4D8" fill="#00B4D8" fillOpacity={0.35} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/10 bg-navy-500/40 px-5 py-5"
          >
            <span className="block font-mono text-[11px] tracking-widest text-teal-400 mb-4">
              CONFIDENCE TREND ACROSS SESSION
            </span>
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={trendData} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8B94A8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: "#8B94A8", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1B263B", border: "1px solid #2A3854", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#CADCFC" }}
                  />
                  <Line type="monotone" dataKey="Confidence" stroke="#00B4D8" strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Clarity" stroke="#48CAE4" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/10 bg-navy-500/40 px-5 py-5 mb-8"
        >
          <span className="flex items-center gap-2 font-mono text-[11px] tracking-widest text-teal-400 mb-4">
            <FaLightbulb /> RECOMMENDATIONS
          </span>
          <div className="grid md:grid-cols-2 gap-4">
            {recommendations.map((r) => (
              <div key={r.title} className="rounded-lg bg-navy-600/50 px-4 py-3.5">
                <p className="text-sm font-semibold text-white mb-1">{r.title}</p>
                <p className="text-xs text-navy-100/60 leading-relaxed">{r.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div>
          <span className="block font-mono text-[11px] tracking-widest text-teal-400 mb-3">
            QUESTION-BY-QUESTION BREAKDOWN
          </span>
          <div className="space-y-2.5">
            {data.map((item, i) => (
              <QuestionCard
                key={i}
                item={item}
                index={i}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}