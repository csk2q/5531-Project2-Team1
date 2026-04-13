import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import { authFetch } from "./api";

function Admin({ user, onLogout }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    role: "user",
    permissions: { read: true, write: false, edit: false },
  });
  const [isNew, setIsNew] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 3000);
  };

  const fetchUsers = () => {
    setFetchError("");
    authFetch("/api/users/list")
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setFetchError("Could not load users. Is the server running?"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (user?.role !== "admin") {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div style={s.page}>
          <p style={{ color: "red" }}>Access denied. Admins only.</p>
        </div>
      </div>
    );
  }

  const selectUser = (u) => {
    setSelected(u);
    setForm({
      name: u.name,
      username: u.username,
      password: "",
      role: u.role,
      permissions: u.permissions || { read: true, write: false, edit: false },
    });
    setIsNew(false);
  };

  const newUser = () => {
    setSelected(null);
    setForm({
      name: "",
      username: "",
      password: "",
      role: "user",
      permissions: { read: true, write: false, edit: false },
    });
    setIsNew(true);
  };

  const saveUser = async () => {
    try {
      if (isNew) {
        const response = await authFetch("/api/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        showStatus(data.message || "User created.");
      } else {
        const response = await authFetch("/api/users/modify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: selected.id, ...form }),
        });
        const data = await response.json();
        showStatus(data.message || "User updated.");
      }
      fetchUsers();
      setSelected(null);
      setIsNew(false);
      setForm({ name: "", username: "", password: "", role: "user" });
    } catch (err) {
      showStatus("Failed to save user.");
    }
  };

  const deleteUser = async () => {
    if (!selected) return;
    if (
      !window.confirm(`Are you sure you want to delete ${selected.username}?`)
    )
      return;
    try {
      const response = await authFetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id }),
      });
      const data = await response.json();
      showStatus(data.message || "User deleted.");
      fetchUsers();
      setSelected(null);
      setForm({ name: "", username: "", password: "", role: "user" });
    } catch (err) {
      showStatus("Failed to delete user.");
    }
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n.charAt(0).toUpperCase())
      .join("") || "U";
  const avatarColor = (role) => {
    if (role === "admin") return "#e74c3c";
    if (role === "user") return "#3498db";
    return "#95a5a6";
  };
  const avatarText = (role) => {
    if (role === "admin") return "A";
    if (role === "user") return "U";
    return "?";
  };

  return (
    <div style={{ background: "#f4f7f6", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />
      <div style={s.page}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>User Management</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>Create and manage user accounts</p>
        </div>
        <div style={s.layout}>
          <div style={s.userList}>
            {loading && <p style={{ color: "#888", fontSize: "13px" }}>Loading users...</p>}
            {fetchError && <p style={{ color: "#b91c1c", fontSize: "13px" }}>{fetchError}</p>}
            {!loading && !fetchError && users.length === 0 && (
              <p style={{ color: "#888", fontSize: "13px" }}>No users found. Add one below.</p>
            )}
            {users.map((u) => (
              <div
                key={u.id}
                onClick={() => selectUser(u)}
                style={{
                  ...s.userItem,
                  background: selected?.id === u.id ? "#ecf0f1" : "white",
                }}
              >
                <div style={{ ...s.avatar, background: avatarColor(u.role) }}>
                  {avatarText(u.role)}
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: "bold" }}>{u.name}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#7f8c8d" }}>
                    {u.username} - {u.role}
                  </p>
                </div>
              </div>
            ))}
            <button onClick={newUser} style={s.newBtn}>
              + New User
            </button>
          </div>
          <div style={s.userDetails}>
            {statusMsg && (
              <p
                style={{
                  color: "#16a34a",
                  fontWeight: "600",
                  fontSize: "13px",
                }}
              >
                {statusMsg}
              </p>
            )}
            {selected || isNew ? (
              <>
                <input
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={s.input}
                />
                <input
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  style={s.input}
                />
                <input
                  placeholder={
                    isNew ? "Password" : "New password (leave blank to keep)"
                  }
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  style={s.input}
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  style={s.input}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <div style={s.permissionsBox}>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: "11px",
                      fontWeight: "600",
                      color: "#555",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Permissions
                  </p>
                  {["read", "write", "edit"].map((perm) => (
                    <label key={perm} style={s.permLabel}>
                      <input
                        type="checkbox"
                        checked={form.permissions[perm] || false}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            permissions: {
                              ...form.permissions,
                              [perm]: e.target.checked,
                            },
                          })
                        }
                      />
                      {perm.charAt(0).toUpperCase() + perm.slice(1)}
                    </label>
                  ))}
                </div>
                <button onClick={saveUser} style={s.saveBtn}>
                  Save
                </button>
                {!isNew && (
                  <button onClick={deleteUser} style={s.deleteBtn}>
                    Delete
                  </button>
                )}
              </>
            ) : (
              <p>Select a user to view/edit details.</p>
            )}
          </div>
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
  content: { padding: "24px", maxWidth: "860px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: "700", margin: "0 0 20px" },
  layout: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  panel: { background: "white", borderRadius: "10px", padding: "20px" },
  panelTitle: { fontSize: "15px", fontWeight: "700" },
  userRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    marginBottom: "4px",
  },
  avatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "700",
    flexShrink: 0,
  },
  badge: {
    fontSize: "11px",
    fontWeight: "600",
    padding: "3px 8px",
    borderRadius: "99px",
  },
  addBtn: {
    fontSize: "13px",
    padding: "6px 12px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
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
  },
  saveBtn: {
    flex: 1,
    padding: "10px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
  },
  deleteBtn: {
    padding: "10px 16px",
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
  },
  permissionsBox: {
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  permLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    cursor: "pointer",
  },
};

export default Admin;
