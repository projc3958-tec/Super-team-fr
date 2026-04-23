import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet, getUser, isAdmin, logout } from "../lib/api";

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

function TimeBarChart({ buckets, period }) {
  if (!buckets || buckets.length === 0) {
    return <p style={{ color:"#4b5563", fontSize:"13px", textAlign:"center", padding:"40px 0" }}>No activity in this period yet.</p>;
  }
  const max = Math.max(1, ...buckets.map(b => b.count));
  const w = 760, h = 220, pad = { l: 32, r: 12, t: 14, b: 30 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const barGap = 4;
  const barW = Math.max(6, innerW / buckets.length - barGap);
  const yTicks = 4;

  const labelOf = (b) => {
    if (period === "monthly") {
      const [y, m] = b.bucket.split("-");
      return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m,10)-1] || m} ${y.slice(2)}`;
    }
    if (period === "weekly") {
      return b.bucket.replace("-W", " W");
    }
    return b.bucket.slice(5); // MM-DD
  };

  return (
    <div style={{ width:"100%", overflowX:"auto" }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="xMidYMid meet" style={{ display:"block" }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a78bfa"/>
            <stop offset="100%" stopColor="#7c3aed"/>
          </linearGradient>
        </defs>
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const yv = Math.round((max * i) / yTicks);
          const y = pad.t + innerH - (innerH * i) / yTicks;
          return (
            <g key={i}>
              <line x1={pad.l} x2={pad.l + innerW} y1={y} y2={y} stroke="rgba(139,92,246,0.10)" strokeDasharray="3 4"/>
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#4b5563" fontFamily="Inter">{yv}</text>
            </g>
          );
        })}
        {buckets.map((b, i) => {
          const bh = (b.count / max) * innerH;
          const x = pad.l + i * (barW + barGap);
          const y = pad.t + innerH - bh;
          return (
            <g key={b.bucket}>
              <rect x={x} y={y} width={barW} height={bh} rx="3" fill="url(#barGrad)"/>
              <text x={x + barW / 2} y={pad.t + innerH + 14} textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="Inter">
                {labelOf(b)}
              </text>
              {b.count > 0 && bh > 12 && (
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="#c4b5fd" fontFamily="Inter">{b.count}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProfileBarList({ data }) {
  if (!data || data.length === 0) {
    return <p style={{ color:"#4b5563", fontSize:"13px", textAlign:"center", padding:"32px 0" }}>No profile activity yet.</p>;
  }
  const max = Math.max(1, ...data.map(d => d.count));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {data.map((d) => (
        <div key={d.name} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"160px", fontSize:"12.5px", color:"#cbd5e1", fontWeight:"500", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
          <div style={{ flex:1, height:"18px", background:"rgba(139,92,246,0.06)", borderRadius:"5px", overflow:"hidden", position:"relative" }}>
            <div style={{
              width: `${(d.count / max) * 100}%`,
              height:"100%",
              background:"linear-gradient(90deg,#7c3aed,#db2777)",
              borderRadius:"5px",
              transition:"width 0.3s",
            }}/>
          </div>
          <div style={{ width:"50px", textAlign:"right", fontSize:"13px", fontWeight:"700", color:"#a78bfa" }}>{d.count}</div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [period, setPeriod]     = useState("daily");
  const [scope, setScope]       = useState("mine");
  const [stats, setStats]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet(`/api/generations/stats?period=${period}&scope=${scope}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setStats(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [period, scope]);

  useEffect(() => { load(); }, [load]);

  const topProfile = stats?.byProfile?.[0];
  const periodLabel = { daily:"Daily (last 30 days)", weekly:"Weekly (last 12 weeks)", monthly:"Monthly (last 12 months)" }[period];

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

      <div style={{ display:"flex", height:"100vh", background:"#0c0a1e" }}>

        <aside style={{
          width:"220px", flexShrink:0,
          background:"#08061a",
          borderRight:"1px solid rgba(139,92,246,0.1)",
          display:"flex", flexDirection:"column",
          padding:"22px 14px",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"32px", paddingLeft:"2px" }}>
            <Logo />
            <div>
              <div style={{ fontSize:"15px", fontWeight:"700", color:"#f1f5f9", letterSpacing:"-0.2px" }}>Super Team</div>
              <div style={{ fontSize:"9.5px", fontWeight:"600", color:"#7c3aed", letterSpacing:"1.2px", textTransform:"uppercase", marginTop:"1px" }}>Resume Studio</div>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"3px", flex:1 }}>
            <div style={{ fontSize:"10px", fontWeight:"600", color:"#374151", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 4px", marginBottom:"6px" }}>Workspace</div>
            <NavLink icon="⚡" label="Generate"  href="/"          active={false} />
            <NavLink icon="👤" label="Profiles"  href="/profiles"  active={false} />
            <NavLink icon="🗂" label="History"   href="/history"   active={false} />
            <NavLink icon="📊" label="Dashboard" href="/dashboard" active={true}  />
            {isAdmin() && (
              <>
                <div style={{ height:"1px", background:"rgba(139,92,246,0.08)", margin:"14px 0 10px" }} />
                <div style={{ fontSize:"10px", fontWeight:"600", color:"#374151", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 4px", marginBottom:"6px" }}>Admin</div>
                <NavLink icon="👥" label="Users" href="/admin" active={false} />
              </>
            )}
          </div>
          <div style={{ paddingLeft:"2px" }}>
            <div style={{ fontSize:"11px", color:"#7c6fcd", marginBottom:"4px", fontWeight:"600", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{getUser()?.email || ""}</div>
            <button onClick={logout} style={{ fontSize:"11px", color:"#f87171", background:"transparent", border:"none", cursor:"pointer", padding:0, marginBottom:"6px" }}>Sign out →</button>
            <div style={{ fontSize:"10px", color:"#374151" }}>Super Team v1.0.0</div>
          </div>
        </aside>

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"rgba(8,6,26,0.6)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid rgba(139,92,246,0.08)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>Generation Dashboard</h1>
              <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"1px" }}>{periodLabel} · {scope === "all" ? "all profiles (cross-device)" : "your profiles only"}</p>
            </div>
            <button
              onClick={load}
              style={{
                padding:"7px 16px", fontSize:"12px", fontWeight:"600",
                background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)",
                borderRadius:"8px", color:"#a78bfa", cursor:"pointer",
              }}
            >⟳ Refresh</button>
          </header>

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>

            {/* Toggle row */}
            <div style={{ display:"flex", gap:"18px", flexWrap:"wrap", marginBottom:"18px" }}>
              <SegmentedControl
                label="Period"
                value={period}
                onChange={setPeriod}
                options={[
                  { value:"daily",   label:"Daily"   },
                  { value:"weekly",  label:"Weekly"  },
                  { value:"monthly", label:"Monthly" },
                ]}
              />
              <SegmentedControl
                label="Scope"
                value={scope}
                onChange={setScope}
                options={[
                  { value:"mine", label:"My profiles" },
                  { value:"all",  label:"All profiles" },
                ]}
              />
            </div>

            {error && (
              <div style={{ padding:"14px 18px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"#f87171", fontSize:"13px", marginBottom:"16px" }}>
                {error} — Make sure the backend is running and MongoDB is reachable.
              </div>
            )}

            {loading && !stats && (
              <div style={{ textAlign:"center", padding:"80px 0", color:"#4b5563", fontSize:"14px" }}>Loading stats…</div>
            )}

            {stats && (
              <>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"14px", marginBottom:"22px" }}>
                  <StatCard
                    icon="📄" label={`Total in ${period}`} value={stats.total.toLocaleString()}
                    sub={`since ${new Date(stats.since).toLocaleDateString()}`}
                    gradient="linear-gradient(90deg,#a78bfa,#e879f9)"
                  />
                  <StatCard
                    icon="✉️" label="With cover letter" value={stats.withCv.toLocaleString()}
                    sub={stats.total ? `${Math.round((stats.withCv / stats.total) * 100)}% of total` : "—"}
                    gradient="linear-gradient(90deg,#22d3ee,#10b981)"
                  />
                  <StatCard
                    icon="👤" label="Active Profiles" value={stats.byProfile.length}
                    sub={topProfile ? `Top: ${topProfile.name} (${topProfile.count})` : "no data"}
                    gradient="linear-gradient(90deg,#fb923c,#f59e0b)"
                  />
                </div>

                <div style={{
                  background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                  borderRadius:"16px", padding:"22px 26px", marginBottom:"20px",
                }}>
                  <div style={{ marginBottom:"16px" }}>
                    <h2 style={{ fontSize:"15px", fontWeight:"600", color:"#e2d9ff" }}>Generation activity over time</h2>
                    <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>{periodLabel}</p>
                  </div>
                  <TimeBarChart buckets={stats.buckets} period={period} />
                </div>

                <div style={{
                  background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                  borderRadius:"16px", padding:"22px 26px",
                }}>
                  <div style={{ marginBottom:"16px" }}>
                    <h2 style={{ fontSize:"15px", fontWeight:"600", color:"#e2d9ff" }}>By profile {scope === "all" && <span style={{ fontSize:"11px", color:"#7c6fcd", fontWeight:"500", marginLeft:"6px" }}>· cross-device counts (anonymous)</span>}</h2>
                    <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>Top profiles in the selected period</p>
                  </div>
                  <ProfileBarList data={stats.byProfile} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SegmentedControl({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"6px" }}>{label}</div>
      <div style={{ display:"inline-flex", background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:"9px", padding:"3px" }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding:"6px 14px", fontSize:"12px", fontWeight:"600",
              background: value === o.value ? "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" : "transparent",
              color: value === o.value ? "#fff" : "#94a3b8",
              border:"none", borderRadius:"7px", cursor:"pointer",
              transition:"all 0.15s",
            }}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}
