import React from 'react';
import Navbar from './Navbar';

function Settings ({ user, onLogout }) {
  const [schedule, setSchedule] = React.useState({
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    location: '/backups/'
    });

    const [saved, setSaved] = React.useState(false);
    const [backups, setBackups] = React.useState([]);

    const fetchBackups = () => {
      fetch("http://127.0.0.1:5000/api/maintenance/backups/list")
        .then((res) => res.json())
        .then((data) => setBackups(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Error fetching backups:", err));
    };

    React.useEffect(() => {
      fetchBackups();
    }, []);

    const saveSchedule = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/maintenance/schedules/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(schedule),
        });
        const data = await response.json();
        console.log("Schedule saved:", data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        console.error("Failed to save schedule:", err);
      }
    };

    const restoreBackup = async (backup) => {
        if (!window.confirm(`Are you sure you want to restore ${backup.name}? This will overwrite current data.`)) return;
        try {
          const response = await fetch("http://127.0.0.1:5000/api/maintenance/backups/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: backup.id }),
          });
          const data = await response.json();
          alert(data.message || `Restoring ${backup.name}`);
        } catch (err) {
          alert("Restore failed.");
        }
    };

    const removeBackup = async (backup) => {
      if (!window.confirm(`Are you sure you want to delete ${backup.name}?`)) return;
      try {
        const response = await fetch("http://127.0.0.1:5000/api/maintenance/backups/remove", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: backup.id }),
        });
        const data = await response.json();
        alert(data.message || `Deleted ${backup.name}`);
        fetchBackups();
      } catch (err) {
        alert("Delete failed.");
      }
    };

    return (
        <div>
            <Navbar user={user} onLogout={onLogout} />
            <div style={s.page}>
                <h2>Backup & Restore Settings</h2>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Backup Schedule</h3>
                    <div style={s.field}>
                        <label style={s.label}>Enable Backups</label>
                        <input type="checkbox" checked={schedule.enabled} onChange={(e) => setSchedule({ ...schedule, enabled: e.target.checked })} />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Frequency</label>
                        <select value={schedule.frequency} onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })} style={s.input}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Backup Time</label>
                        <input type="time" value={schedule.time} onChange={(e) => setSchedule({ ...schedule, time: e.target.value })} style={s.input} />
                    </div>
                    <div style={s.field}>
                        <label style={s.label}>Backup Location</label>
                        <input type="text" value={schedule.location} onChange={(e) => setSchedule({ ...schedule, location: e.target.value })} placeholder="/backups/" style={s.input} />
                    </div>
                    <button onClick={saveSchedule} style={s.btn}>Save Schedule</button>
                    {saved && <p style={s.successMsg}>Schedule saved successfully!</p>}
                </div>
                <div style={s.card}>
                    <h3 style={s.cardTitle}>Existing Backups</h3>
                    {backups.length > 0 ? backups.map(backup => (
                        <div key={backup.id} style={s.backupRow}>
                            <div>
                                <p style={{ margin: 0, fontWeight: "600" }}>{backup.name}</p>
                                <p style={{ margin: 0, fontSize: "12px", color: "#7f8c8d" }}>{backup.date} - {backup.size}</p>
                            </div>
                            <div>
                                <button onClick={() => restoreBackup(backup)} style={s.restoreBtn}>Restore</button>
                                <button onClick={() => removeBackup(backup)} style={{ ...s.restoreBtn, color: "red", marginLeft: "8px" }}>Delete</button>
                            </div>
                        </div>
                    )) : <p style={{ color: "#888", fontSize: "13px" }}>No backups found.</p>}
                </div>
             </div>
        </div>
    );
};

const s = {
  page:       { fontFamily: "Arial, sans-serif", background: "#f0f2f5", minHeight: "100vh" },
  content:    { padding: "24px", maxWidth: "680px", margin: "0 auto" },
  heading:    { fontSize: "20px", fontWeight: "700", margin: "0 0 20px" },
  card:       { background: "white", borderRadius: "10px", padding: "24px", marginBottom: "16px" },
  cardTitle:  { fontSize: "15px", fontWeight: "700", margin: 0 },
  formGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" },
  field:      { display: "flex", flexDirection: "column", gap: "5px" },
  label:      { fontSize: "11px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.05em" },
  input:      { padding: "9px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px" },
  toggle:     { display: "flex", alignItems: "center", cursor: "pointer" },
  btn:        { padding: "10px 20px", background: "#111", color: "white", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "14px" },
  successMsg: { margin: "12px 0 0", fontSize: "13px", color: "#16a34a", fontWeight: "600" },
  backupRow:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f2f5" },
  restoreBtn: { padding: "7px 14px", background: "white", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "600" },
};

export default Settings;