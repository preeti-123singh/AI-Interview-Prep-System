import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './views/LandingPage';
import InterviewSession from './views/InterviewSession';
import ResultsDashboard from './views/ResultsDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/interview" element={<InterviewSession />} />
        <Route path="/results" element={<ResultsDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;