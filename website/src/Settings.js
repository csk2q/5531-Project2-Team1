import React from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

function Settings({ user, onLogout }) {
  const [schedule, setSchedule] = React.useState({
    schedule_name: "",
    weeks: 0,
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    start_date: "",
  });

  const [scheduleMsg, setScheduleMsg] = React.useState({ text: "", type: "" });
  const [backupMsg, setBackupMsg] = React.useState({ text: "", type: "" });
  const [backups, setBackups] = React.useState([]);
  const [backupsLoading, setBackupsLoading] = React.useState(true);

  const showScheduleMsg = (text, type = "success") => {
    setScheduleMsg({ text, type });
    setTimeout(() => setScheduleMsg({ text: "", type: "" }), 3500);
  };

  const showBackupMsg = (text, type = "success") => {
    setBackupMsg({ text, type });
    setTimeout(() => setBackupMsg({ text: "", type: "" }), 3500);
  };

  const fetchBackups = () => {
    setBackupsLoading(true);
    authFetch("/api/maintenance/backup/list")
      .then((res) => res.json())
      .then((data) => setBackups(Array.isArray(data.backups) ? data.backups : []))
      .catch(() => showBackupMsg("Could not load backups.", "error"))
      .finally(() => setBackupsLoading(false));
  };

  React.useEffect(() => {
    fetchBackups();
  }, []);

  const saveSchedule = async () => {
    if (!schedule.schedule_name.trim()) {
      showScheduleMsg("Please enter a schedule name.", "error");
      return;
    }
    if (!schedule.start_date) {
      showScheduleMsg("Please select a start date.", "error");
      return;
    }
    // datetime-local gives "2026-04-13T10:30" — backend needs full ISO with seconds
    const startDateFormatted = schedule.start_date.length === 16
      ? schedule.start_date + ":00"
      : schedule.start_date;
    try {
      const response = await authFetch("/api/maintenance/backup/schedule/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schedule, start_date: startDateFormatted }),
      });
      const data = await response.json();
      if (response.ok) {
        showScheduleMsg(data.message || "Schedule saved.");
      } else {
        const errDetail = data.errors
          ? Object.values(data.errors).flat().join(", ")
          : data.message || "Failed to save schedule.";
        showScheduleMsg(errDetail, "error");
      }
    } catch {
      showScheduleMsg("Failed to save schedule.", "error");
    }
  };

  const startBackup = async () => {
    if (!window.confirm("Start a manual backup now?")) return;
    showBackupMsg("Starting backup...", "");
    try {
      const response = await authFetch("/api/maintenance/backup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      showBackupMsg(
        data.message || "Backup started.",
        response.ok ? "success" : "error"
      );
      if (response.ok) fetchBackups();
    } catch {
      showBackupMsg("Failed to start backup.", "error");
    }
  };

  const restoreBackup = async (filename) => {
    if (!window.confirm(`Restore "${filename}"? This will overwrite current data.`)) return;
    try {
      const response = await authFetch(
        `/api/maintenance/backup/restore/${encodeURIComponent(filename)}`,
        { method: "POST" }
      );
      const data = await response.json();
      showBackupMsg(
        data.message || `Restoring ${filename}`,
        response.ok ? "success" : "error"
      );
    } catch {
      showBackupMsg("Restore failed.", "error");
    }
  };

  const removeBackup = async (filename) => {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      const response = await authFetch(
        `/api/maintenance/backup/delete/${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      showBackupMsg(
        data.message || `Deleted ${filename}`,
        response.ok ? "success" : "error"
      );
      if (response.ok) fetchBackups();
    } catch {
      showBackupMsg("Delete failed.", "error");
    }
  };

  const intervalFields = [
    { key: "weeks", label: "Weeks" },
    { key: "days", label: "Days" },
    { key: "hours", label: "Hours" },
    { key: "minutes", label: "Mins" },
    { key: "seconds", label: "Secs" },
  ];

  return (
    <div style={{ background: "#f4f7f6", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />
      <div style={s.page}>
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 2px", fontSize: "20px", fontWeight: "700", color: "#1e293b" }}>
            Backup & Restore
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>
            Schedule automatic backups and restore from history
          </p>
        </div>

        {/* Schedule Card */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Backup Schedule</h3>
          <div style={{ marginTop: "14px" }}>
            <div style={s.field}>
              <label style={s.label}>Schedule Name</label>
              <input
                type="text"
                value={schedule.schedule_name}
                onChange={(e) => setSchedule({ ...schedule, schedule_name: e.target.value })}
                placeholder="e.g. nightly-backup"
                style={s.input}
              />
            </div>
            <div style={{ ...s.field, marginTop: "12px" }}>
              <label style={s.label}>Start Date & Time</label>
              <input
                type="datetime-local"
                value={schedule.start_date}
                onChange={(e) => setSchedule({ ...schedule, start_date: e.target.value })}
                style={s.input}
              />
            </div>
            <div style={{ marginTop: "12px" }}>
              <label style={{ ...s.label, display: "block", marginBottom: "8px" }}>
                Repeat Interval
              </label>
              <div style={s.intervalGrid}>
                {intervalFields.map(({ key, label }) => (
                  <div key={key} style={s.intervalField}>
                    <label style={{ ...s.label, textAlign: "center" }}>{label}</label>
                    <input
                      type="number"
                      min="0"
                      value={schedule[key]}
                      onChange={(e) =>
                        setSchedule({ ...schedule, [key]: parseInt(e.target.value) || 0 })
                      }
                      style={{ ...s.input, textAlign: "center", padding: "9px 4px" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={saveSchedule} style={{ ...s.btn, marginTop: "16px" }}>
            Save Schedule
          </button>
          {scheduleMsg.text && (
            <p style={{ ...s.msg, color: scheduleMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
              {scheduleMsg.text}
            </p>
          )}
        </div>

        {/* Backups Card */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Existing Backups</h3>
            <button onClick={startBackup} style={s.btn}>+ Start Backup</button>
          </div>

          {backupMsg.text && (
            <p style={{ ...s.msg, marginBottom: "12px", color: backupMsg.type === "error" ? "#b91c1c" : backupMsg.type === "success" ? "#15803d" : "#64748b" }}>
              {backupMsg.text}
            </p>
          )}

          {backupsLoading ? (
            <p style={{ color: "#888", fontSize: "13px" }}>Loading backups...</p>
          ) : backups.length > 0 ? (
            backups.map((filename) => (
              <div key={filename} style={s.backupRow}>
                <div>
                  <p style={{ margin: 0, fontWeight: "600", fontSize: "13px" }}>{filename}</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => restoreBackup(filename)} style={s.restoreBtn}>
                    Restore
                  </button>
                  <button
                    onClick={() => removeBackup(filename)}
                    style={{ ...s.restoreBtn, color: "#b91c1c", borderColor: "#fca5a5" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p style={{ color: "#888", fontSize: "13px" }}>No backups found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    padding: "20px 24px 24px",
    maxWidth: "720px",
    margin: "0 auto",
  },
  card: {
    background: "white",
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: 0 },
  field: { display: "flex", flexDirection: "column", gap: "5px" },
  intervalGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "8px",
    width: "100%",
  },
  intervalField: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
    minWidth: 0,
  },
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
    padding: "10px 20px",
    background: "#111",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "14px",
  },
  msg: {
    margin: "10px 0 0",
    fontSize: "13px",
    fontWeight: "600",
  },
  backupRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f0f2f5",
  },
  restoreBtn: {
    padding: "7px 14px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
};

export default Settings;
