import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from './Navbar';

function Admin({ user, onLogout }) {
  const navigate = useNavigate();

  const [users, setUsers] = useState([
    { id: 1, name: "Morgan", username: "morgan", role: "admin" },
    { id: 2, name: "Immanuel", username: "immanuel", role: "user" },
    { id: 3, name: "Christian", username: "christian", role: "user" }
  ]);
  
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", role: "user" });
  const [isNew, setIsNew] = useState(false);

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

  const selectUser = (user) => {
    setSelected(user);
    setForm({ name: user.name, username: user.username, role: user.role });
    setIsNew(false);
  };

  const newUser = () => {
    setSelected(null);
    setForm({ name: "", username: "", role: "user" });
    setIsNew(true);
  };

  const saveUser = () => {
    if (isNew) {
      const newUser = { id: Date.now(), ...form };
      setUsers([...users, newUser]);
      selectUser(newUser);
    } else {
      setUsers(users.map(u => u.id === selected.id ? { ...u, ...form } : u));
      selectUser({ ...selected, ...form });
    }
  };

  const deleteUser = () => {
    if (selected) {
      setUsers(users.filter(u => u.id !== selected.id));
      setSelected(null);
      setForm({ name: "", username: "", role: "user" });
    }
  };

  const initials = user?.name?.split(" ").map(n => n.charAt(0).toUpperCase()).join("") || "U";
  const avatarColor = (role) => {
    if (role === "admin") return "#e74c3c";
    if (role === "user") return "#3498db";
    return "#95a5a6";
  };
  const avatarText = (role) => {
    if (role === "admin") return "A";
    if (role === "user") return "U";
    return "?";
  }

  return (
    <div style={{ background: '#f4f7f6', minHeight: '100vh' }}>
      <Navbar user={user} onLogout={onLogout} />
      <div style={s.page}>
        <h2>User Management</h2>
        <div style={s.layout}>
            <div style={s.userList}>
                {users.map(u => (
                    <div key={u.id} onClick={() => selectUser(u)} style={{ ...s.userItem, background: selected?.id === u.id ? "#ecf0f1" : "white" }}>
                        <div style={{ ...s.avatar, background: avatarColor(u.role) }}>{avatarText(u.role)}</div>
                        <div>
                            <p style={{ margin: 0, fontWeight: "bold" }}>{u.name}</p>
                            <p style={{ margin: 0, fontSize: "12px", color: "#7f8c8d" }}>{u.username} - {u.role}</p>
                        </div>
                    </div>
                ))}
                <button onClick={newUser} style={s.newBtn}>+ New User</button>
            </div>
            <div style={s.userDetails}>
                {selected ? (
                    <>
                        <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={s.input} />
                        <input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} style={s.input} />
                        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={s.input}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                        <button onClick={saveUser} style={s.saveBtn}>Save</button>
                        {!isNew && <button onClick={deleteUser} style={s.deleteBtn}>Delete</button>}
                    </>
                ) : (
                    <p>Select a user to view/edit details.</p>
                )}
            </div>
        </div>  
      </div>
    </div>
  );
};

const s = {
  page:       { fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh" },
  content:    { padding: "24px", maxWidth: "860px", margin: "0 auto" },
  heading:    { fontSize: "20px", fontWeight: "700", margin: "0 0 20px" },
  layout:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  panel:      { background: "white", borderRadius: "10px", padding: "20px" },
  panelTitle: { fontSize: "15px", fontWeight: "700" },
  userRow:    { display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px" },
  avatar:     { width: "36px", height: "36px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700", flexShrink: 0 },
  badge:      { fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "99px" },
  addBtn:     { fontSize: "13px", padding: "6px 12px", background: "#111", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" },
  field:      { display: "flex", flexDirection: "column", gap: "5px" },
  label:      { fontSize: "11px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" },
  input:      { padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" },
  saveBtn:    { flex: 1, padding: "10px", background: "#111", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
  deleteBtn:  { padding: "10px 16px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
};

export default Admin;