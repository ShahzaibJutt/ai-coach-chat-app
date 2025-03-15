import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import { AuthProvider } from './contexts/AuthContext';
import { StreamChatProvider } from './contexts/StreamChatContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <StreamChatProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            {/* Redirect root to dashboard if logged in, otherwise to login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            {/* Default fallback route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </StreamChatProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
