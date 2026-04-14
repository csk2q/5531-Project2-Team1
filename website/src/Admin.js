import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

function Admin({ user, onLogout }) {
  // all hooks must be declared before any conditional returns
  const [createForm, setCreateForm] = useState({ username: "", password: "" });
  const [createMsg, setCreateMsg] = useState({ text: "", type: "" });
  const [createLoading, setCreateLoading] = useState(false);

  const [modifyForm, setModifyForm] = useState({ username: "", password: "" });
  const [modifyMsg, setModifyMsg] = useState({ text: "", type: "" });
  const [modifyLoading, setModifyLoading] = useState(false);

  const [deleteUsername, setDeleteUsername] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState({ text: "", type: "" });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersMsg, setUsersMsg] = useState({ text: "", type: "" });
  const [roleLoading, setRoleLoading] = useState({});

  const [allFiles, setAllFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesMsg, setFilesMsg] = useState({ text: "", type: "" });

  const showMsg = (setter, text, type = "success") => {
    setter({ text, type });
    setTimeout(() => setter({ text: "", type: "" }), 4000);
  };

  const fetchUsers = () => {
    setUsersLoading(true);
    authFetch("/api/users/list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
        else if (Array.isArray(data.users)) setUsers(data.users);
        else setUsers([]);
      })
      .catch(() => showMsg(setUsersMsg, "Could not load user list.", "error"))
      .finally(() => setUsersLoading(false));
  };

  const fetchAllFiles = () => {
    setFilesLoading(true);
    authFetch("/files")
      .then((res) => res.json())
      .then((data) => setAllFiles(Array.isArray(data) ? data : []))
      .catch(() => showMsg(setFilesMsg, "Could not load files.", "error"))
      .finally(() => setFilesLoading(false));
  };

  // useEffect must also come before the access guard
  useEffect(() => {
    if (user?.role === "admin") {
      fetchUsers();
      fetchAllFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user?.role !== "admin") {
    return (
      <div style={{ background: "#f4f7f6", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
        <Navbar user={user} onLogout={onLogout} />
        <div style={s.page}>
          <p style={{ color: "#b91c1c", fontSize: "14px" }}>Access denied. Admins only.</p>
        </div>
      </div>
    );
  }

  const toggleRole = async (targetUser) => {
    setRoleLoading((prev) => ({ ...prev, [targetUser.username]: true }));
    try {
      const response = await authFetch("/api/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: targetUser.username,
          is_admin: !targetUser.is_admin,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        showMsg(setUsersMsg, data.message || `Role updated for ${targetUser.username}.`);
        fetchUsers();
      } else {
        showMsg(setUsersMsg, data.message || "Failed to update role.", "error");
      }
    } catch {
      showMsg(setUsersMsg, "Failed to update role.", "error");
    } finally {
      setRoleLoading((prev) => ({ ...prev, [targetUser.username]: false }));
    }
  };

  const adminDeleteFile = async (file) => {
    try {
      const response = await authFetch(`/delete/${file.id}`, { method: "DELETE" });
      const data = await response.json();
      showMsg(setFilesMsg, data.message || "File deleted.", response.ok ? "success" : "error");
      if (response.ok) fetchAllFiles();
    } catch {
      showMsg(setFilesMsg, "Delete failed.", "error");
    }
  };

  const handleCreate = async () => {
    if (!createForm.username.trim()) { showMsg(setCreateMsg, "Username is required.", "error"); return; }
    if (!createForm.password) { showMsg(setCreateMsg, "Password is required.", "error"); return; }
    setCreateLoading(true);
    try {
      const response = await authFetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      showMsg(setCreateMsg, data.message || "User created.", response.ok ? "success" : "error");
      if (response.ok) { setCreateForm({ username: "", password: "" }); fetchUsers(); }
    } catch {
      showMsg(setCreateMsg, "Failed to create user.", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleModify = async () => {
    if (!modifyForm.username.trim()) { showMsg(setModifyMsg, "Username is required.", "error"); return; }
    if (!modifyForm.password) { showMsg(setModifyMsg, "New password is required.", "error"); return; }
    setModifyLoading(true);
    try {
      const response = await authFetch("/api/users/modify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modifyForm),
      });
      const data = await response.json();
      showMsg(setModifyMsg, data.message || "User updated.", response.ok ? "success" : "error");
      if (response.ok) setModifyForm({ username: "", password: "" });
    } catch {
      showMsg(setModifyMsg, "Failed to update user.", "error");
    } finally {
      setModifyLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUsername.trim()) { showMsg(setDeleteMsg, "Username is required.", "error"); return; }
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteLoading(true);
    try {
      const response = await authFetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: deleteUsername }),
      });
      const data = await response.json();
      showMsg(setDeleteMsg, data.message || "User deleted.", response.ok ? "success" : "error");
      if (response.ok) { setDeleteUsername(""); setDeleteConfirm(false); fetchUsers(); }
    } catch {
      showMsg(setDeleteMsg, "Failed to delete user.", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ background: "#f4f7f6", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />
      <div style={s.page}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
            Admin Panel
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            Manage users, roles, and system files
          </p>
        </div>

        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>All Users</h3>
            <button onClick={fetchUsers} style={s.refreshBtn}>↻ Refresh</button>
          </div>

          {usersMsg.text && (
            <p style={{ ...s.msg, marginBottom: "12px", color: usersMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
              {usersMsg.text}
            </p>
          )}

          {usersLoading ? (
            <p style={{ color: "#888", fontSize: "13px" }}>Loading users...</p>
          ) : users.length > 0 ? (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Username</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Role</th>
                  <th style={s.th}>Storage</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username} style={s.tr}>
                    <td style={s.td}>
                      <span style={{ fontWeight: "600" }}>{u.username}</span>
                      {u.username === user?.username && (
                        <span style={s.youBadge}>you</span>
                      )}
                    </td>
                    <td style={s.td}>{u.email || "—"}</td>
                    <td style={s.td}>
                      <span style={u.is_admin ? s.adminBadge : s.userBadge}>
                        {u.is_admin ? "Admin" : "User"}
                      </span>
                    </td>
                    <td style={s.td}>
                      {u.storage_allocation != null
                        ? `${(u.storage_allocation / (1024 * 1024 * 1024)).toFixed(1)} GB`
                        : "—"}
                    </td>
                    <td style={s.td}>
                      {u.username !== user?.username && (
                        <button
                          onClick={() => toggleRole(u)}
                          disabled={roleLoading[u.username]}
                          style={u.is_admin ? s.demoteBtn : s.promoteBtn}
                        >
                          {roleLoading[u.username] ? "..." : u.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#888", fontSize: "13px" }}>
              No users found — <code>/api/users/list</code> may not be implemented yet.
            </p>
          )}
        </div>

        <div style={{ marginBottom: "8px" }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "15px", fontWeight: "700", color: "#1e293b" }}>
            User Management
          </h3>
        </div>
        <div style={s.grid}>
          <div style={s.smallCard}>
            <h3 style={s.cardTitle}>Create User</h3>
            <p style={s.cardDesc}>Add a new user account to the system.</p>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <input style={s.input} placeholder="Enter username" value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} />
            </div>
            <div style={{ ...s.field, marginTop: "10px" }}>
              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Enter password" value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} />
            </div>
            <button onClick={handleCreate} disabled={createLoading} style={{ ...s.btn, marginTop: "14px" }}>
              {createLoading ? "Creating..." : "Create User"}
            </button>
            {createMsg.text && (
              <p style={{ ...s.msg, color: createMsg.type === "error" ? "#b91c1c" : "#15803d" }}>{createMsg.text}</p>
            )}
          </div>

          <div style={s.smallCard}>
            <h3 style={s.cardTitle}>Change Password</h3>
            <p style={s.cardDesc}>Update the password for an existing user.</p>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <select style={s.input} value={modifyForm.username}
                onChange={(e) => setModifyForm({ ...modifyForm, username: e.target.value })}>
                <option value="">— Select user —</option>
                {users.map((u) => (
                  <option key={u.username} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
            <div style={{ ...s.field, marginTop: "10px" }}>
              <label style={s.label}>New Password</label>
              <input style={s.input} type="password" placeholder="Enter new password" value={modifyForm.password}
                onChange={(e) => setModifyForm({ ...modifyForm, password: e.target.value })} />
            </div>
            <button onClick={handleModify} disabled={modifyLoading} style={{ ...s.btn, marginTop: "14px" }}>
              {modifyLoading ? "Updating..." : "Update Password"}
            </button>
            {modifyMsg.text && (
              <p style={{ ...s.msg, color: modifyMsg.type === "error" ? "#b91c1c" : "#15803d" }}>{modifyMsg.text}</p>
            )}
          </div>

          <div style={{ ...s.smallCard, borderTop: "3px solid #fca5a5" }}>
            <h3 style={s.cardTitle}>Delete User</h3>
            <p style={s.cardDesc}>Permanently remove a user account.</p>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <select style={s.input} value={deleteUsername}
                onChange={(e) => { setDeleteUsername(e.target.value); setDeleteConfirm(false); }}>
                <option value="">— Select user —</option>
                {users.filter((u) => u.username !== user?.username).map((u) => (
                  <option key={u.username} value={u.username}>{u.username}</option>
                ))}
              </select>
            </div>
            {deleteConfirm && deleteUsername && (
              <div style={s.confirmBox}>
                This will permanently delete <strong>{deleteUsername}</strong>. Click Delete again to confirm.
              </div>
            )}
            <button onClick={handleDelete} disabled={deleteLoading}
              style={{ ...s.btn, marginTop: "14px", background: deleteConfirm ? "#b91c1c" : "#374151" }}>
              {deleteLoading ? "Deleting..." : deleteConfirm ? "Confirm Delete" : "Delete User"}
            </button>
            {!deleteConfirm && deleteUsername && (
              <button onClick={() => { setDeleteUsername(""); setDeleteConfirm(false); }} style={s.cancelBtn}>
                Cancel
              </button>
            )}
            {deleteMsg.text && (
              <p style={{ ...s.msg, color: deleteMsg.type === "error" ? "#b91c1c" : "#15803d" }}>{deleteMsg.text}</p>
            )}
          </div>
        </div>

        <div style={{ ...s.card, borderTop: "3px solid #3b82f6" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h3 style={{ ...s.cardTitle, margin: "0 0 2px" }}>All Files</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>System-wide file view</p>
            </div>
            <button onClick={fetchAllFiles} style={s.refreshBtn}>↻ Refresh</button>
          </div>

          {filesMsg.text && (
            <p style={{ ...s.msg, marginBottom: "12px", color: filesMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
              {filesMsg.text}
            </p>
          )}

          {filesLoading ? (
            <p style={{ color: "#888", fontSize: "13px" }}>Loading files...</p>
          ) : allFiles.length > 0 ? (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>File Name</th>
                  <th style={s.th}>Size</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allFiles.map((file) => (
                  <tr key={file.id} style={s.tr}>
                    <td style={s.td}>{file.name}</td>
                    <td style={s.td}>{file.size != null ? `${(file.size / 1024).toFixed(1)} KB` : "—"}</td>
                    <td style={s.td}>
                      <button onClick={() => adminDeleteFile(file)} style={s.deleteFileBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#888", fontSize: "13px" }}>No files found on the server.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: "20px 24px 24px", maxWidth: "960px", margin: "0 auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "16px" },
  card: {
    background: "white", borderRadius: "10px", padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)", marginBottom: "16px",
  },
  smallCard: {
    background: "white", borderRadius: "10px", padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: "0 0 4px" },
  cardDesc: { fontSize: "12px", color: "#94a3b8", margin: "0 0 14px" },
  field: { display: "flex", flexDirection: "column", gap: "5px" },
  label: { fontSize: "11px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" },
  btn: { width: "100%", padding: "10px", background: "#111", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
  cancelBtn: { width: "100%", marginTop: "8px", padding: "8px", background: "white", color: "#374151", border: "1px solid #e5e7eb", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "13px" },
  confirmBox: { marginTop: "10px", padding: "10px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", fontSize: "12px", color: "#b91c1c" },
  msg: { margin: "10px 0 0", fontSize: "13px", fontWeight: "600" },
  refreshBtn: { padding: "6px 14px", background: "white", border: "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#374151" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "13px" },
  th: { textAlign: "left", padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f0f2f5", verticalAlign: "middle" },
  tr: { transition: "background 0.1s" },
  adminBadge: { display: "inline-block", padding: "2px 8px", background: "#eff6ff", color: "#1d4ed8", borderRadius: "9999px", fontSize: "11px", fontWeight: "700" },
  userBadge: { display: "inline-block", padding: "2px 8px", background: "#f1f5f9", color: "#64748b", borderRadius: "9999px", fontSize: "11px", fontWeight: "700" },
  youBadge: { display: "inline-block", marginLeft: "6px", padding: "1px 6px", background: "#dcfce7", color: "#166534", borderRadius: "9999px", fontSize: "10px", fontWeight: "700" },
  promoteBtn: { padding: "5px 12px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  demoteBtn: { padding: "5px 12px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
  deleteFileBtn: { padding: "5px 12px", background: "white", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: "600" },
};

export default Admin;
