import { useState } from "react";
import { setToken } from "./api";

function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  const switchMode = (newMode) => {
    resetForm();
    setMode(newMode);
  };

  const doLogin = (data, fallbackUsername) => {
    const token = data.token || data.access_token;
    if (token) setToken(token);
    const isAdmin = data.is_admin || (data.user && data.user.is_admin) || false;
    const role = data.role || (isAdmin ? "admin" : "user");
    const name = (data.user && data.user.username) || fallbackUsername;
    onLogin({ name, role });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        doLogin(data, username);
      } else {
        setError(data.message || "Invalid username or password.");
      }
    } catch {
      setError("Can't reach server.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        // Auto-login using the token returned by register
        doLogin(data, username);
      } else {
        setError(data.message || "Registration failed.");
      }
    } catch {
      setError("Can't reach server.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "Arial, sans-serif",
  };

  return (
    <div style={{ background: "#f4f7f6", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Arial, sans-serif" }}>
      <form
        onSubmit={mode === "login" ? handleLogin : handleRegister}
        style={{ display: "flex", flexDirection: "column", gap: "12px", width: "320px", padding: "32px", background: "white", borderRadius: "12px", boxShadow: "0 2px 16px rgba(0,0,0,0.09)" }}
      >
        <div style={{ textAlign: "center", marginBottom: "4px" }}>
          <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>NAS Manager</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Sign in to manage your storage</p>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
          {["login", "register"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderLeft: m === "register" ? "1px solid #e5e7eb" : "none",
                cursor: "pointer",
                fontSize: "13px",
                background: mode === m ? "#1d4ed8" : "#f9fafb",
                color: mode === m ? "white" : "#64748b",
                fontWeight: mode === m ? "700" : "400",
                transition: "all 0.15s",
              }}
            >
              {m === "login" ? "Log In" : "Create Account"}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: "#b91c1c", background: "#fef2f2", padding: "10px", borderRadius: "8px", margin: 0, fontSize: "13px", border: "1px solid #fca5a5" }}>
            {error}
          </p>
        )}

        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} required />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
        {mode === "register" && (
          <input placeholder="Confirm Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} required />
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ padding: "10px", border: "none", borderRadius: "8px", width: "100%", background: loading ? "#93c5fd" : "#1d4ed8", color: "white", fontSize: "14px", fontWeight: "700", cursor: loading ? "not-allowed" : "pointer", transition: "background 0.15s" }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
        </button>
      </form>
    </div>
  );
}

export default Login;
