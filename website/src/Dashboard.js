import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import { authFetch } from "./api";

const UploadSection = ({ refreshFiles }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");

  const handleUpload = async () => {
    if (!file) { setStatusType("error"); setStatus("Please select a file first."); return; }
    const formData = new FormData();
    formData.append("file", file);
    setStatus("Uploading..."); setStatusType("");
    try {
      const response = await authFetch("/api/storage/file/upload", { method: "POST", body: formData });
      const data = await response.json();
      setStatus(data.message || "Upload complete.");
      setStatusType(response.ok ? "success" : "error");
      if (response.ok) refreshFiles();
    } catch {
      setStatus("Upload failed."); setStatusType("error");
    }
  };

  return (
    <div style={{ marginTop: "20px", padding: "15px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
      <h4 style={{ margin: "0 0 10px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>Upload a File</h4>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ fontSize: "13px" }} />
        <button onClick={handleUpload} style={styles.actionBtn}>Upload</button>
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
  const [deleteFileConfirm, setDeleteFileConfirm] = useState(null);
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renameFileValue, setRenameFileValue] = useState("");

  const [folders, setFolders] = useState([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [folderMsg, setFolderMsg] = useState({ text: "", type: "" });
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderContents, setFolderContents] = useState([]);
  const [contentsLoading, setContentsLoading] = useState(false);

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const navigate = useNavigate();

  const showMsg = (text, type = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: "", type: "" }), 3000);
  };

  const showFolderMsg = (text, type = "success") => {
    setFolderMsg({ text, type });
    setTimeout(() => setFolderMsg({ text: "", type: "" }), 3500);
  };

  const fetchContents = () => {
    setFetchError("");
    authFetch("/files")
      .then((res) => {
        if (res.status === 401) throw new Error("unauthorized");
        if (!res.ok) throw new Error("server error");
        return res.json();
      })
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch((err) => setFetchError(
        err.message === "unauthorized"
          ? "Session expired — please log out and log back in."
          : "Could not load files. Is the server running?"
      ))
      .finally(() => setLoading(false));
  };

  const fetchFolders = () => {
    setFoldersLoading(true);
    authFetch("/api/storage/folder/list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFolders(data);
        else if (Array.isArray(data.folders)) setFolders(data.folders);
        else setFolders([]);
      })
      .catch(() => showFolderMsg("Could not load folders.", "error"))
      .finally(() => setFoldersLoading(false));
  };

  const openFolder = (folder) => {
    setSelectedFolder(folder);
    setContentsLoading(true);
    setFolderContents([]);
    authFetch(`/api/storage/folder/list/${folder.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFolderContents(data);
        else if (Array.isArray(data.contents)) setFolderContents(data.contents);
        else if (Array.isArray(data.files)) setFolderContents(data.files);
        else setFolderContents([]);
      })
      .catch(() => showFolderMsg("Could not load folder contents.", "error"))
      .finally(() => setContentsLoading(false));
  };

  useEffect(() => {
    fetchContents();
    fetchFolders();
  }, []);

  const handleDeleteFile = async (file) => {
    if (deleteFileConfirm !== file.id) {
      setDeleteFileConfirm(file.id);
      return;
    }
    setDeleteFileConfirm(null);
    try {
      const response = await authFetch(`/delete/${file.id}`, { method: "DELETE" });
      const data = await response.json();
      showMsg(data.message || "File deleted.", response.ok ? "success" : "error");
      if (response.ok) fetchContents();
    } catch {
      showMsg("Delete failed.", "error");
    }
  };

  const handleRenameFile = async (file) => {
    if (!renameFileValue.trim()) { showMsg("Enter a new name.", "error"); return; }
    try {
      const response = await authFetch("/api/storage/file/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: file.id, name: renameFileValue.trim() }),
      });
      const data = await response.json();
      showMsg(data.message || "File renamed.", response.ok ? "success" : "error");
      if (response.ok) { setRenamingFileId(null); setRenameFileValue(""); fetchContents(); }
    } catch {
      showMsg("Rename failed.", "error");
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const response = await authFetch(`/download/${file.id}`);
      if (!response.ok) { showMsg("Download failed.", "error"); return; }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      showMsg("Download failed.", "error");
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) { showFolderMsg("Enter a folder name.", "error"); return; }
    try {
      const response = await authFetch("/api/storage/folder/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_folder_id: null, name: newFolderName.trim() }),
      });
      const data = await response.json();
      showFolderMsg(data.message || "Folder created.", response.ok ? "success" : "error");
      if (response.ok) { setNewFolderName(""); setShowNewFolder(false); fetchFolders(); }
    } catch {
      showFolderMsg("Failed to create folder.", "error");
    }
  };

  const renameFolder = async (folder) => {
    if (!renameValue.trim()) { showFolderMsg("Enter a new name.", "error"); return; }
    try {
      const response = await authFetch("/api/storage/folder/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id, name: renameValue.trim() }),
      });
      const data = await response.json();
      showFolderMsg(data.message || "Folder renamed.", response.ok ? "success" : "error");
      if (response.ok) { setRenamingId(null); setRenameValue(""); fetchFolders(); }
    } catch {
      showFolderMsg("Failed to rename folder.", "error");
    }
  };

  const deleteFolder = async (folder) => {
    try {
      const response = await authFetch("/api/storage/folder/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder_id: folder.id }),
      });
      const data = await response.json();
      showFolderMsg(data.message || "Folder deleted.", response.ok ? "success" : "error");
      if (response.ok) {
        fetchFolders();
        if (selectedFolder?.id === folder.id) setSelectedFolder(null);
      }
    } catch {
      showFolderMsg("Failed to delete folder.", "error");
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
        <section style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: "700" }}>
              {selectedFolder ? (
                <span>
                  <button
                    onClick={() => setSelectedFolder(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "13px", padding: 0, marginRight: "6px" }}
                  >
                    ← Folders
                  </button>
                  / {selectedFolder.name}
                </span>
              ) : "Folders"}
            </h3>
            {!selectedFolder && !showNewFolder && (
              <button onClick={() => setShowNewFolder(true)} style={styles.smallActionBtn}>
                + New Folder
              </button>
            )}
          </div>

          {folderMsg.text && (
            <p style={{ margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: folderMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
              {folderMsg.text}
            </p>
          )}

          {showNewFolder && !selectedFolder && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
                placeholder="Folder name"
                style={{ ...styles.inlineInput, flex: 1 }}
              />
              <button onClick={createFolder} style={styles.smallActionBtn}>Create</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={styles.cancelBtn}>Cancel</button>
            </div>
          )}

          {selectedFolder ? (
            contentsLoading ? (
              <p style={{ color: "#888", fontSize: "13px" }}>Loading contents...</p>
            ) : folderContents.length > 0 ? (
              <ul style={styles.list}>
                {folderContents.map((item) => (
                  <li key={item.id} style={styles.listItem}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "16px" }}>{item.type === "folder" ? "📁" : "📄"}</span>
                      <div>
                        <span style={{ fontWeight: "600", fontSize: "13px" }}>{item.name}</span>
                        {item.size != null && (
                          <span style={{ marginLeft: "8px", fontSize: "11px", color: "#888" }}>
                            {(item.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#888", fontSize: "13px" }}>This folder is empty.</p>
            )
          ) : foldersLoading ? (
            <p style={{ color: "#888", fontSize: "13px" }}>Loading folders...</p>
          ) : folders.length > 0 ? (
            <ul style={styles.list}>
              {folders.map((folder) => (
                <li key={folder.id} style={styles.listItem}>
                  {renamingId === folder.id ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center" }}>
                      <span style={{ fontSize: "16px" }}>📁</span>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") renameFolder(folder); if (e.key === "Escape") { setRenamingId(null); setRenameValue(""); } }}
                        style={{ ...styles.inlineInput, flex: 1 }}
                      />
                      <button onClick={() => renameFolder(folder)} style={styles.smallActionBtn}>Save</button>
                      <button onClick={() => { setRenamingId(null); setRenameValue(""); }} style={styles.cancelBtn}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                        onClick={() => openFolder(folder)}
                      >
                        <span style={{ fontSize: "16px" }}>📁</span>
                        <span style={{ fontWeight: "600", fontSize: "13px" }}>{folder.name || folder.folder_name}</span>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button onClick={() => openFolder(folder)} style={styles.folderBtn}>Open</button>
                        <button
                          onClick={() => { setRenamingId(folder.id); setRenameValue(folder.name || folder.folder_name || ""); }}
                          style={styles.folderBtn}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => deleteFolder(folder)}
                          style={{ ...styles.folderBtn, color: "#b91c1c", borderColor: "#fca5a5" }}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !showNewFolder && (
              <p style={{ color: "#888", fontSize: "13px" }}>
                No folders yet. Click <strong>+ New Folder</strong> to create one.
              </p>
            )
          )}
        </section>

        <section style={styles.card}>
          <h3 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: "700" }}>Files</h3>
          <ul style={styles.list}>
            {files.length > 0 ? (
              files.map((file) => (
                <li key={file.id} style={styles.listItem}>
                  {renamingFileId === file.id ? (
                    <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center" }}>
                      <input
                        autoFocus
                        value={renameFileValue}
                        onChange={(e) => setRenameFileValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameFile(file);
                          if (e.key === "Escape") { setRenamingFileId(null); setRenameFileValue(""); }
                        }}
                        style={{ ...styles.inlineInput, flex: 1 }}
                      />
                      <button onClick={() => handleRenameFile(file)} style={styles.smallActionBtn}>Save</button>
                      <button onClick={() => { setRenamingFileId(null); setRenameFileValue(""); }} style={styles.cancelBtn}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span style={{ fontWeight: "600", fontSize: "13px" }}>{file.name}</span>
                        {file.size != null && (
                          <span style={{ marginLeft: "8px", fontSize: "12px", color: "#888" }}>
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button onClick={() => handleDownloadFile(file)} style={styles.smallBtn}>Download</button>
                        <button
                          onClick={() => { setRenamingFileId(file.id); setRenameFileValue(file.name); setDeleteFileConfirm(null); }}
                          style={{ ...styles.smallBtn, color: "#2563eb" }}
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file)}
                          style={{
                            ...styles.smallBtn,
                            color: deleteFileConfirm === file.id ? "white" : "red",
                            background: deleteFileConfirm === file.id ? "#b91c1c" : "transparent",
                            borderRadius: "6px",
                            padding: deleteFileConfirm === file.id ? "4px 8px" : "0",
                          }}
                        >
                          {deleteFileConfirm === file.id ? "Confirm" : "Delete"}
                        </button>
                        {deleteFileConfirm === file.id && (
                          <button
                            onClick={() => setDeleteFileConfirm(null)}
                            style={{ ...styles.smallBtn, color: "#64748b", fontSize: "11px" }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </>
                  )}
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
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#666" }}>System Online</p>
            <button onClick={() => navigate("/admin")} style={styles.adminAction}>
              Manage User Accounts
            </button>
            <button onClick={() => navigate("/monitoring")} style={styles.adminAction}>
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
  list: { listStyle: "none", padding: 0, margin: 0 },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 0",
    borderBottom: "1px solid #eee",
    gap: "8px",
  },
  smallBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    marginLeft: "4px",
    fontSize: "13px",
  },
  actionBtn: { marginLeft: "10px", padding: "6px 12px", cursor: "pointer" },
  smallActionBtn: {
    padding: "6px 14px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  cancelBtn: {
    padding: "6px 12px",
    background: "white",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },
  folderBtn: {
    padding: "5px 10px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  inlineInput: {
    padding: "7px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: "7px",
    fontSize: "13px",
    outline: "none",
  },
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
