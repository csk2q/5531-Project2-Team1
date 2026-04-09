import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        onLogin({ name: username, role: "user" });
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Invalid credentials or Backend is offline.");
    }
  };

  return (
    <div style={styles.authPage}>
      <div style={styles.loginCard}>
        <div style={styles.iconCircle}></div>
        <h2 style={styles.loginTitle}>NAS Control Center</h2>
        <p style={styles.loginSubtitle}>
          Please sign in to manage your storage
        </p>

        <form onSubmit={handleSubmit} style={styles.formStack}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              placeholder="e.g. admin"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              ...styles.loginBtn,
              backgroundColor: isHovered ? "#2980b9" : "#3498db",
              transform: isHovered ? "translateY(-1px)" : "none",
            }}
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

const UploadSection = ({ refreshFiles }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");
    const formData = new FormData();
    formData.append("file", file);
    setStatus("Uploading...");

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setStatus(data.message);
      refreshFiles();
    } catch (error) {
      setStatus("Upload failed.");
    }
  };

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "15px",
        background: "#eee",
        borderRadius: "8px",
      }}
    >
      <h4>Upload to NAS</h4>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} style={styles.actionBtn}>
        Submit Upload
      </button>
      <p>{status}</p>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [files, setFiles] = useState([]);

  const fetchFiles = () => {
    fetch("http://127.0.0.1:5000/files")
      .then((res) => res.json())
      .then((data) => setFiles(data))
      .catch((err) => console.error("Error:", err));
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/delete/${fileId}`, {
        method: "DELETE",
      });
      const data = await response.json();
      alert(data.message);
      fetchFiles();
    } catch (error) {
      alert("Delete failed.");
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      <header style={styles.header}>
        <h1>NAS Drive</h1>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <span style={styles.userBadge}>
            {user.name} ({user.role})
          </span>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      <main style={styles.mainContent}>
        <section style={styles.card}>
          <h3>File Explorer</h3>
          <ul style={styles.list}>
            {files.length > 0 ? (
              files.map((file) => (
                <li key={file.id} style={styles.listItem}>
                  <span>📄 {file.name}</span>
                  <div>
                    <button
                      onClick={() =>
                        window.open(`http://127.0.0.1:5000/download/${file.id}`)
                      }
                      style={styles.smallBtn}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.name)}
                      style={{ ...styles.smallBtn, color: "red" }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <p>No files found on server.</p>
            )}
          </ul>
          <UploadSection refreshFiles={fetchFiles} />
        </section>

        {user.role === "admin" && (
          <section style={{ ...styles.card, borderTop: "5px solid red" }}>
            <h3>Admin System Panel</h3>
            <p>
              <span style={{ color: "#2ecc71", marginRight: "5px" }}>●</span>
              <strong>System Status:</strong> Online
            </p>
            <p>
              <strong>Disk Space:</strong> 450GB / 1TB
            </p>
            <button style={styles.adminAction}>Manage User Accounts</button>
            <button style={styles.adminAction}>View System Logs</button>
          </section>
        )}
      </main>
    </div>
  );
};

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
