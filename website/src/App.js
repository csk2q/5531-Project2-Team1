import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { clearToken, getToken, getStoredUser, storeUser, clearStoredUser } from "./api";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Monitoring from "./Monitoring";
import Admin from "./Admin";
import Settings from "./Settings";

export default function App() {
  // restore session from localStorage on refresh if a valid token + stored user exist
  const [user, setUser] = useState(() => {
    const token = getToken();
    const stored = getStoredUser();
    return token && stored ? stored : null;
  });

  const handleLogin = (userData) => {
    storeUser(userData);
    setUser(userData);
  };

  const handleLogout = () => {
    clearToken();
    clearStoredUser();
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/monitoring"
          element={user ? <Monitoring user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/admin"
          element={user ? <Admin user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/settings"
          element={user ? <Settings user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="*"
          element={
            <div style={{ textAlign: "center", padding: "80px", fontFamily: "Arial, sans-serif" }}>
              <h2 style={{ fontSize: "48px", margin: "0 0 8px" }}>404</h2>
              <p style={{ color: "#888" }}>Page not found.</p>
              <a href="/" style={{ color: "#1d4ed8", fontSize: "14px" }}>Go home</a>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
