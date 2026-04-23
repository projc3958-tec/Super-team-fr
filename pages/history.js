import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiGet, apiFetch, getUser, isAdmin, logout } from "../lib/api";

const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" rx="11" fill="url(#hlg)"/>
    <path d="M21.5 6L12 21h7l-2.5 11 10-15h-7L21.5 6z" fill="white" fillOpacity="0.95"/>
    <defs>
      <linearGradient id="hlg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
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

const fieldBase = {
  width: "100%", padding: "9px 12px", fontSize: "13px",
  background: "rgba(12,10,30,0.7)", border: "1px solid rgba(139,92,246,0.18)",
  borderRadius: "9px", outline: "none", color: "#e2e8f0",
  transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const PAGE_SIZE = 25;

export default function History() {
  const [profiles, setProfiles]     = useState([]);
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [busyId, setBusyId]         = useState(null);
  const [q, setQ]                   = useState("");
  const [profileId, setProfileId]   = useState("");
  const [from, setFrom]             = useState("");
  const [to, setTo]                 = useState("");

  const load = useCallback(async (resetOffset = false) => {
    setLoading(true);
    setError("");
    try {
      const off = resetOffset ? 0 : offset;
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (profileId) params.set("profileId", profileId);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        params.set("to", toDate.toISOString());
      }
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(off));

      const res = await apiGet(`/api/generations?${params.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed (HTTP ${res.status})`);
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      if (resetOffset) setOffset(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, profileId, from, to, offset]);

  useEffect(() => {
    apiGet("/api/profiles").then(r => r.json()).then(setProfiles).catch(() => {});
  }, []);

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset]);

  const downloadOne = async (id, kind, fallbackName) => {
    setBusyId(`${id}:${kind}`);
    try {
      const res = await apiFetch(`/api/generations/${id}/${kind}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed: " + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const onApplyFilters = (e) => { e?.preventDefault?.(); load(true); };
  const onClearFilters = () => {
    setQ(""); setProfileId(""); setFrom(""); setTo("");
    setTimeout(() => load(true), 0);
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#0c0a1e; color:#f1f5f9; }
        input,select,textarea,button { font-family:inherit; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.35); border-radius:6px; }
        select option { background:#1c1733; color:#e2e8f0; }
        .nav-link:hover { background:rgba(139,92,246,0.1)!important; color:#c4b5fd!important; }
        .field:focus { border-color:rgba(139,92,246,0.55)!important; box-shadow:0 0 0 3px rgba(139,92,246,0.12)!important; }
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
            <NavLink icon="🗂" label="History"   href="/history"   active={true}  />
            <NavLink icon="📊" label="Dashboard" href="/dashboard" active={false} />
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
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>Resume History</h1>
              <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"1px" }}>{total.toLocaleString()} generations · search and filter</p>
            </div>
            <button
              onClick={() => load(false)}
              style={{
                padding:"7px 16px", fontSize:"12px", fontWeight:"600",
                background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)",
                borderRadius:"8px", color:"#a78bfa", cursor:"pointer",
              }}
            >⟳ Refresh</button>
          </header>

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>

            <form onSubmit={onApplyFilters} style={{
              display:"grid", gap:"10px",
              gridTemplateColumns:"2fr 1fr 1fr 1fr auto auto",
              alignItems:"end", marginBottom:"18px",
            }}>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Search</label>
                <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Job title, company, profile, template…" style={fieldBase} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Profile</label>
                <select className="field" value={profileId} onChange={e => setProfileId(e.target.value)} style={fieldBase}>
                  <option value="">All profiles</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>From</label>
                <input className="field" type="date" value={from} onChange={e => setFrom(e.target.value)} style={fieldBase} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>To</label>
                <input className="field" type="date" value={to} onChange={e => setTo(e.target.value)} style={fieldBase} />
              </div>
              <button type="submit" style={{
                padding:"10px 16px", fontSize:"12.5px", fontWeight:"700",
                background:"linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                border:"none", borderRadius:"9px", color:"#fff", cursor:"pointer", whiteSpace:"nowrap",
              }}>Apply</button>
              <button type="button" onClick={onClearFilters} style={{
                padding:"10px 14px", fontSize:"12.5px", fontWeight:"600",
                background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:"9px", color:"#f87171", cursor:"pointer", whiteSpace:"nowrap",
              }}>Clear</button>
            </form>

            {error && (
              <div style={{ padding:"14px 18px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"#f87171", fontSize:"13px", marginBottom:"16px" }}>
                {error}
              </div>
            )}

            <div style={{
              background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)",
              borderRadius:"14px", overflow:"hidden",
            }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                  <thead>
                    <tr style={{ background:"rgba(139,92,246,0.07)", color:"#7c6fcd", textAlign:"left" }}>
                      {["Date", "Profile", "Job Title", "Company", "Template", "Job Link", "Files"].map(h => (
                        <th key={h} style={{ padding:"11px 14px", fontSize:"10.5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.6px", borderBottom:"1px solid rgba(139,92,246,0.1)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && items.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:"13px" }}>Loading…</td></tr>
                    )}
                    {!loading && items.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:"13px" }}>No generations yet. Generate a tailored resume to see it listed here.</td></tr>
                    )}
                    {items.map((it) => (
                      <tr key={it.id} style={{ borderBottom:"1px solid rgba(139,92,246,0.06)" }}>
                        <td style={{ padding:"10px 14px", color:"#cbd5e1", whiteSpace:"nowrap" }}>{fmtDate(it.createdAt)}</td>
                        <td style={{ padding:"10px 14px", color:"#e2e8f0" }}>{it.profileName || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"#e2e8f0" }}>{it.jobTitle || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{it.companyName || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8" }}>{it.template || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8", maxWidth:"180px" }}>
                          {it.jobUrl
                            ? <a href={it.jobUrl} target="_blank" rel="noopener noreferrer" style={{ color:"#a78bfa", textDecoration:"none", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"inline-block", maxWidth:"170px", verticalAlign:"middle" }}>{it.jobUrl}</a>
                            : "—"}
                        </td>
                        <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                          <button
                            onClick={() => downloadOne(it.id, "resume", it.resumeFilename || `${it.id}.pdf`)}
                            disabled={busyId === `${it.id}:resume`}
                            style={{
                              padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                              background:"rgba(139,92,246,0.18)", border:"1px solid rgba(139,92,246,0.3)",
                              borderRadius:"7px", color:"#c4b5fd", cursor:"pointer", marginRight:"6px",
                            }}
                          >{busyId === `${it.id}:resume` ? "…" : "Resume"}</button>
                          {it.hasCv && (
                            <button
                              onClick={() => downloadOne(it.id, "cv", it.cvFilename || `${it.id}_CoverLetter.pdf`)}
                              disabled={busyId === `${it.id}:cv`}
                              style={{
                                padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                                background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.3)",
                                borderRadius:"7px", color:"#6ee7b7", cursor:"pointer",
                              }}
                            >{busyId === `${it.id}:cv` ? "…" : "CV"}</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {total > PAGE_SIZE && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:"14px", color:"#6b7280", fontSize:"12px" }}>
                <div>Page {page} of {totalPages} · {total.toLocaleString()} total</div>
                <div style={{ display:"flex", gap:"6px" }}>
                  <button
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                    disabled={offset === 0}
                    style={{
                      padding:"7px 14px", fontSize:"12px", fontWeight:"600",
                      background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)",
                      borderRadius:"7px", color: offset === 0 ? "#4b5563" : "#a78bfa", cursor: offset === 0 ? "not-allowed" : "pointer",
                    }}
                  >← Prev</button>
                  <button
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                    disabled={offset + PAGE_SIZE >= total}
                    style={{
                      padding:"7px 14px", fontSize:"12px", fontWeight:"600",
                      background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)",
                      borderRadius:"7px", color: offset + PAGE_SIZE >= total ? "#4b5563" : "#a78bfa", cursor: offset + PAGE_SIZE >= total ? "not-allowed" : "pointer",
                    }}
                  >Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
