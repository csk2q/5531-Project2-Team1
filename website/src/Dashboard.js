import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./api";

const UploadSection = ({ refreshFiles }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState(""); // "success" | "error" | ""

  const handleUpload = async () => {
    if (!file) {
      setStatusType("error");
      setStatus("Please select a file first.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setStatus("Uploading...");
    setStatusType("");
    try {
      const response = await authFetch("/api/storage/file/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setStatus(data.message || "Upload complete.");
      setStatusType(response.ok ? "success" : "error");
      if (response.ok) refreshFiles();
    } catch {
      setStatus("Upload failed.");
      setStatusType("error");
    }
  };

  return (
    <div style={{ marginTop: "20px", padding: "15px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>Upload a File</h4>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ fontSize: "13px" }} />
        <button onClick={handleUpload} style={styles.actionBtn}>
          Upload
        </button>
      </div>
      {status && (
        <p style={{ margin: "8px 0 0", fontSize: "13px", color: statusType === "error" ? "#b91c1c" : statusType === "success" ? "#15803d" : "#64748b" }}>
          {status}
        </p>
      )}
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [actionMsg, setActionMsg] = useState({ text: "", type: "" });

  const showMsg = (text, type = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: "", type: "" }), 3000);
  };

  const navigate = useNavigate();

  const fetchContents = () => {
    setFetchError("");
    authFetch("/files")
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then((data) => {
        setFiles(Array.isArray(data) ? data : []);
      })
      .catch(() => setFetchError("Could not load files. Is the server running?"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    try {
      const response = await authFetch(`/delete/${file.id}`, { method: "DELETE" });
      const data = await response.json();
      showMsg(data.message || "File deleted.");
      fetchContents();
    } catch {
      showMsg("Delete failed.", "error");
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await authFetch(`/download/${file.id}`);
      if (!response.ok) { showMsg("Download failed.", "error"); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showMsg("Download failed.", "error");
    }
  };

  if (loading) {
    return (
      <div style={styles.dashboardContainer}>
        <Navbar user={user} onLogout={onLogout} />
        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
          <div style={styles.spinner} />
          <p>Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      <Navbar user={user} onLogout={onLogout} />
      {fetchError && <div style={styles.errorBanner}>{fetchError}</div>}
      {actionMsg.text && (
        <div style={{ ...styles.errorBanner, background: actionMsg.type === "error" ? "#fef2f2" : "#f0fdf4", color: actionMsg.type === "error" ? "#b91c1c" : "#15803d", borderBottom: `1px solid ${actionMsg.type === "error" ? "#fca5a5" : "#86efac"}` }}>
          {actionMsg.text}
        </div>
      )}
      <div style={styles.pageHeader}>
        <div>
          <h2 style={styles.pageTitle}>File Manager</h2>
          <p style={styles.pageSubtitle}>Manage your files and folders</p>
        </div>
      </div>
      <main style={styles.mainContent}>
        {/* Folders — coming soon */}
        <section style={styles.card}>
          <h3>Folders</h3>
          <p style={{ color: "#888", fontSize: "13px", margin: "0 0 8px" }}>
            Folder management is not yet available.
          </p>
        </section>

        {/* Files */}
        <section style={styles.card}>
          <h3>Files</h3>
          <ul style={styles.list}>
            {files.length > 0 ? (
              files.map((file) => (
                <li key={file.id} style={styles.listItem}>
                  <div>
                    <span style={{ fontWeight: "600" }}>{file.name}</span>
                    {file.size != null && (
                      <span style={{ marginLeft: "8px", fontSize: "12px", color: "#888" }}>
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    )}
                  </div>
                  <div>
                    <button
                      onClick={() => handleDownloadFile(file)}
                      style={styles.smallBtn}
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      style={{ ...styles.smallBtn, color: "red" }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))
            ) : (
              <p style={{ color: "#888", fontSize: "13px" }}>No files found on server.</p>
            )}
          </ul>
          <UploadSection refreshFiles={fetchContents} />
        </section>

        {user.role === "admin" && (
          <section style={{ ...styles.card, borderTop: "4px solid red" }}>
            <h3 style={{ margin: "0 0 12px" }}>Admin Quick Access</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>
              System Online
            </p>
            <button
              onClick={() => navigate("/admin")}
              style={styles.adminAction}
            >
              Manage User Accounts
            </button>
            <button
              onClick={() => navigate("/monitoring")}
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
  pageHeader: {
    padding: "20px 24px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  pageTitle: { margin: "0 0 2px", fontSize: "20px", fontWeight: "700", color: "#1e293b" },
  pageSubtitle: { margin: 0, fontSize: "13px", color: "#94a3b8" },
  mainContent: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
    padding: "16px 24px 24px",
  },
  card: {
    padding: "20px",
    background: "white",
    borderRadius: "8px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid #ddd",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto 12px",
  },
  errorBanner: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: "12px 24px",
    fontSize: "14px",
    borderBottom: "1px solid #fca5a5",
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
