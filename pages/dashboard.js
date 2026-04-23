import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { apiGet } from "../lib/api";
import { INTERVIEW_STATUSES, INTERVIEW_RESULTS } from "../lib/interviews";

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
                <text x={x + barW / 2} y={y - 3} textAnchor="middle" fontSize="9" fill="var(--accent-2)" fontFamily="Inter">{b.count}</text>
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
          <div style={{ width:"160px", fontSize:"12.5px", color:"var(--text-2)", fontWeight:"500", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</div>
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
  const [period, setPeriod]         = useState("daily");
  const [scope, setScope]           = useState("mine");
  const [stats, setStats]           = useState(null);
  const [interviewStats, setInterviewStats] = useState(null);
  const [funnel, setFunnel]         = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsRes, ivRes, funnelRes] = await Promise.all([
        apiGet(`/api/generations/stats?period=${period}&scope=${scope}`),
        apiGet("/api/interviews/stats"),
        apiGet("/api/interviews/funnel"),
      ]);
      if (!statsRes.ok) throw new Error(await statsRes.text() || `HTTP ${statsRes.status}`);
      setStats(await statsRes.json());
      if (ivRes.ok) setInterviewStats(await ivRes.json());
      if (funnelRes.ok) setFunnel(await funnelRes.json());
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

      <div style={{ display:"flex", height:"100vh", background:"var(--bg)" }}>
        <Sidebar active="dashboard" />

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"var(--topbar-bg)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid rgba(139,92,246,0.08)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"var(--text)" }}>Generation Dashboard</h1>
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
                    <h2 style={{ fontSize:"15px", fontWeight:"600", color:"var(--accent-2)" }}>Generation activity over time</h2>
                    <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>{periodLabel}</p>
                  </div>
                  <TimeBarChart buckets={stats.buckets} period={period} />
                </div>

                <div style={{
                  background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                  borderRadius:"16px", padding:"22px 26px", marginBottom:"20px",
                }}>
                  <div style={{ marginBottom:"16px" }}>
                    <h2 style={{ fontSize:"15px", fontWeight:"600", color:"var(--accent-2)" }}>By profile {scope === "all" && <span style={{ fontSize:"11px", color:"var(--label)", fontWeight:"500", marginLeft:"6px" }}>· cross-device counts (anonymous)</span>}</h2>
                    <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>Top profiles in the selected period</p>
                  </div>
                  <ProfileBarList data={stats.byProfile} />
                </div>

                {interviewStats && (
                  <div style={{
                    background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                    borderRadius:"16px", padding:"22px 26px", marginBottom:"20px",
                  }}>
                    <div style={{ marginBottom:"16px", display:"flex", alignItems:"baseline", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
                      <div>
                        <h2 style={{ fontSize:"15px", fontWeight:"600", color:"var(--accent-2)" }}>Interview pipeline</h2>
                        <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>{interviewStats.total} total · {interviewStats.upcoming} upcoming</p>
                      </div>
                    </div>

                    <InterviewFunnel stats={interviewStats} />
                  </div>
                )}

                {funnel && (
                  <>
                    <div style={{
                      background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                      borderRadius:"16px", padding:"22px 26px", marginBottom:"20px",
                    }}>
                      <div style={{ marginBottom:"16px" }}>
                        <h2 style={{ fontSize:"15px", fontWeight:"600", color:"var(--accent-2)" }}>Conversion funnel</h2>
                        <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>Resumes generated → interviews scheduled → outcomes</p>
                      </div>
                      <ConversionFunnel funnel={funnel} />
                    </div>

                    <div style={{
                      background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                      borderRadius:"16px", padding:"22px 26px", marginBottom:"20px",
                    }}>
                      <div style={{ marginBottom:"16px" }}>
                        <h2 style={{ fontSize:"15px", fontWeight:"600", color:"var(--accent-2)" }}>Pass rate by interview type</h2>
                        <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>Share of decided rounds that advanced (passed or offer)</p>
                      </div>
                      <TypePassRates rows={funnel.byType} />
                    </div>

                    <div style={{
                      background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
                      borderRadius:"16px", padding:"22px 26px",
                    }}>
                      <div style={{ marginBottom:"16px" }}>
                        <h2 style={{ fontSize:"15px", fontWeight:"600", color:"var(--accent-2)" }}>Resumes vs interviews by profile</h2>
                        <p style={{ fontSize:"12px", color:"#4b5563", marginTop:"3px" }}>Interview rate per resume profile (interviews / resumes)</p>
                      </div>
                      <ProfileConversion rows={funnel.byProfile} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function pct(x) {
  if (x == null || !Number.isFinite(x)) return "—";
  return `${Math.round(x * 1000) / 10}%`;
}

function ConversionFunnel({ funnel }) {
  const { totals } = funnel;
  // 4-step funnel: Resumes → Interviews → Completed → Offers
  const steps = [
    { label: "Resumes generated",  value: totals.resumes,    color: "#a78bfa", basis: totals.resumes },
    { label: "Interviews scheduled", value: totals.interviews, color: "#22d3ee", basis: totals.resumes },
    { label: "Interviews completed", value: totals.completed,  color: "#10b981", basis: totals.interviews },
    { label: "Offers received",     value: totals.offers,     color: "#fb923c", basis: totals.interviews },
  ];
  const max = Math.max(1, totals.resumes, totals.interviews);
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      {steps.map((s, i) => {
        const ratio = s.basis > 0 ? s.value / s.basis : null;
        const widthPct = (s.value / max) * 100;
        const subline = i === 0
          ? "of all resumes"
          : i === 1 ? `${pct(ratio)} of resumes`
          : i === 2 ? `${pct(ratio)} of interviews`
          : `${pct(ratio)} of interviews`;
        return (
          <div key={s.label} style={{ display:"flex", alignItems:"center", gap:"14px" }}>
            <div style={{ width:"170px", fontSize:"12.5px", color:"var(--text-2)", fontWeight:"600" }}>{s.label}</div>
            <div style={{ flex:1, height:"24px", background:"var(--surface-2)", borderRadius:"6px", overflow:"hidden", position:"relative" }}>
              <div style={{
                width: `${widthPct}%`,
                height: "100%",
                background: s.color,
                borderRadius: "6px",
                transition: "width 0.3s",
              }}/>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", paddingLeft:"10px", fontSize:"12px", fontWeight:"700", color:"#fff", mixBlendMode:"luminosity" }}>{s.value}</div>
            </div>
            <div style={{ width:"110px", textAlign:"right", fontSize:"11.5px", color:"var(--text-muted)" }}>{subline}</div>
          </div>
        );
      })}
    </div>
  );
}

function TypePassRates({ rows }) {
  const labelByType = {
    hr: "HR / Recruiter",
    technical: "Technical",
    behavioral: "Behavioral",
    system_design: "System design",
    final: "Final / On-site",
    other: "Other",
  };
  const visible = rows.filter(r => r.scheduled > 0);
  if (visible.length === 0) {
    return <p style={{ color:"var(--text-faint)", fontSize:"13px", textAlign:"center", padding:"24px 0" }}>No interview rounds yet.</p>;
  }
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
      {visible.map(r => (
        <div key={r.type} style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:"160px", fontSize:"12.5px", color:"var(--text-2)", fontWeight:"500" }}>{labelByType[r.type] || r.type}</div>
          <div style={{ flex:1, height:"18px", background:"var(--surface-2)", borderRadius:"5px", overflow:"hidden" }}>
            <div style={{
              width: r.passRate != null ? `${r.passRate * 100}%` : "0%",
              height:"100%",
              background:"linear-gradient(90deg,#10b981,#22d3ee)",
              borderRadius:"5px",
              transition:"width 0.3s",
            }}/>
          </div>
          <div style={{ width:"170px", textAlign:"right", fontSize:"12px", color:"var(--text-muted)" }}>
            <strong style={{ color: r.passRate != null ? "#10b981" : "var(--text-faint)" }}>{pct(r.passRate)}</strong>
            <span style={{ marginLeft:"6px" }}>({r.passed} / {r.decided} decided · {r.scheduled} scheduled)</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileConversion({ rows }) {
  if (!rows || rows.length === 0) {
    return <p style={{ color:"var(--text-faint)", fontSize:"13px", textAlign:"center", padding:"24px 0" }}>No resumes generated yet.</p>;
  }
  const max = Math.max(1, ...rows.map(r => r.resumes));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
      <div style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr 80px", gap:"10px", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", paddingBottom:"4px", borderBottom:"1px solid var(--border-soft)" }}>
        <div>Profile</div>
        <div>Resumes</div>
        <div>Interviews</div>
        <div style={{ textAlign:"right" }}>Rate</div>
      </div>
      {rows.map(r => (
        <div key={r.name} style={{ display:"grid", gridTemplateColumns:"160px 1fr 1fr 80px", gap:"10px", alignItems:"center" }}>
          <div style={{ fontSize:"12.5px", color:"var(--text)", fontWeight:"600", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ flex:1, height:"14px", background:"var(--surface-2)", borderRadius:"4px", overflow:"hidden" }}>
              <div style={{ width: `${(r.resumes / max) * 100}%`, height:"100%", background:"#a78bfa", borderRadius:"4px" }}/>
            </div>
            <div style={{ width:"32px", textAlign:"right", fontSize:"12px", color:"var(--accent)", fontWeight:"700" }}>{r.resumes}</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <div style={{ flex:1, height:"14px", background:"var(--surface-2)", borderRadius:"4px", overflow:"hidden" }}>
              <div style={{ width: `${(r.interviews / max) * 100}%`, height:"100%", background:"#22d3ee", borderRadius:"4px" }}/>
            </div>
            <div style={{ width:"32px", textAlign:"right", fontSize:"12px", color:"#22d3ee", fontWeight:"700" }}>{r.interviews}</div>
          </div>
          <div style={{ textAlign:"right", fontSize:"12px", fontWeight:"700", color: r.rate > 0 ? "#10b981" : "var(--text-faint)" }}>{pct(r.rate)}</div>
        </div>
      ))}
    </div>
  );
}

function InterviewFunnel({ stats }) {
  const statusMap = Object.fromEntries((stats.byStatus || []).map(s => [s.status, s.count]));
  const resultMap = Object.fromEntries((stats.byResult || []).map(s => [s.result, s.count]));

  const statusRows = INTERVIEW_STATUSES.map(s => ({ label: s.label, color: s.color, count: statusMap[s.value] || 0 }));
  const resultRows = INTERVIEW_RESULTS.map(s => ({ label: s.label, color: s.color, count: resultMap[s.value] || 0 }));

  const statusMax = Math.max(1, ...statusRows.map(r => r.count));
  const resultMax = Math.max(1, ...resultRows.map(r => r.count));

  const Row = ({ label, color, count, max }) => (
    <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
      <div style={{ width:"110px", fontSize:"12.5px", color:"var(--text-2)", fontWeight:"500" }}>{label}</div>
      <div style={{ flex:1, height:"18px", background:"var(--surface-2)", borderRadius:"5px", overflow:"hidden" }}>
        <div style={{ width: `${(count / max) * 100}%`, height:"100%", background: color, borderRadius:"5px", transition:"width 0.3s" }}/>
      </div>
      <div style={{ width:"40px", textAlign:"right", fontSize:"13px", fontWeight:"700", color: count ? color : "var(--text-faint)" }}>{count}</div>
    </div>
  );

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"22px" }}>
      <div>
        <div style={{ fontSize:"11px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"10px" }}>By status</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
          {statusRows.map(r => <Row key={r.label} label={r.label} color={r.color} count={r.count} max={statusMax} />)}
        </div>
      </div>
      <div>
        <div style={{ fontSize:"11px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"10px" }}>By result</div>
        <div style={{ display:"flex", flexDirection:"column", gap:"7px" }}>
          {resultRows.map(r => <Row key={r.label} label={r.label} color={r.color} count={r.count} max={resultMax} />)}
        </div>
      </div>
    </div>
  );
}

function SegmentedControl({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"6px" }}>{label}</div>
      <div style={{ display:"inline-flex", background:"rgba(139,92,246,0.06)", border:"1px solid rgba(139,92,246,0.15)", borderRadius:"9px", padding:"3px" }}>
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            style={{
              padding:"6px 14px", fontSize:"12px", fontWeight:"600",
              background: value === o.value ? "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" : "transparent",
              color: value === o.value ? "#fff" : "var(--text-muted)",
              border:"none", borderRadius:"7px", cursor:"pointer",
              transition:"all 0.15s",
            }}
          >{o.label}</button>
        ))}
      </div>
    </div>
  );
}
