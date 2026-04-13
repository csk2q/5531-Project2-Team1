import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

function Monitoring({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState(true);

  const [logs] = useState([
    { time: "2026-04-08 1:00:00", level: "INFO", message: "Server started" },
    { time: "2026-04-08 1:05:00", level: "INFO", message: "User logged in" },
    { time: "2026-04-08 1:10:00", level: "WARN", message: "Disk usage above 80%" },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [cpuRes, memRes, storageRes] = await Promise.all([
          authFetch("/api/monitoring/cpu"),
          authFetch("/api/monitoring/memory"),
          authFetch("/api/monitoring/storage"),
        ]);

        if (!cpuRes.ok || !memRes.ok || !storageRes.ok) throw new Error("Server error");

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
        setFetchError("");
      } catch {
        setFetchError("Could not reach monitoring endpoints.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const diskPercent = stats ? Math.round((stats.disk_used / stats.disk_total) * 100) : 0;
  const ramPercent = stats ? Math.round((stats.ram_used / stats.ram_total) * 100) : 0;

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

  if (loading) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      {fetchError && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 24px", fontSize: "14px", borderBottom: "1px solid #fca5a5" }}>
          {fetchError}
        </div>
      )}
      <div style={s.content}>
        <h2 style={s.heading}>System Monitoring</h2>
        <div style={s.statGrid}>
          <StatCard label="CPU Usage" value={stats ? `${stats.cpu}%` : "—"} />
          <StatCard label="Disk Used" value={stats ? `${stats.disk_used} GB` : "—"} />
          <StatCard label="RAM Used" value={stats ? `${stats.ram_used} GB` : "—"} />
        </div>
        <div style={s.card}>
          <h3 style={s.cardTitle}>Usage</h3>
          <Bar label="CPU" percent={stats?.cpu ?? 0} detail={stats ? `${stats.cpu}%` : "—"} />
          <Bar
            label="Disk"
            percent={diskPercent}
            detail={stats ? `${stats.disk_used} GB / ${stats.disk_total} GB` : "—"}
          />
          <Bar
            label="RAM"
            percent={ramPercent}
            detail={stats ? `${stats.ram_used} GB / ${stats.ram_total} GB` : "—"}
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
