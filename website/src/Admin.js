import { useState } from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

function Admin({ user, onLogout }) {
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

  const showMsg = (setter, text, type = "success") => {
    setter({ text, type });
    setTimeout(() => setter({ text: "", type: "" }), 4000);
  };

  const handleCreate = async () => {
    if (!createForm.username.trim()) {
      showMsg(setCreateMsg, "Username is required.", "error");
      return;
    }
    if (!createForm.password) {
      showMsg(setCreateMsg, "Password is required.", "error");
      return;
    }
    setCreateLoading(true);
    try {
      const response = await authFetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await response.json();
      showMsg(setCreateMsg, data.message || "User created.", response.ok ? "success" : "error");
      if (response.ok) setCreateForm({ username: "", password: "" });
    } catch {
      showMsg(setCreateMsg, "Failed to create user.", "error");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleModify = async () => {
    if (!modifyForm.username.trim()) {
      showMsg(setModifyMsg, "Username is required.", "error");
      return;
    }
    if (!modifyForm.password) {
      showMsg(setModifyMsg, "New password is required.", "error");
      return;
    }
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
    if (!deleteUsername.trim()) {
      showMsg(setDeleteMsg, "Username is required.", "error");
      return;
    }
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleteLoading(true);
    try {
      const response = await authFetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: deleteUsername }),
      });
      const data = await response.json();
      showMsg(setDeleteMsg, data.message || "User deleted.", response.ok ? "success" : "error");
      if (response.ok) {
        setDeleteUsername("");
        setDeleteConfirm(false);
      }
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
            User Management
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            Create and manage user accounts
          </p>
        </div>

        <div style={s.grid}>
          {/* Create User */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Create User</h3>
            <p style={s.cardDesc}>Add a new user account to the system.</p>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <input
                style={s.input}
                placeholder="Enter username"
                value={createForm.username}
                onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
              />
            </div>
            <div style={{ ...s.field, marginTop: "10px" }}>
              <label style={s.label}>Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Enter password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={createLoading}
              style={{ ...s.btn, marginTop: "14px" }}
            >
              {createLoading ? "Creating..." : "Create User"}
            </button>
            {createMsg.text && (
              <p style={{ ...s.msg, color: createMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
                {createMsg.text}
              </p>
            )}
          </div>

          {/* Change Password */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>Change Password</h3>
            <p style={s.cardDesc}>Update the password for an existing user.</p>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <input
                style={s.input}
                placeholder="Enter username"
                value={modifyForm.username}
                onChange={(e) => setModifyForm({ ...modifyForm, username: e.target.value })}
              />
            </div>
            <div style={{ ...s.field, marginTop: "10px" }}>
              <label style={s.label}>New Password</label>
              <input
                style={s.input}
                type="password"
                placeholder="Enter new password"
                value={modifyForm.password}
                onChange={(e) => setModifyForm({ ...modifyForm, password: e.target.value })}
              />
            </div>
            <button
              onClick={handleModify}
              disabled={modifyLoading}
              style={{ ...s.btn, marginTop: "14px" }}
            >
              {modifyLoading ? "Updating..." : "Update Password"}
            </button>
            {modifyMsg.text && (
              <p style={{ ...s.msg, color: modifyMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
                {modifyMsg.text}
              </p>
            )}
          </div>

          {/* Delete User */}
          <div style={{ ...s.card, borderTop: "3px solid #fca5a5" }}>
            <h3 style={s.cardTitle}>Delete User</h3>
            <p style={s.cardDesc}>Permanently remove a user account.</p>
            <div style={s.field}>
              <label style={s.label}>Username</label>
              <input
                style={s.input}
                placeholder="Enter username to delete"
                value={deleteUsername}
                onChange={(e) => {
                  setDeleteUsername(e.target.value);
                  setDeleteConfirm(false);
                }}
              />
            </div>
            {deleteConfirm && deleteUsername && (
              <div style={s.confirmBox}>
                This will permanently delete <strong>{deleteUsername}</strong>. Click Delete again to confirm.
              </div>
            )}
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{ ...s.btn, marginTop: "14px", background: deleteConfirm ? "#b91c1c" : "#374151" }}
            >
              {deleteLoading ? "Deleting..." : deleteConfirm ? "Confirm Delete" : "Delete User"}
            </button>
            {!deleteConfirm && deleteUsername && (
              <button
                onClick={() => { setDeleteUsername(""); setDeleteConfirm(false); }}
                style={s.cancelBtn}
              >
                Cancel
              </button>
            )}
            {deleteMsg.text && (
              <p style={{ ...s.msg, color: deleteMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
                {deleteMsg.text}
              </p>
            )}
          </div>
        </div>

        <div style={{ ...s.card, marginTop: "0", padding: "14px 20px" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            User list view is not yet available — pending backend endpoint from the team.
          </p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    padding: "20px 24px 24px",
    maxWidth: "900px",
    margin: "0 auto",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
    marginBottom: "16px",
  },
  card: {
    background: "white",
    borderRadius: "10px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: "0 0 4px" },
  cardDesc: { fontSize: "12px", color: "#94a3b8", margin: "0 0 14px" },
  field: { display: "flex", flexDirection: "column", gap: "5px" },
  label: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  input: {
    padding: "9px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "10px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
  },
  cancelBtn: {
    width: "100%",
    marginTop: "8px",
    padding: "8px",
    background: "white",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
  },
  confirmBox: {
    marginTop: "10px",
    padding: "10px 12px",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#b91c1c",
  },
  msg: {
    margin: "10px 0 0",
    fontSize: "13px",
    fontWeight: "600",
  },
};

export default Admin;
