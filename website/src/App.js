import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { clearToken } from "./api";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Monitoring from "./Monitoring";
import Admin from "./Admin";
import Settings from "./Settings";

//routes and auth state management
export default function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    clearToken();
    setUser(null);
  };

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
              <Dashboard user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/monitoring"
          element={
            user ? (
              <Monitoring user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user ? (
              <Admin user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/settings"
          element={
            user ? (
              <Settings user={user} onLogout={handleLogout} />
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

const styles = {
  authPage: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1d21",
    background: "linear-gradient(135deg, #1a1d21 0%, #2c3e50 100%)",
  },
  loginCard: {
    padding: "40px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
    width: "350px",
    textAlign: "center",
  },
  iconCircle: { fontSize: "40px", marginBottom: "10px" },
  loginTitle: {
    margin: "0 0 5px 0",
    color: "#2c3e50",
    fontSize: "24px",
    fontWeight: "700",
  },
  loginSubtitle: { margin: "0 0 25px 0", color: "#7f8c8d", fontSize: "14px" },
  formStack: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: {
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "bold",
    color: "#34495e",
    textTransform: "uppercase",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #dcdde1",
    fontSize: "16px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  loginBtn: {
    padding: "14px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
    marginTop: "10px",
  },
  dashboardContainer: {
    padding: "20px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid #ddd",
    paddingBottom: "15px",
    marginBottom: "20px",
  },
  userBadge: {
    background: "#d1d8e0",
    padding: "5px 15px",
    borderRadius: "15px",
    fontWeight: "bold",
  },
  logoutBtn: {
    cursor: "pointer",
    padding: "5px 10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
  },
  mainContent: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" },
  card: {
    padding: "20px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  list: { listStyle: "none", padding: 0 },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
  },
  smallBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    marginLeft: "10px",
  },
  adminAction: {
    display: "block",
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    background: "#e74c3c",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
