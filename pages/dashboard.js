import { useState, useEffect } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" rx="11" fill="url(#dlg)"/>
    <path d="M21.5 6L12 21h7l-2.5 11 10-15h-7L21.5 6z" fill="white" fillOpacity="0.95"/>
    <defs>
      <linearGradient id="dlg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6"/>
        <stop offset="1" stopColor="#db2777"/>
      </linearGradient>
    </defs>
  </svg>
);

function NavLink({ icon, label, href, active }) {
  return (
    <Link href={href} className="nav-link" style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "9px 12px", borderRadius: "9px", textDecoration: "none",
      fontSize: "13.5px", fontWeight: active ? "600" : "500",
      color: active ? "#e2d9ff" : "#6b7280",
      background: active ? "rgba(139,92,246,0.18)" : "transparent",
      border: `1px solid ${active ? "rgba(139,92,246,0.25)" : "transparent"}`,
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: "15px", opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </Link>
  );
}

function BarChart({ data }) {
  if (!data.length) {
    return (
      <p style={{ color: "#4b5563", fontSize: "14px", textAlign: "center", padding: "32px 0" }}>
        No data yet. Generate some resumes to see stats here.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {data.map((item) => (
        <div key={item.profile} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "rgba(139,92,246,0.07)", borderRadius: "8px", border: "1px solid rgba(139,92,246,0.1)" }}>
          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>{item.name}</span>
          <span style={{ fontSize: "16px", fontWeight: "700", color: "#a78bfa" }}>{item.count}</span>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub, gradient, icon }) {
  return (
    <div style={{
      background: "rgba(139,92,246,0.06)",
      border: "1px solid rgba(139,92,246,0.12)",
      borderRadius: "14px",
      padding: "20px 22px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
        <span style={{ fontSize: "18px" }}>{icon}</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.6px" }}>{label}</span>
      </div>
      <div style={{ fontSize: "34px", fontWeight: "700", background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "12px", color: "#4b5563", marginTop: "6px" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch(`${API}/api/stats`)
      .then(r => { if (!r.ok) throw new Error("Failed to load stats"); return r.json(); })
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const topProfile = stats?.byProfile?.[0];

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#0c0a1e; color:#f1f5f9; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.35); border-radius:6px; }
        .nav-link:hover { background:rgba(139,92,246,0.1)!important; color:#c4b5fd!important; }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "#0c0a1e" }}>

        {/* ──────────── SIDEBAR ──────────── */}
        <aside style={{
          width: "220px", flexShrink: 0,
          background: "#08061a",
          borderRight: "1px solid rgba(139,92,246,0.1)",
          display: "flex", flexDirection: "column",
          padding: "22px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", paddingLeft: "2px" }}>
            <Logo />
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: "#f1f5f9", letterSpacing: "-0.2px" }}>Super Team</div>
              <div style={{ fontSize: "9.5px", fontWeight: "600", color: "#7c3aed", letterSpacing: "1.2px", textTransform: "uppercase", marginTop: "1px" }}>Resume Studio</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", padding: "0 4px", marginBottom: "6px" }}>
              Workspace
            </div>
            <NavLink icon="⚡" label="Generate"  href="/"          active={false} />
            <NavLink icon="👤" label="Profiles"  href="/profiles"  active={false} />
            <NavLink icon="📊" label="Dashboard" href="/dashboard" active={true}  />

            <div style={{ height: "1px", background: "rgba(139,92,246,0.08)", margin: "14px 0 10px" }} />
            <div style={{ fontSize: "10px", fontWeight: "600", color: "#374151", textTransform: "uppercase", letterSpacing: "0.8px", padding: "0 4px", marginBottom: "6px" }}>
              Account
            </div>
            <NavLink icon="🔑" label="License" href="/license" active={false} />
          </div>

          <div style={{ paddingLeft: "2px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} />
              <span style={{ fontSize: "11px", color: "#6b7280" }}>Backend online</span>
            </div>
            <div style={{ fontSize: "10px", color: "#374151" }}>Super Team v1.0.0</div>
          </div>
        </aside>

        {/* ──────────── MAIN ──────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Top bar */}
          <header style={{
            padding: "0 28px", height: "56px", flexShrink: 0,
            background: "rgba(8,6,26,0.6)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(139,92,246,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#f1f5f9" }}>Generation Dashboard</h1>
              <p style={{ fontSize: "11px", color: "#4b5563", marginTop: "1px" }}>Track resume generation across all profiles</p>
            </div>
            <button
              onClick={load}
              style={{
                padding: "7px 16px", fontSize: "12px", fontWeight: "600",
                background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)",
                borderRadius: "8px", color: "#a78bfa", cursor: "pointer",
              }}
            >
              ⟳ Refresh
            </button>
          </header>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px" }}>

            {loading && (
              <div style={{ textAlign: "center", padding: "80px 0", color: "#4b5563", fontSize: "14px" }}>
                Loading stats…
              </div>
            )}

            {error && (
              <div style={{ padding: "16px 20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "12px", color: "#f87171", fontSize: "14px", marginBottom: "24px" }}>
                {error} — Make sure the backend is running at <code style={{ fontFamily: "monospace", fontSize: "12px" }}>{API}</code>
              </div>
            )}

            {stats && (
              <>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "24px" }}>
                  <StatCard
                    icon="📄" label="Total Generated"
                    value={stats.totalGenerated} sub="all time"
                    gradient="linear-gradient(90deg,#a78bfa,#e879f9)"
                  />
                  <StatCard
                    icon="⚡" label="This Week"
                    value={stats.thisWeek} sub="last 7 days"
                    gradient="linear-gradient(90deg,#22d3ee,#10b981)"
                  />
                  <StatCard
                    icon="👤" label="Active Profiles"
                    value={stats.byProfile.length}
                    sub={topProfile ? `Top: ${topProfile.name} (${topProfile.count})` : "no data"}
                    gradient="linear-gradient(90deg,#fb923c,#f59e0b)"
                  />
                </div>

                {/* Bar chart card */}
                <div style={{
                  background: "rgba(139,92,246,0.04)",
                  border: "1px solid rgba(139,92,246,0.1)",
                  borderRadius: "16px",
                  padding: "22px 26px",
                  marginBottom: "20px",
                }}>
                  <div style={{ marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "15px", fontWeight: "600", color: "#e2d9ff" }}>Resumes by Profile</h2>
                    <p style={{ fontSize: "12px", color: "#4b5563", marginTop: "3px" }}>Total PDFs generated per user profile</p>
                  </div>

                  <BarChart data={stats.byProfile} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
