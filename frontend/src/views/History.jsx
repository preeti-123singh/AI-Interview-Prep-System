import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaChevronDown, FaHistory, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function formatDate(dateString) {
  // Ensure the string is treated as UTC if it has no timezone marker
  const iso = dateString.endsWith("Z") ? dateString : dateString + "Z";
  const date = new Date(iso);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ScorePill({ label, value }) {
  return (
    <div className="rounded-lg bg-navy-600/60 px-3 py-2.5 text-center min-w-[90px]">
      <div className="text-lg font-bold text-white">{value}</div>
      <div className="text-[10px] text-navy-100/50 mt-0.5">{label}</div>
    </div>
  );
}

function SessionCard({ session }) {
  const [expanded, setExpanded] = useState(false);
  const questions = session.questions_data || [];

  return (
    <div className="rounded-xl border border-white/10 bg-navy-500/40 overflow-hidden mb-3">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="text-white font-medium">{formatDate(session.created_at)}</p>
          <p className="text-navy-100/50 text-xs mt-0.5">
            Session #{session.id} &middot; {questions.length} questions
          </p>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FaChevronDown className="text-navy-100/40 text-xs" />
        </motion.span>
      </button>

      <div className="grid grid-cols-5 gap-3 px-5 pb-4">
        <ScorePill label="Confidence" value={session.overall_confidence} />
        <ScorePill label="Clarity" value={session.overall_clarity} />
        <ScorePill label="Pacing" value={session.overall_pacing} />
        <ScorePill label="Filler Ctrl" value={session.filler_control} />
        <ScorePill label="Engagement" value={session.engagement} />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-2.5 border-t border-white/10 pt-4">
              {questions.map((q, idx) => (
                <div key={idx} className="rounded-lg bg-navy-600/50 px-4 py-3.5">
                  <p className="text-xs text-teal-400 font-mono tracking-wide mb-1.5">
                    Q{idx + 1}: {q.question}
                  </p>
                  <p className="text-sm text-navy-100/70 leading-relaxed italic">
                    {q.transcript || q.answer_text || "No speech was captured for this question."}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function History() {
  const navigate = useNavigate();
  const { token, logout } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get("http://localhost:8000/interviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSessions(response.data);
      } catch (err) {
        console.error(err);
        setError("Could not load your interview history. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchHistory();
  }, [token]);

  return (
    <div className="relative min-h-screen bg-navy-600 text-white overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]" />

      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 text-sm text-navy-100/60 hover:text-white transition-colors">
          <FaArrowLeft /> Home
        </Link>
        <button
          onClick={() => {
            logout();
            navigate("/login");
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-medium hover:border-red-400 transition-colors"
        >
          <FaSignOutAlt className="text-xs" /> Logout
        </button>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-10 py-8">
        <div className="flex items-center gap-3 mb-8">
          <FaHistory className="text-teal-400 text-xl" />
          <h1 className="text-2xl font-bold text-white">Interview History</h1>
        </div>

        {loading && <p className="text-navy-100/50 text-center mt-16">Loading your past sessions...</p>}

        {!loading && error && <p className="text-red-400 text-center mt-16">{error}</p>}

        {!loading && !error && sessions.length === 0 && (
          <div className="text-center mt-16">
            <p className="text-white text-lg font-medium">No interviews yet</p>
            <p className="text-navy-100/50 text-sm mt-2">
              Complete a mock interview to see your history here.
            </p>
            <Link
              to="/interview"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-semibold mt-6"
            >
              Start an Interview
            </Link>
          </div>
        )}

        {!loading && !error && sessions.map((session) => <SessionCard key={session.id} session={session} />)}
      </div>
    </div>
  );
}