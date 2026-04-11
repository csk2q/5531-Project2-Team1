import { useState, useEffect, use } from "react";
import Navbar from "./Navbar";

// Placeholder monitoring page
function Monitoring({ user, onLogout }) {
  const [stats, setStats] = useState({
    cpu: 0,
    disk_total: 0,
    disk_used: 0,
    ram_used: 0,
    ram_total: 0,
  });

  const [logs, setLogs] = useState([
    { timestamp: "2026-04-08 1:00:00", message: "EXAMPLE" },
    { timestamp: "2026-04-08 1:05:00", message: "EXAMPLE" },
    { timestamp: "2026-04-08 1:10:00", message: "EXAMPLE" },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cpuRes, memRes, storageRes] = await Promise.all([
          fetch("http://127.0.0.1:5000/api/monitoring/cpu"),
          fetch("http://127.0.0.1:5000/api/monitoring/memory"),
          fetch("http://127.0.0.1:5000/api/monitoring/storage"),
        ]);

        const cpu = await cpuRes.json();
        const mem = await memRes.json();
        const storage = await storageRes.json();

        const GB = 1024 ** 3;

        setStats({
          cpu: cpu.cpu_system_percent,
          ram_used: parseFloat((mem.system_used / GB).toFixed(1)),
          ram_total: parseFloat((mem.system_total / GB).toFixed(1)),
          disk_used: parseFloat((storage.used / GB).toFixed(1)),
          disk_total: parseFloat((storage.total / GB).toFixed(1)),
        });
      } catch (err) {
        console.error("Failed to fetch monitoring stats:", err);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const diskPercent = Math.round((stats.disk_used / stats.disk_total) * 100);
  const ramPercent = Math.round((stats.ram_used / stats.ram_total) * 100);

  const barColor = (pct) =>
    pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#3b82f6";

  const StatCard = ({ label, value }) => (
    <div style={s.statCard}>
      <div style={s.statNum}>{value}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  );

  const Bar = ({ label, percent, detail }) => (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontWeight: "600" }}>{label}</span>
        <span style={{ color: "#888" }}>{detail}</span>
      </div>
      <div style={s.barTrack}>
        <div
          style={{
            ...s.barFill,
            width: `${percent}%`,
            background: barColor(percent),
          }}
        />
      </div>
    </div>
  );

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div style={s.content}>
        <h2 style={s.heading}>System Monitoring</h2>
        <div style={s.statGrid}>
          <StatCard label="CPU Usage" value={`${stats.cpu}%`} />
          <StatCard label="Disk Used" value={`${stats.disk_used} GB`} />
          <StatCard label="RAM Used" value={`${stats.ram_used} GB`} />
        </div>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Usage</h3>
          <Bar label="CPU" percent={stats.cpu} detail={`${stats.cpu}%`} />
          <Bar
            label="Disk"
            percent={diskPercent}
            detail={`${stats.disk_used} GB / ${stats.disk_total} GB`}
          />
          <Bar
            label="RAM"
            percent={ramPercent}
            detail={`${stats.ram_used} GB / ${stats.ram_total} GB`}
          />
        </div>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Activity Log</h3>
          {logs.map((log, i) => (
            <div key={i} style={s.logRow}>
              <span style={s.logTime}>{log.time}</span>
              <span
                style={{
                  ...s.logLevel,
                  color: log.level === "WARN" ? "#f59e0b" : "#22c55e",
                }}
              >
                {log.level}
              </span>
              <span style={s.logMsg}>{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    fontFamily: "Arial, sans-serif",
    background: "#f0f2f5",
    minHeight: "100vh",
  },
  content: { padding: "24px", maxWidth: "860px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: "700", margin: "0 0 20px" },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
    marginBottom: "16px",
  },
  statCard: {
    background: "white",
    borderRadius: "10px",
    padding: "16px",
    textAlign: "center",
  },
  statNum: { fontSize: "24px", fontWeight: "700", marginBottom: "4px" },
  statLabel: { fontSize: "12px", color: "#888" },
  card: {
    background: "white",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "16px",
  },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: "0 0 16px" },
  barTrack: {
    height: "10px",
    background: "#f0f2f5",
    borderRadius: "99px",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: "99px", transition: "width 0.3s" },
  logRow: {
    display: "flex",
    gap: "12px",
    padding: "8px 0",
    borderBottom: "1px solid #f0f2f5",
    fontSize: "13px",
    fontFamily: "monospace",
  },
  logTime: { color: "#aaa", flexShrink: 0 },
  logLevel: { fontWeight: "700", flexShrink: 0, width: "40px" },
  logMsg: { color: "#444" },
};

export default Monitoring;
