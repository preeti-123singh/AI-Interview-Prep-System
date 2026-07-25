import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './views/LandingPage';
import InterviewSession from './views/InterviewSession';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interview" element={<InterviewSession />} />
        {/* Page 3 — Results / Analytics Dashboard — will be added here as /results */}
      </Routes>
    </Router>
  );
}

export default App;