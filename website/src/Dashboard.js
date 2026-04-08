import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { useNavigate } from 'react-router-dom';

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

  const navigate = useNavigate();

  const fetchFiles = () => {
    fetch("http://127.0.0.1:5000/files")
      .then((res) => res.json())
      .then((data) => setFiles(data.files || []))
      .catch((err) => console.error("Error:", err));
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (fileName) => {
    if (!window.confirm(`Are you sure you want to delete ${fileName}?`)) return;
    try {
      const response = await fetch(`http://127.0.0.1:5000/delete/${fileName}`, {
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
      <Navbar user={user} onLogout={onLogout} />
      <main style={styles.mainContent}>
        <section style={styles.card}>
          <h3>File Explorer</h3>
          <ul style={styles.list}>
            {files.length > 0 ? (
              files.map((fileName, index) => (
                <li key={index} style={styles.listItem}>
                  <span>📄 {fileName}</span>
                  <div>
                    <button
                      onClick={() =>
                        window.open(
                          `http://127.0.0.1:5000/download/${fileName}`,
                        )
                      }
                      style={styles.smallBtn}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(fileName)}
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
          <section style={{ ...styles.card, borderTop: "4px solid red" }}>
            <h3 style={{ margin: "0 0 12px" }}>Admin Quick Access</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>
              <span style={{ color: "#2ecc71", marginRight: "6px" }}>●</span>
              System Online
            </p>
            <button
              onClick={() => (navigate ("/admin"))}
              style={styles.adminAction}
            >
              Manage User Accounts
            </button>
            <button
              onClick={() => (navigate("/monitoring"))}
              style={styles.adminAction}
            >
              View System Monitoring
            </button>
          </section>
        )}
      </main>
    </div>
  );
};

const styles = {
  dashboardContainer: {
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f4f7f6",
    minHeight: "100vh",
  },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "30px",
    padding: "24px",
  },
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
  actionBtn: { marginLeft: "10px", padding: "6px 12px", cursor: "pointer" },
  adminAction: {
    display: "block",
    width: "100%",
    marginTop: "10px",
    padding: "10px",
    background: "#e35555",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
  },
};

export default Dashboard;
