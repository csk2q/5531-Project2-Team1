import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Monitoring from "./Monitoring";
import Admin from "./Admin";
import Settings from "./Settings";

//routes and auth state management
export default function App() {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            !user ? <Login onLogin={setUser} /> : <Navigate to="/dashboard" />
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/monitoring"
          element={
            user ? (
              <Monitoring user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user ? (
              <Admin user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            user ? (
              <Settings user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}
