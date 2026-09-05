import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { FaEnvelope, FaLock, FaArrowRight } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/login", { email, password });
      login(res.data.access_token, res.data.user);
      navigate("/interview");
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-navy-600 text-white flex items-center justify-center px-6 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_40%,transparent_100%)]" />
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="flex items-center gap-2 font-semibold text-lg mb-8">
          <span className="text-teal-400">◆</span> InterviewIQ
        </Link>
        <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
        <p className="text-navy-100/60 text-sm mb-8">Log in to start your mock interview.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-navy-100/50 mb-1.5">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-100/30 text-sm" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-navy-500/50 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors"
                placeholder="you@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-navy-100/50 mb-1.5">Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-100/30 text-sm" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-navy-500/50 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-teal-400 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-3 font-semibold shadow-lg shadow-teal-500/20 hover:-translate-y-0.5 transition-transform disabled:opacity-60 disabled:translate-y-0"
          >
            {loading ? "Logging in..." : <>Log In <FaArrowRight className="text-sm" /></>}
          </button>
        </form>

        <p className="text-sm text-navy-100/50 mt-6 text-center">
          Don't have an account?{" "}
          <Link to="/signup" className="text-teal-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}