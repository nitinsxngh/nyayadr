import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Intake from './pages/Intake';
import Session from './pages/Session';
import Review from './pages/Review';
import Report from './pages/Report';
import SessionsArchive from './pages/SessionsArchive';
import './styles/index.css';

// Import Google Font (Adding link in component for simplicity in prototype, preferably done in index.html)
const FontLink = () => (
  <style>
    {`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');`}
  </style>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <FontLink />
        <div className="app-container">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/intake" replace />} />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute>
                  <SessionsArchive />
                </ProtectedRoute>
              }
            />
            <Route
              path="/intake"
              element={
                <ProtectedRoute>
                  <Intake />
                </ProtectedRoute>
              }
            />
            <Route
              path="/session"
              element={
                <ProtectedRoute>
                  <Session />
                </ProtectedRoute>
              }
            />
            <Route
              path="/review"
              element={
                <ProtectedRoute>
                  <Review />
                </ProtectedRoute>
              }
            />
            <Route
              path="/report"
              element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
