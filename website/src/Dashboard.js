import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./api";

const UploadSection = ({ refreshFiles }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleUpload = async () => {
    if (!file) return alert("Please select a file first!");
    const formData = new FormData();
    formData.append("file", file);
    setStatus("Uploading...");
    try {
      const response = await authFetch(
        "/api/storage/file/upload",
        {
          method: "POST",
          body: formData,
        },
      );
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
  const [folders, setFolders] = useState([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const navigate = useNavigate();

  const fetchContents = () => {
    authFetch("/api/storage/folder/contents")
      .then((res) => res.json())
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setFolders(items.filter((i) => i.type === "folder"));
        setFiles(items.filter((i) => i.type !== "folder"));
      })
      .catch((err) => console.error("Error:", err));
  };

  useEffect(() => {
    fetchContents();
  }, []);

  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.name}?`))
      return;
    try {
      const response = await authFetch(
        `/api/storage/file/delete/${file.id}`,
        {
          method: "DELETE",
        },
      );
      const data = await response.json();
      alert(data.message);
      fetchContents();
    } catch (error) {
      alert("Delete failed.");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return alert("Please enter a folder name.");
    try {
      const response = await authFetch(
        "/api/storage/folder/create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newFolderName }),
        },
      );
      const data = await response.json();
      alert(data.message);
      setNewFolderName("");
      fetchContents();
    } catch (error) {
      alert("Failed to create folder.");
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the folder "${folder.name}"?`,
      )
    )
      return;
    try {
      const response = await authFetch(
        "/api/storage/folder/delete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: folder.id }),
        },
      );
      const data = await response.json();
      alert(data.message);
      fetchContents();
    } catch (error) {
      alert("Failed to delete folder.");
    }
  };

  const handleRenameFolder = async (folder) => {
    if (!renameValue.trim()) return alert("Please enter a new name.");
    try {
      const response = await authFetch(
        "/api/storage/folder/rename",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: folder.id, newName: renameValue }),
        },
      );
      const data = await response.json();
      alert(data.message);
      setRenamingFolder(null);
      setRenameValue("");
      fetchContents();
    } catch (error) {
      alert("Failed to rename folder.");
    }
  };

  return (
    <div style={styles.dashboardContainer}>
      <Navbar user={user} onLogout={onLogout} />
      <main style={styles.mainContent}>
        {/* Folders */}
        <section style={styles.card}>
          <h3>Folders</h3>
          <ul style={styles.list}>
            {folders.length > 0 ? (
              folders.map((folder) => (
                <li key={folder.id} style={styles.listItem}>
                  {renamingFolder === folder.id ? (
                    <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                      <input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        style={{
                          flex: 1,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #ddd",
                        }}
                      />
                      <button
                        onClick={() => handleRenameFolder(folder)}
                        style={styles.smallBtn}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRenamingFolder(null)}
                        style={{ ...styles.smallBtn, color: "gray" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span>📁 {folder.name}</span>
                      <div>
                        <button
                          onClick={() => {
                            setRenamingFolder(folder.id);
                            setRenameValue(folder.name);
                          }}
                          style={styles.smallBtn}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          style={{ ...styles.smallBtn, color: "red" }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))
            ) : (
              <p>No folders found.</p>
            )}
          </ul>
          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <input
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "14px",
              }}
            />
            <button onClick={handleCreateFolder} style={styles.actionBtn}>
              Create
            </button>
          </div>
        </section>

        {/* Files */}
        <section style={styles.card}>
          <h3>Files</h3>
          <ul style={styles.list}>
            {files.length > 0 ? (
              files.map((file) => (
                <li key={file.id} style={styles.listItem}>
                  <span>📄 {file.name}</span>
                  <div>
                    <button
                      onClick={() =>
                        window.open(
                          `/api/storage/file/download/${file.id}`,
                        )
                      }
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
              <p>No files found on server.</p>
            )}
          </ul>
          <UploadSection refreshFiles={fetchContents} />
        </section>

        {user.role === "admin" && (
          <section style={{ ...styles.card, borderTop: "4px solid red" }}>
            <h3 style={{ margin: "0 0 12px" }}>Admin Quick Access</h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>
              <span style={{ color: "#2ecc71", marginRight: "6px" }}>●</span>
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
