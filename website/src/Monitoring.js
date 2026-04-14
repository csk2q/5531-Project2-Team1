import { useState, useEffect, useCallback } from "react";
import Navbar from "./Navbar";
import { authFetch } from "./api";

const REFRESH_INTERVAL = 5000;

function Monitoring({ user, onLogout }) {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [fetchError, setFetchError] = useState("");
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const fetchStats = useCallback(async () => {
    try {
      const [cpuRes, memRes, storageRes] = await Promise.all([
        authFetch("/api/monitoring/cpu"),
        authFetch("/api/monitoring/memory"),
        authFetch("/api/monitoring/storage"),
      ]);

      if (!cpuRes.ok || !memRes.ok || !storageRes.ok) throw new Error("stats error");

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
        disk_free: parseFloat(((storage.total - storage.used) / GB).toFixed(1)),
      });
      setFetchError("");
    } catch {
      setFetchError("Could not reach monitoring endpoints.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await authFetch("/api/monitoring/log");
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : Array.isArray(data.logs) ? data.logs : [];
      // most recent first, cap at 50
      setLogs(list.slice().reverse().slice(0, 50));
    } catch {
      // log endpoint may not exist yet — silently ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchLogs();

    const statsInterval = setInterval(() => {
      fetchStats();
      fetchLogs();
      setCountdown(REFRESH_INTERVAL / 1000);
    }, REFRESH_INTERVAL);

    const tickInterval = setInterval(() => {
      setCountdown((c) => (c > 1 ? c - 1 : REFRESH_INTERVAL / 1000));
    }, 1000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(tickInterval);
    };
  }, [fetchStats, fetchLogs]);

  const diskPercent = stats ? Math.round((stats.disk_used / stats.disk_total) * 100) : 0;
  const ramPercent = stats ? Math.round((stats.ram_used / stats.ram_total) * 100) : 0;

  const barColor = (pct) =>
    pct > 85 ? "#ef4444" : pct > 60 ? "#f59e0b" : "#3b82f6";

  const levelColor = (level = "") => {
    const l = level.toUpperCase();
    if (l === "ERROR") return "#b91c1c";
    if (l === "WARNING" || l === "WARN") return "#d97706";
    if (l === "DEBUG") return "#7c3aed";
    return "#15803d"; // INFO / default
  };

  const StatCard = ({ label, value, sub }) => (
    <div style={s.statCard}>
      <div style={s.statNum}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && <div style={s.statSub}>{sub}</div>}
    </div>
  );

  const Bar = ({ label, percent, detail }) => (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
        <span style={{ fontWeight: "600" }}>{label}</span>
        <span style={{ color: "#888" }}>{detail}</span>
      </div>
      <div style={s.barTrack}>
        <div style={{ ...s.barFill, width: `${percent}%`, background: barColor(percent) }} />
      </div>
      <div style={{ textAlign: "right", fontSize: "11px", color: barColor(percent), marginTop: "3px" }}>
        {percent}%
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{ background: "#f4f7f6", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
        <Navbar user={user} onLogout={onLogout} />
        <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
          <p>Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "#f4f7f6", minHeight: "100vh", fontFamily: "Arial, sans-serif" }}>
      <Navbar user={user} onLogout={onLogout} />
      {fetchError && (
        <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "12px 24px", fontSize: "14px", borderBottom: "1px solid #fca5a5" }}>
          {fetchError}
        </div>
      )}
      <div style={s.content}>
        <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h2 style={s.heading}>System Monitoring</h2>
            <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>Live stats — refreshes every 5 seconds</p>
          </div>
          <div style={s.countdown}>
            <span style={{ fontSize: "18px", fontWeight: "700", color: "#3b82f6" }}>{countdown}s</span>
            <span style={{ fontSize: "11px", color: "#94a3b8", display: "block" }}>next refresh</span>
          </div>
        </div>

        {/* Stat cards */}
        <div style={s.statGrid}>
          <StatCard
            label="CPU Usage"
            value={stats ? `${stats.cpu}%` : "—"}
            sub={stats ? (stats.cpu > 85 ? "⚠ High" : "Normal") : null}
          />
          <StatCard
            label="Disk Used"
            value={stats ? `${stats.disk_used} GB` : "—"}
            sub={stats ? `${stats.disk_free} GB free` : null}
          />
          <StatCard
            label="RAM Used"
            value={stats ? `${stats.ram_used} GB` : "—"}
            sub={stats ? `of ${stats.ram_total} GB` : null}
          />
        </div>

        {/* Usage bars */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>Resource Usage</h3>
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

        {/* Activity log */}
        <div style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Activity Log</h3>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              {logs.length > 0 ? `${logs.length} entries` : "No entries"}
            </span>
          </div>

          {logs.length > 0 ? (
            <div style={{ maxHeight: "340px", overflowY: "auto" }}>
              {logs.map((log, i) => (
                <div key={log.id ?? i} style={s.logRow}>
                  <span style={s.logTime}>
                    {log.timestamp
                      ? new Date(log.timestamp).toLocaleString()
                      : log.time ?? "—"}
                  </span>
                  <span style={{ ...s.logLevel, color: levelColor(log.level) }}>
                    {(log.level ?? "INFO").toUpperCase()}
                  </span>
                  {log.category && (
                    <span style={s.logCategory}>{log.category}</span>
                  )}
                  <span style={s.logMsg}>{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: "#888", fontSize: "13px", margin: 0 }}>
              No log entries yet — the <code>/api/monitoring/log</code> endpoint may not be implemented yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  content: { padding: "20px 24px 24px", maxWidth: "860px", margin: "0 auto" },
  heading: { fontSize: "20px", fontWeight: "700", margin: "0 0 2px", color: "#1e293b" },
  countdown: {
    textAlign: "center",
    background: "white",
    borderRadius: "10px",
    padding: "10px 20px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
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
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  statNum: { fontSize: "24px", fontWeight: "700", marginBottom: "4px", color: "#1e293b" },
  statLabel: { fontSize: "12px", color: "#888", fontWeight: "600" },
  statSub: { fontSize: "11px", color: "#94a3b8", marginTop: "2px" },
  card: {
    background: "white",
    borderRadius: "10px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  cardTitle: { fontSize: "15px", fontWeight: "700", margin: "0 0 16px" },
  barTrack: { height: "10px", background: "#f0f2f5", borderRadius: "99px", overflow: "hidden" },
  barFill: { height: "100%", borderRadius: "99px", transition: "width 0.4s ease" },
  logRow: {
    display: "flex",
    gap: "12px",
    padding: "8px 0",
    borderBottom: "1px solid #f0f2f5",
    fontSize: "12px",
    fontFamily: "monospace",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  logTime: { color: "#aaa", flexShrink: 0, minWidth: "140px" },
  logLevel: { fontWeight: "700", flexShrink: 0, width: "52px" },
  logCategory: { color: "#94a3b8", flexShrink: 0, fontStyle: "italic" },
  logMsg: { color: "#374151", flex: 1 },
};

export default Monitoring;
