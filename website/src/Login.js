import { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
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
        onLogin({ name: username, role: data.role });
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Cant reach server");
    }
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
        onSubmit={handleSubmit}
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
        <h2
          style={{ textAlign: "center", margin: "0 0 8px", fontSize: "20px" }}
        >
          NAS Manager
        </h2>
        {error && (
          <p
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              padding: "10px",
              borderRadius: "8px",
              margin: 0,
              fontSize: "13px",
            }}
          >
            {error}
          </p>
        )}
        <input
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "14px",
            width: "90%",
          }}
        />
        <input
          placeholder="Password"
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "14px",
            width: "90%",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            width: "100%",
          }}
        >
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;
