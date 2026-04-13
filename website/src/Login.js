import { useState } from "react";
import { setToken } from "./api";

function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        if (data.token) setToken(data.token);
        onLogin({ name: username, role: data.role });
      } else {
        setError(data.message || "Invalid username or password.");
      }
    } catch {
      setError("Can't reach server.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess("Account created! You can now log in.");
        setTimeout(() => switchMode("login"), 1500);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError("Can't reach server.");
    }
  };

  const inputStyle = {
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
    width: "90%",
  };

  return (
    <div
      style={{
        background: "#f4f7f6",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <form
        onSubmit={mode === "login" ? handleLogin : handleRegister}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "300px",
          padding: "32px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: "20px" }}>
          NAS Manager
        </h2>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #ddd" }}>
          <button
            type="button"
            onClick={() => switchMode("login")}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "13px",
              background: mode === "login" ? "#1d4ed8" : "#f9fafb",
              color: mode === "login" ? "white" : "#555",
              fontWeight: mode === "login" ? "bold" : "normal",
            }}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            style={{
              flex: 1,
              padding: "8px",
              border: "none",
              borderLeft: "1px solid #ddd",
              cursor: "pointer",
              fontSize: "13px",
              background: mode === "register" ? "#1d4ed8" : "#f9fafb",
              color: mode === "register" ? "white" : "#555",
              fontWeight: mode === "register" ? "bold" : "normal",
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <p style={{ color: "#b91c1c", background: "#fef2f2", padding: "10px", borderRadius: "8px", margin: 0, fontSize: "13px" }}>
            {error}
          </p>
        )}
        {success && (
          <p style={{ color: "#15803d", background: "#f0fdf4", padding: "10px", borderRadius: "8px", margin: 0, fontSize: "13px" }}>
            {success}
          </p>
        )}

        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        {mode === "register" && (
          <input
            placeholder="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={inputStyle}
            required
          />
        )}

        <button
          type="submit"
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "8px",
            width: "100%",
            background: "#1d4ed8",
            color: "white",
            fontSize: "14px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          {mode === "login" ? "Log In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default Login;
