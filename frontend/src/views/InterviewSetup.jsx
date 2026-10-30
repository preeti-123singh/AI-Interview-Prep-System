import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const SUGGESTIONS = [
  "Python Developer",
  "Data Science",
  "Web Development",
  "Machine Learning",
  "Java Developer",
  "HR / Behavioural",
];
const LEVELS = ["easy", "medium", "hard"];

export default function InterviewSetup() {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    if (!domain.trim()) {
      setError("Please enter your domain.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(
        "http://localhost:8000/questions/generate",
        { domain: domain.trim(), difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      sessionStorage.setItem("interviewSetup", JSON.stringify(res.data));
      navigate("/interview");
    } catch (err) {
      if (err.response && err.response.status === 401) {
        logout();
        navigate("/login");
        return;
      }
      setError("Could not generate questions. Check that the backend is running and try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy-600 text-white overflow-hidden">
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/10">
        <Link to="/" className="flex items-center gap-2 text-sm text-navy-100/60 hover:text-white transition-colors">
          <FaArrowLeft /> Back
        </Link>
        <Link to="/history" className="text-sm text-navy-100/60 hover:text-white transition-colors">
          History
        </Link>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <span className="inline-block font-mono text-[11px] tracking-widest text-teal-400 mb-3">
          INTERVIEW SETUP
        </span>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">What are you interviewing for?</h1>
        <p className="text-navy-100/60 mb-8">
          Enter your domain and difficulty. Our AI will generate questions made for you.
        </p>

        <label className="block font-mono text-[11px] tracking-widest text-teal-400 mb-2">DOMAIN</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g. Python Developer, Data Science, HR"
          maxLength={100}
          className="w-full rounded-lg bg-navy-500/50 border border-white/10 px-4 py-3 text-white placeholder-navy-100/30 focus:outline-none focus:border-teal-400"
        />

        <div className="flex flex-wrap gap-2 mt-3 mb-8">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setDomain(s)}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-navy-100/70 hover:border-teal-400 hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <label className="block font-mono text-[11px] tracking-widest text-teal-400 mb-2">DIFFICULTY</label>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {LEVELS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setDifficulty(l)}
              className={`rounded-lg border px-4 py-3 text-sm font-medium capitalize transition-colors ${
                difficulty === l
                  ? "bg-teal-500 border-teal-400 text-navy-900"
                  : "bg-navy-500/40 border-white/10 text-white hover:border-teal-400"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-semibold shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {loading ? (
            "Generating your questions..."
          ) : (
            <>
              Start Interview <FaArrowRight className="text-sm" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}