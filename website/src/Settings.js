import React from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

function Settings({ user, onLogout }) {
  const [schedules, setSchedules] = React.useState([]);
  const [schedulesLoading, setSchedulesLoading] = React.useState(true);
  const [scheduleMsg, setScheduleMsg] = React.useState({ text: "", type: "" });

  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [form, setForm] = React.useState({
    schedule_name: "",
    weeks: 0,
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
    start_date: "",
  });

  const [backupMsg, setBackupMsg] = React.useState({ text: "", type: "" });
  const [backups, setBackups] = React.useState([]);
  const [backupsLoading, setBackupsLoading] = React.useState(true);
  const [backupConfirm, setBackupConfirm] = React.useState("");
  const [restoreConfirm, setRestoreConfirm] = React.useState("");

  const showScheduleMsg = (text, type = "success") => {
    setScheduleMsg({ text, type });
    setTimeout(() => setScheduleMsg({ text: "", type: "" }), 3500);
  };

  const showBackupMsg = (text, type = "success") => {
    setBackupMsg({ text, type });
    setTimeout(() => setBackupMsg({ text: "", type: "" }), 3500);
  };

  const fetchSchedules = () => {
    setSchedulesLoading(true);
    authFetch("/api/maintenance/backup/schedule/list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setSchedules(data);
        else if (Array.isArray(data.schedules)) setSchedules(data.schedules);
        else setSchedules([]);
      })
      .catch(() => showScheduleMsg("Could not load schedules.", "error"))
      .finally(() => setSchedulesLoading(false));
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
    fetchSchedules();
    fetchBackups();
  }, []);

  const resetForm = () => {
    setForm({ schedule_name: "", weeks: 0, days: 1, hours: 0, minutes: 0, seconds: 0, start_date: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (sched) => {
    setForm({
      schedule_name: sched.schedule_name || sched.name || "",
      weeks: sched.weeks ?? 0,
      days: sched.days ?? 1,
      hours: sched.hours ?? 0,
      minutes: sched.minutes ?? 0,
      seconds: sched.seconds ?? 0,
      start_date: sched.start_date ? sched.start_date.slice(0, 16) : "",
    });
    setEditingId(sched.id);
    setShowForm(true);
  };

  const saveSchedule = async () => {
    if (!form.schedule_name.trim()) {
      showScheduleMsg("Please enter a schedule name.", "error");
      return;
    }
    if (!form.start_date) {
      showScheduleMsg("Please select a start date.", "error");
      return;
    }
    // datetime-local omits seconds — backend requires full iso with :00
    const startDateFormatted =
      form.start_date.length === 16 ? form.start_date + ":00" : form.start_date;
    const payload = { ...form, start_date: startDateFormatted };
    const url =
      editingId !== null
        ? `/api/maintenance/backup/schedule/modify/${editingId}`
        : "/api/maintenance/backup/schedule/create";
    try {
      const response = await authFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        showScheduleMsg(data.message || (editingId !== null ? "Schedule updated." : "Schedule created."));
        resetForm();
        fetchSchedules();
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

  const removeSchedule = async (sched) => {
    try {
      const response = await authFetch(
        `/api/maintenance/backup/schedule/remove/${sched.id}`,
        { method: "POST" }
      );
      const data = await response.json();
      showScheduleMsg(data.message || "Schedule removed.", response.ok ? "success" : "error");
      if (response.ok) fetchSchedules();
    } catch {
      showScheduleMsg("Failed to remove schedule.", "error");
    }
  };

  const startBackup = async () => {
    showBackupMsg("Starting backup...", "");
    try {
      const response = await authFetch("/api/maintenance/backup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      showBackupMsg(data.message || "Backup started.", response.ok ? "success" : "error");
      if (response.ok) fetchBackups();
    } catch {
      showBackupMsg("Failed to start backup.", "error");
    }
  };

  const restoreBackup = async (filename) => {
    if (restoreConfirm !== filename) {
      setRestoreConfirm(filename);
      setBackupConfirm("");
      return;
    }
    setRestoreConfirm("");
    try {
      const response = await authFetch(
        `/api/maintenance/backup/restore/${encodeURIComponent(filename)}`,
        { method: "POST" }
      );
      const data = await response.json();
      showBackupMsg(data.message || `Restoring ${filename}`, response.ok ? "success" : "error");
    } catch {
      showBackupMsg("Restore failed.", "error");
    }
  };

  const removeBackup = async (filename) => {
    if (backupConfirm !== filename) {
      setBackupConfirm(filename);
      setRestoreConfirm("");
      return;
    }
    setBackupConfirm("");
    try {
      const response = await authFetch(
        `/api/maintenance/backup/delete/${encodeURIComponent(filename)}`,
        { method: "DELETE" }
      );
      const data = await response.json();
      showBackupMsg(data.message || `Deleted ${filename}`, response.ok ? "success" : "error");
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

  const formatInterval = (sched) => {
    const parts = [
      sched.weeks && `${sched.weeks}w`,
      sched.days && `${sched.days}d`,
      sched.hours && `${sched.hours}h`,
      sched.minutes && `${sched.minutes}m`,
      sched.seconds && `${sched.seconds}s`,
    ].filter(Boolean);
    return parts.length > 0 ? `Every ${parts.join(" ")}` : "Custom interval";
  };

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

        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Backup Schedules</h3>
            {!showForm && (
              <button
                onClick={() => { setEditingId(null); setShowForm(true); }}
                style={s.btn}
              >
                + New Schedule
              </button>
            )}
          </div>

          {scheduleMsg.text && (
            <p style={{ ...s.msg, marginBottom: "12px", color: scheduleMsg.type === "error" ? "#b91c1c" : "#15803d" }}>
              {scheduleMsg.text}
            </p>
          )}

          {schedulesLoading ? (
            <p style={{ color: "#888", fontSize: "13px" }}>Loading schedules...</p>
          ) : schedules.length > 0 ? (
            schedules.map((sched) => (
              <div key={sched.id} style={s.schedRow}>
                <div>
                  <p style={{ margin: 0, fontWeight: "600", fontSize: "13px" }}>
                    {sched.schedule_name || sched.name || `Schedule #${sched.id}`}
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                    {formatInterval(sched)}
                    {sched.start_date ? ` · starts ${sched.start_date.slice(0, 10)}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => startEdit(sched)} style={s.outlineBtn}>Edit</button>
                  <button
                    onClick={() => removeSchedule(sched)}
                    style={{ ...s.outlineBtn, color: "#b91c1c", borderColor: "#fca5a5" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            !showForm && (
              <p style={{ color: "#888", fontSize: "13px" }}>
                No schedules yet. Click <strong>+ New Schedule</strong> to create one.
              </p>
            )
          )}

          {showForm && (
            <div style={{
              marginTop: schedules.length > 0 ? "20px" : "4px",
              paddingTop: schedules.length > 0 ? "20px" : "0",
              borderTop: schedules.length > 0 ? "1px solid #f0f2f5" : "none"
            }}>
              <h4 style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: "700", color: "#1e293b" }}>
                {editingId !== null ? "Edit Schedule" : "New Schedule"}
              </h4>

              <div style={s.field}>
                <label style={s.label}>Schedule Name</label>
                <input
                  type="text"
                  value={form.schedule_name}
                  onChange={(e) => setForm({ ...form, schedule_name: e.target.value })}
                  placeholder="e.g. nightly-backup"
                  style={s.input}
                />
              </div>

              <div style={{ ...s.field, marginTop: "12px" }}>
                <label style={s.label}>Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
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
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: parseInt(e.target.value) || 0 })
                        }
                        style={{ ...s.input, textAlign: "center", padding: "9px 4px" }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
                <button onClick={saveSchedule} style={s.btn}>
                  {editingId !== null ? "Save Changes" : "Create Schedule"}
                </button>
                <button onClick={resetForm} style={s.cancelBtn}>Cancel</button>
              </div>
            </div>
          )}
        </div>

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
              <div key={filename}>
                <div style={s.backupRow}>
                  <p style={{ margin: 0, fontWeight: "600", fontSize: "13px" }}>{filename}</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => restoreBackup(filename)}
                      style={restoreConfirm === filename
                        ? { ...s.outlineBtn, background: "#fef9c3", borderColor: "#f59e0b", color: "#92400e" }
                        : s.outlineBtn}
                    >
                      {restoreConfirm === filename ? "Confirm Restore" : "Restore"}
                    </button>
                    <button
                      onClick={() => removeBackup(filename)}
                      style={backupConfirm === filename
                        ? { ...s.outlineBtn, background: "#fef2f2", borderColor: "#fca5a5", color: "#b91c1c" }
                        : { ...s.outlineBtn, color: "#b91c1c", borderColor: "#fca5a5" }}
                    >
                      {backupConfirm === filename ? "Confirm Delete" : "Delete"}
                    </button>
                    {(backupConfirm === filename || restoreConfirm === filename) && (
                      <button
                        onClick={() => { setBackupConfirm(""); setRestoreConfirm(""); }}
                        style={s.cancelBtn}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {restoreConfirm === filename && (
                  <div style={s.warnBox}>
                    This will overwrite current data with this backup. Click <strong>Confirm Restore</strong> to proceed.
                  </div>
                )}
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
    whiteSpace: "nowrap",
  },
  cancelBtn: {
    padding: "9px 16px",
    background: "white",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    fontWeight: "600",
    cursor: "pointer",
    fontSize: "13px",
  },
  outlineBtn: {
    padding: "7px 14px",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  msg: {
    margin: "0",
    fontSize: "13px",
    fontWeight: "600",
  },
  schedRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f0f2f5",
  },
  backupRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 0",
    borderBottom: "1px solid #f0f2f5",
    gap: "12px",
  },
  warnBox: {
    margin: "4px 0 8px",
    padding: "8px 12px",
    background: "#fef9c3",
    border: "1px solid #f59e0b",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#92400e",
  },
};

export default Settings;
