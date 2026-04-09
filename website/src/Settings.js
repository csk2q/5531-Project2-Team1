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

    const [backups, setBackups] = React.useState([
        { id: 1, name: 'Backup-2026-04-08.zip', date: '2026-04-08 02:00', size: '1.2GB' },
        { id: 2, name: 'Backup-2026-04-07.zip', date: '2026-04-07 03:00', size: '1.1GB' },
        { id: 3, name: 'Backup-2026-04-06.zip', date: '2026-04-06 04:00', size: '1.0GB' }
    ]);

    const saveSchedule = () => {
      //SWAP WITH BACKEND CALL
      console.log('Saving schedule:', schedule);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    };

    const restoreBackup = (name) => {
        //SWAP WITH BACKEND CALL
        if (window.confirm(`Are you sure you want to restore ${name}? This will overwrite current data.`)) return;
            console.log(`Restoring backup: ${name}`);
            alert(`Restoring ${name}`);
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
                    {backups.map(backup => (
                        <div key={backup.id} style={s.backupRow}>
                            <div>
                                <p style={{ margin: 0, fontWeight: "600" }}>{backup.name}</p>
                                <p style={{ margin: 0, fontSize: "12px", color: "#7f8c8d" }}>{backup.date} - {backup.size}</p>
                            </div>
                            <button onClick={() => restoreBackup(backup.name)} style={s.restoreBtn}>Restore</button>
                        </div>
                    ))}
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