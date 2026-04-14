import React, { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

const SHARED_VIRTUAL = "__shared__";

const UploadSection = ({ refreshFiles, folderPath }) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");

  const handleUpload = async () => {
    if (!file) { setStatusType("error"); setStatus("Please select a file first."); return; }
    const formData = new FormData();
    formData.append("file", file);
    if (folderPath) formData.append("folder", folderPath);
    setStatus("Uploading..."); setStatusType("");
    try {
      const response = await authFetch("/api/storage/file/upload", { method: "POST", body: formData });
      const data = await response.json();
      setStatus(data.message || "Upload complete.");
      setStatusType(response.ok ? "success" : "error");
      if (response.ok) { setFile(null); refreshFiles(); }
    } catch {
      setStatus("Upload failed."); setStatusType("error");
    }
  };

  return (
    <div style={s.uploadBox}>
      <h4 style={s.uploadTitle}>Upload File{folderPath ? ` to "${folderPath}"` : ""}</h4>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ fontSize: "13px" }} />
        <button onClick={handleUpload} style={s.solidBtn}>Upload</button>
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
  // Folders
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
  const [folderMsg, setFolderMsg] = useState({ text: "", type: "" });

  // Files
  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState("");
  const [actionMsg, setActionMsg] = useState({ text: "", type: "" });

  // File actions
  const [renamingFileId, setRenamingFileId] = useState(null);
  const [renameFileValue, setRenameFileValue] = useState("");
  const [deleteFileConfirm, setDeleteFileConfirm] = useState(null);

  // Sharing
  const [sharingFileId, setSharingFileId] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [filePermissions, setFilePermissions] = useState({});
  const [shareForm, setShareForm] = useState({ username: "", read: true, write: false });
  const [shareMsg, setShareMsg] = useState({ text: "", type: "" });

  const showMsg = (text, type = "success") => {
    setActionMsg({ text, type });
    setTimeout(() => setActionMsg({ text: "", type: "" }), 3000);
  };
  const showFolderMsg = (text, type = "success") => {
    setFolderMsg({ text, type });
    setTimeout(() => setFolderMsg({ text: "", type: "" }), 3000);
  };
  const showShareMsg = (text, type = "success") => {
    setShareMsg({ text, type });
    setTimeout(() => setShareMsg({ text: "", type: "" }), 3000);
  };

  const fetchFolders = () => {
    authFetch("/api/storage/folder/contents")
      .then((r) => r.json())
      .then((data) => {
        const items = Array.isArray(data.items) ? data.items : [];
        setFolders(items.filter((i) => i.is_dir));
      })
      .catch(() => {});
  };

  const fetchFiles = () => {
    setFilesLoading(true);
    setFilesError("");

    if (selectedFolder === SHARED_VIRTUAL) {
      authFetch("/api/storage/file/shared")
        .then((r) => {
          if (!r.ok) throw new Error("not_implemented");
          return r.json();
        })
        .then((data) => setFiles(Array.isArray(data) ? data : []))
        .catch((err) => {
          if (err.message === "not_implemented") setFiles([]);
          else setFilesError("Could not load shared files.");
        })
        .finally(() => setFilesLoading(false));
    } else if (selectedFolder) {
      authFetch(`/api/storage/folder/contents?path=${encodeURIComponent(selectedFolder)}`)
        .then((r) => {
          if (r.status === 401) throw new Error("unauthorized");
          return r.json();
        })
        .then((data) => {
          const items = Array.isArray(data.items) ? data.items : [];
          setFiles(items.filter((i) => !i.is_dir).map((i) => ({ id: i.name, name: i.name, size: i.size })));
        })
        .catch((err) => setFilesError(err.message === "unauthorized" ? "Session expired — please log out and log back in." : "Could not load folder contents."))
        .finally(() => setFilesLoading(false));
    } else {
      authFetch("/files")
        .then((r) => {
          if (r.status === 401) throw new Error("unauthorized");
          return r.json();
        })
        .then((data) => setFiles(Array.isArray(data) ? data : []))
        .catch((err) => setFilesError(err.message === "unauthorized" ? "Session expired — please log out and log back in." : "Could not load files. Is the server running?"))
        .finally(() => setFilesLoading(false));
    }
  };

  const fetchUsers = () => {
    authFetch("/api/users/list")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAllUsers(data);
        else if (Array.isArray(data.users)) setAllUsers(data.users);
      })
      .catch(() => {});
  };

  const fetchPermissions = (fileId) => {
    authFetch(`/api/storage/file/permissions?file_id=${fileId}`)
      .then((r) => {
        if (!r.ok) throw new Error("not_implemented");
        return r.json();
      })
      .then((data) => setFilePermissions((prev) => ({ ...prev, [fileId]: Array.isArray(data) ? data : [] })))
      .catch(() => setFilePermissions((prev) => ({ ...prev, [fileId]: [] })));
  };

  useEffect(() => { fetchFolders(); fetchUsers(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchFiles(); }, [selectedFolder]);

  // ── File actions ──────────────────────────────────────────────

  const handleDeleteFile = async (file) => {
    if (deleteFileConfirm !== file.id) { setDeleteFileConfirm(file.id); return; }
    setDeleteFileConfirm(null);
    try {
      const r = await authFetch(`/delete/${file.id}`, { method: "DELETE" });
      const data = await r.json();
      showMsg(data.message || "File deleted.", r.ok ? "success" : "error");
      if (r.ok) fetchFiles();
    } catch { showMsg("Delete failed.", "error"); }
  };

  const handleRenameFile = async (file) => {
    if (!renameFileValue.trim()) { showMsg("Enter a new name.", "error"); return; }
    try {
      const r = await authFetch(`/api/storage/file/rename/${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newFilename: renameFileValue.trim() }),
      });
      const data = await r.json();
      showMsg(data.message || "File renamed.", r.ok ? "success" : "error");
      if (r.ok) { setRenamingFileId(null); setRenameFileValue(""); fetchFiles(); }
    } catch { showMsg("Rename failed.", "error"); }
  };

  const handleDownloadFile = async (file) => {
    try {
      const r = await authFetch(`/download/${file.id}`);
      if (!r.ok) { showMsg("Download failed.", "error"); return; }
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { showMsg("Download failed.", "error"); }
  };

  // ── Folder actions ────────────────────────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) { showFolderMsg("Enter a folder name.", "error"); return; }
    try {
      const r = await authFetch("/api/storage/folder/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: newFolderName.trim() }),
      });
      const data = await r.json();
      showFolderMsg(data.message || "Folder created.", r.ok ? "success" : "error");
      if (r.ok) { setNewFolderName(""); setShowNewFolder(false); fetchFolders(); }
    } catch { showFolderMsg("Failed to create folder.", "error"); }
  };

  const renameFolder = async (oldName) => {
    if (!renameFolderValue.trim()) { showFolderMsg("Enter a new name.", "error"); return; }
    try {
      const r = await authFetch("/api/storage/folder/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: oldName, new_name: renameFolderValue.trim() }),
      });
      const data = await r.json();
      showFolderMsg(data.message || "Folder renamed.", r.ok ? "success" : "error");
      if (r.ok) {
        if (selectedFolder === oldName) setSelectedFolder(renameFolderValue.trim());
        setRenamingFolder(null); setRenameFolderValue(""); fetchFolders();
      }
    } catch { showFolderMsg("Failed to rename folder.", "error"); }
  };

  const deleteFolder = async (name) => {
    try {
      const r = await authFetch("/api/storage/folder/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: name, recursive: false }),
      });
      const data = await r.json();
      showFolderMsg(data.message || "Folder deleted.", r.ok ? "success" : "error");
      if (r.ok) { if (selectedFolder === name) setSelectedFolder(null); fetchFolders(); }
    } catch { showFolderMsg("Failed to delete folder.", "error"); }
  };

  // ── Sharing ───────────────────────────────────────────────────

  const openSharePanel = (file) => {
    setSharingFileId(file.id);
    setShareForm({ username: "", read: true, write: false });
    setShareMsg({ text: "", type: "" });
    fetchPermissions(file.id);
  };

  const addPermission = async (fileId) => {
    if (!shareForm.username) { showShareMsg("Select a user.", "error"); return; }
    try {
      const r = await authFetch("/api/storage/file/permissions/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, username: shareForm.username, read: shareForm.read, write: shareForm.write }),
      });
      if (r.ok) { showShareMsg("Permission added."); fetchPermissions(fileId); }
      else { const d = await r.json(); showShareMsg(d.message || "Failed.", "error"); }
    } catch { showShareMsg("Permissions endpoint not yet on the server — needs Flask route.", "error"); }
  };

  const removePermission = async (fileId, username) => {
    try {
      const r = await authFetch("/api/storage/file/permissions/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, username }),
      });
      if (r.ok) { showShareMsg("Permission removed."); fetchPermissions(fileId); }
      else { const d = await r.json(); showShareMsg(d.message || "Failed.", "error"); }
    } catch { showShareMsg("Permissions endpoint not yet on the server — needs Flask route.", "error"); }
  };

  const getFilePerms = (file) => {
    if (selectedFolder !== SHARED_VIRTUAL) return { read: true, write: true, isOwner: true };
    const p = (filePermissions[file.id] || []).find((x) => x.username === user?.username);
    return { read: p?.read || false, write: p?.write || false, isOwner: false };
  };

  const folderLabel =
    selectedFolder === SHARED_VIRTUAL ? "Shared with me"
    : selectedFolder ? selectedFolder
    : "All Files";

  return (
    <div style={s.page}>
      <Navbar user={user} onLogout={onLogout} />

      {actionMsg.text && (
        <div style={{ ...s.banner, background: actionMsg.type === "error" ? "#fef2f2" : "#f0fdf4", color: actionMsg.type === "error" ? "#b91c1c" : "#15803d", borderColor: actionMsg.type === "error" ? "#fca5a5" : "#86efac" }}>
          {actionMsg.text}
        </div>
      )}

      <div style={s.layout}>
        {/* ── LEFT SIDEBAR ── */}
        <aside style={s.sidebar}>
          <div style={s.sidebarTop}>
            <span style={s.sidebarHeading}>Folders</span>
            <button
              onClick={() => { setShowNewFolder(true); setNewFolderName(""); }}
              style={s.addBtn}
              title="New folder"
            >+</button>
          </div>

          {folderMsg.text && (
            <p style={{ fontSize: "12px", padding: "4px 12px", margin: 0, color: folderMsg.type === "error" ? "#b91c1c" : "#15803d", fontWeight: 600 }}>
              {folderMsg.text}
            </p>
          )}

          {showNewFolder && (
            <div style={s.newFolderBox}>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
                placeholder="Folder name"
                style={s.inlineInput}
              />
              <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                <button onClick={createFolder} style={s.tinyBtn}>Create</button>
                <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={s.tinyCancelBtn}>Cancel</button>
              </div>
            </div>
          )}

          {/* All Files */}
          <div
            style={{ ...s.folderRow, ...(selectedFolder === null ? s.folderRowActive : {}) }}
            onClick={() => setSelectedFolder(null)}
          >
            <span style={s.folderName}>All Files</span>
          </div>

          {/* Real folders */}
          {folders.map((folder) => (
            <div key={folder.name}>
              {renamingFolder === folder.name ? (
                <div style={s.newFolderBox}>
                  <input
                    autoFocus
                    value={renameFolderValue}
                    onChange={(e) => setRenameFolderValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") renameFolder(folder.name); if (e.key === "Escape") { setRenamingFolder(null); setRenameFolderValue(""); } }}
                    style={s.inlineInput}
                  />
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                    <button onClick={() => renameFolder(folder.name)} style={s.tinyBtn}>Save</button>
                    <button onClick={() => { setRenamingFolder(null); setRenameFolderValue(""); }} style={s.tinyCancelBtn}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ ...s.folderRow, ...(selectedFolder === folder.name ? s.folderRowActive : {}) }}
                  onClick={() => setSelectedFolder(folder.name)}
                >
                  <span style={{ ...s.folderName, flex: 1 }}>{folder.name}</span>
                  <div style={{ display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => { setRenamingFolder(folder.name); setRenameFolderValue(folder.name); }}
                      style={s.iconBtn} title="Rename"
                    >Edit</button>
                    <button
                      onClick={() => deleteFolder(folder.name)}
                      style={s.iconBtn} title="Delete"
                    >Del</button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Shared with me — virtual */}
          <div
            style={{ ...s.folderRow, ...s.sharedRow, ...(selectedFolder === SHARED_VIRTUAL ? s.sharedRowActive : {}) }}
            onClick={() => setSelectedFolder(SHARED_VIRTUAL)}
          >
            <span style={s.folderName}>Shared with me</span>
          </div>
        </aside>

        {/* ── MAIN PANEL ── */}
        <main style={s.main}>
          <div style={s.mainHeader}>
            <h2 style={s.mainTitle}>{folderLabel}</h2>
            <p style={s.mainSub}>
              {selectedFolder === SHARED_VIRTUAL
                ? "Files others have shared with you"
                : selectedFolder
                ? `Contents of folder "${selectedFolder}"`
                : "All files on the server"}
            </p>
          </div>

          {filesError && <div style={s.errorBox}>{filesError}</div>}

          {filesLoading ? (
            <p style={s.dimText}>Loading...</p>
          ) : files.length === 0 ? (
            <p style={s.dimText}>
              {selectedFolder === SHARED_VIRTUAL
                ? "No files have been shared with you yet."
                : "No files here yet."}
            </p>
          ) : (
            <ul style={s.fileList}>
              {files.map((file) => {
                const perms = getFilePerms(file);
                const isRenaming = renamingFileId === file.id;
                const isSharing = sharingFileId === file.id;
                const permsForFile = filePermissions[file.id] || [];

                return (
                  <li key={file.id} style={s.fileItem}>
                    {isRenaming ? (
                      <div style={{ display: "flex", gap: "8px", flex: 1, alignItems: "center" }}>
                        <input
                          autoFocus
                          value={renameFileValue}
                          onChange={(e) => setRenameFileValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameFile(file);
                            if (e.key === "Escape") { setRenamingFileId(null); setRenameFileValue(""); }
                          }}
                          style={{ ...s.inlineInput, flex: 1 }}
                        />
                        <button onClick={() => handleRenameFile(file)} style={s.tinyBtn}>Save</button>
                        <button onClick={() => { setRenamingFileId(null); setRenameFileValue(""); }} style={s.tinyCancelBtn}>Cancel</button>
                      </div>
                    ) : (
                      <div style={{ width: "100%" }}>
                        {/* File row */}
                        <div style={s.fileRow}>
                          <div style={s.fileLeft}>
                            <span style={s.fileName}>{file.name}</span>
                            {file.size != null && (
                              <span style={s.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
                            )}
                          </div>
                          <div style={s.fileActions}>
                            {perms.read && (
                              <button onClick={() => handleDownloadFile(file)} style={s.fileBtn}>
                                Download
                              </button>
                            )}
                            {perms.write && (
                              <button
                                onClick={() => {
                                  setRenamingFileId(file.id);
                                  setRenameFileValue(file.name);
                                  setDeleteFileConfirm(null);
                                  setSharingFileId(null);
                                }}
                                style={{ ...s.fileBtn, color: "#2563eb" }}
                              >
                                Rename
                              </button>
                            )}
                            {perms.isOwner && (
                              <button
                                onClick={() => isSharing ? setSharingFileId(null) : openSharePanel(file)}
                                style={{ ...s.fileBtn, color: "#7c3aed", background: isSharing ? "#f5f3ff" : "transparent", borderRadius: "6px", padding: "4px 8px" }}
                              >
                                {isSharing ? "Close" : "Share"}
                              </button>
                            )}
                            {perms.write && (
                              <>
                                <button
                                  onClick={() => handleDeleteFile(file)}
                                  style={{
                                    ...s.fileBtn,
                                    color: deleteFileConfirm === file.id ? "white" : "#b91c1c",
                                    background: deleteFileConfirm === file.id ? "#b91c1c" : "transparent",
                                    borderRadius: "6px",
                                    padding: deleteFileConfirm === file.id ? "4px 8px" : "4px 0",
                                  }}
                                >
                                  {deleteFileConfirm === file.id ? "Confirm Delete" : "Delete"}
                                </button>
                                {deleteFileConfirm === file.id && (
                                  <button
                                    onClick={() => setDeleteFileConfirm(null)}
                                    style={{ ...s.fileBtn, color: "#64748b" }}
                                  >
                                    Cancel
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Share panel */}
                        {isSharing && (
                          <div style={s.sharePanel}>
                            <p style={s.sharePanelTitle}>Manage Permissions for <strong>{file.name}</strong></p>

                            {shareMsg.text && (
                              <p style={{ fontSize: "12px", margin: "0 0 8px", fontWeight: 600, color: shareMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
                                {shareMsg.text}
                              </p>
                            )}

                            {/* Existing permissions */}
                            {permsForFile.length > 0 && (
                              <div style={{ marginBottom: "12px" }}>
                                <p style={s.shareLabel}>Current permissions</p>
                                {permsForFile.map((perm) => (
                                  <div key={perm.username} style={s.permRow}>
                                    <span style={s.permUsername}>{perm.username}</span>
                                    <div style={{ display: "flex", gap: "6px" }}>
                                      {perm.read && <span style={s.readBadge}>Read</span>}
                                      {perm.write && <span style={s.writeBadge}>Write</span>}
                                    </div>
                                    <button
                                      onClick={() => removePermission(file.id, perm.username)}
                                      style={s.removeBtn}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}

                            {permsForFile.length === 0 && (
                              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "0 0 10px" }}>
                                No permissions set yet.
                              </p>
                            )}

                            {/* Add permission */}
                            <p style={s.shareLabel}>Add permission</p>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                              <select
                                value={shareForm.username}
                                onChange={(e) => setShareForm({ ...shareForm, username: e.target.value })}
                                style={{ ...s.inlineInput, minWidth: "130px" }}
                              >
                                <option value="">— Select user —</option>
                                {allUsers
                                  .filter((u) => u.username !== user?.username)
                                  .map((u) => (
                                    <option key={u.username} value={u.username}>{u.username}</option>
                                  ))}
                              </select>
                              <label style={s.checkLabel}>
                                <input
                                  type="checkbox"
                                  checked={shareForm.read}
                                  onChange={(e) => setShareForm({ ...shareForm, read: e.target.checked })}
                                />
                                Read
                              </label>
                              <label style={s.checkLabel}>
                                <input
                                  type="checkbox"
                                  checked={shareForm.write}
                                  onChange={(e) => setShareForm({ ...shareForm, write: e.target.checked })}
                                />
                                Write
                              </label>
                              <button onClick={() => addPermission(file.id)} style={s.tinyBtn}>
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {selectedFolder !== SHARED_VIRTUAL && (
            <UploadSection
              refreshFiles={fetchFiles}
              folderPath={selectedFolder || ""}
            />
          )}
        </main>
      </div>
    </div>
  );
};

const s = {
  page: { fontFamily: "Arial, sans-serif", background: "#f4f7f6", minHeight: "100vh" },
  banner: { padding: "12px 24px", fontSize: "14px", borderBottom: "1px solid" },
  layout: { display: "flex", height: "calc(100vh - 56px)" },

  // Sidebar
  sidebar: {
    width: "220px", minWidth: "220px", background: "white",
    borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column",
    overflowY: "auto",
  },
  sidebarTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "16px 12px 10px", borderBottom: "1px solid #f1f5f9",
  },
  sidebarHeading: { fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" },
  addBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "#64748b", lineHeight: 1, padding: "0 2px" },
  newFolderBox: { padding: "8px 12px", borderBottom: "1px solid #f1f5f9" },
  folderRow: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "8px 12px", cursor: "pointer", borderRadius: "0",
    transition: "background 0.1s",
  },
  folderRowActive: { background: "#eff6ff" },
  folderIcon: { fontSize: "15px", flexShrink: 0 },
  folderName: { fontSize: "13px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: "2px 3px", opacity: 0.6 },
  sharedRow: { marginTop: "auto", borderTop: "1px solid #e5e7eb" },
  sharedRowActive: { background: "#f5f3ff" },

  // Main
  main: { flex: 1, padding: "20px 24px", overflowY: "auto" },
  mainHeader: { marginBottom: "16px" },
  mainTitle: { margin: "0 0 2px", fontSize: "18px", fontWeight: "700", color: "#1e293b" },
  mainSub: { margin: 0, fontSize: "12px", color: "#94a3b8" },
  errorBox: { background: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "12px" },
  dimText: { color: "#94a3b8", fontSize: "13px" },

  // File list
  fileList: { listStyle: "none", padding: 0, margin: "0 0 8px" },
  fileItem: {
    padding: "10px 0", borderBottom: "1px solid #f0f2f5",
  },
  fileRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
  fileLeft: { display: "flex", alignItems: "center", gap: "8px", minWidth: 0 },
  fileName: { fontWeight: "600", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileSize: { fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" },
  fileActions: { display: "flex", gap: "2px", alignItems: "center", flexShrink: 0 },
  fileBtn: { background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "600", padding: "4px 6px", color: "#374151" },

  // Share panel
  sharePanel: {
    marginTop: "10px", padding: "14px 16px",
    background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: "8px",
  },
  sharePanelTitle: { margin: "0 0 10px", fontSize: "13px", color: "#1e293b" },
  shareLabel: { margin: "0 0 6px", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" },
  permRow: { display: "flex", alignItems: "center", gap: "10px", padding: "5px 0", borderBottom: "1px solid #f0f2f5" },
  permUsername: { fontSize: "13px", fontWeight: "600", flex: 1 },
  readBadge: { fontSize: "11px", fontWeight: "700", padding: "2px 8px", background: "#eff6ff", color: "#1d4ed8", borderRadius: "9999px" },
  writeBadge: { fontSize: "11px", fontWeight: "700", padding: "2px 8px", background: "#fefce8", color: "#a16207", borderRadius: "9999px" },
  removeBtn: { fontSize: "11px", padding: "3px 8px", background: "white", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontWeight: "600" },
  checkLabel: { display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", cursor: "pointer", userSelect: "none" },

  // Upload
  uploadBox: { marginTop: "16px", padding: "14px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" },
  uploadTitle: { margin: "0 0 10px", fontSize: "13px", fontWeight: "600", color: "#374151" },

  // Shared inputs / buttons
  inlineInput: { padding: "7px 10px", border: "1px solid #e5e7eb", borderRadius: "7px", fontSize: "13px", width: "100%", boxSizing: "border-box" },
  solidBtn: { padding: "7px 16px", background: "#111", color: "white", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "600" },
  tinyBtn: { padding: "5px 12px", background: "#111", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600", whiteSpace: "nowrap" },
  tinyCancelBtn: { padding: "5px 10px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
};

export default Dashboard;
