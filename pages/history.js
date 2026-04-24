import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import { apiGet, apiFetch, apiPut, apiDelete } from "../lib/api";
import { typeLabel, statusMeta, resultMeta } from "../lib/interviews";

const fieldBase = {
  width: "100%", padding: "9px 12px", fontSize: "13px",
  background: "var(--field-bg)", border: "1px solid rgba(139,92,246,0.18)",
  borderRadius: "9px", outline: "none", color: "var(--text)",
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
  const router = useRouter();
  const [profiles, setProfiles]     = useState([]);
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [offset, setOffset]         = useState(0);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [busyId, setBusyId]         = useState(null);
  const [editing, setEditing]       = useState(null);  // generation row being edited (or null)
  const [editForm, setEditForm]     = useState({ jobTitle:"", companyName:"", jobUrl:"" });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError]   = useState("");
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

  const openEdit = (it) => {
    setEditing(it);
    setEditForm({ jobTitle: it.jobTitle || "", companyName: it.companyName || "", jobUrl: it.jobUrl || "" });
    setEditError("");
  };
  const closeEdit = () => { setEditing(null); setEditError(""); };

  const onSaveEdit = async () => {
    if (!editing || editSaving) return;
    setEditSaving(true);
    setEditError("");
    try {
      const res = await apiPut(`/api/generations/${editing.id}`, {
        jobTitle: editForm.jobTitle,
        companyName: editForm.companyName,
        jobUrl: editForm.jobUrl,
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      closeEdit();
      load(false);
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const onDeleteRow = async (it) => {
    if (!confirm(`Delete this generation for "${it.jobTitle || "—"}" at "${it.companyName || "—"}"? The resume and cover letter PDFs will also be removed from storage.`)) return;
    try {
      const res = await apiDelete(`/api/generations/${it.id}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      load(false);
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

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

      <div style={{ display:"flex", height:"100vh", background:"var(--bg)" }}>
        <Sidebar active="history" />

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"var(--topbar-bg)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid rgba(139,92,246,0.08)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"var(--text)" }}>Resume History</h1>
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
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Search</label>
                <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder="Job title, company, profile, template…" style={fieldBase} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Profile</label>
                <select className="field" value={profileId} onChange={e => setProfileId(e.target.value)} style={fieldBase}>
                  <option value="">All profiles</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>From</label>
                <input className="field" type="date" value={from} onChange={e => setFrom(e.target.value)} style={fieldBase} />
              </div>
              <div>
                <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>To</label>
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
                    <tr style={{ background:"rgba(139,92,246,0.07)", color:"var(--label)", textAlign:"left" }}>
                      {["Date", "Profile", "Job Title", "Company", "Template", "Job Link", "Files", "Interviews", ""].map((h, i) => (
                        <th key={i} style={{ padding:"11px 14px", fontSize:"10.5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.6px", borderBottom:"1px solid rgba(139,92,246,0.1)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && items.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:"13px" }}>Loading…</td></tr>
                    )}
                    {!loading && items.length === 0 && (
                      <tr><td colSpan={9} style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:"13px" }}>No generations yet. Generate a tailored resume to see it listed here.</td></tr>
                    )}
                    {items.map((it) => (
                      <tr key={it.id} style={{ borderBottom:"1px solid rgba(139,92,246,0.06)" }}>
                        <td style={{ padding:"10px 14px", color:"var(--text-2)", whiteSpace:"nowrap" }}>{fmtDate(it.createdAt)}</td>
                        <td style={{ padding:"10px 14px", color:"var(--text)" }}>{it.profileName || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"var(--text)" }}>{it.jobTitle || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"var(--text-muted)" }}>{it.companyName || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"var(--text-muted)" }}>{it.template || "—"}</td>
                        <td style={{ padding:"10px 14px", color:"var(--text-muted)", maxWidth:"180px" }}>
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
                              borderRadius:"7px", color:"var(--accent-2)", cursor:"pointer", marginRight:"6px",
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
                        <td style={{ padding:"10px 14px", maxWidth:"240px" }}>
                          <InterviewBadges interviews={it.interviews} onClick={() => router.push("/interviews")} />
                        </td>
                        <td style={{ padding:"10px 14px", whiteSpace:"nowrap", textAlign:"right" }}>
                          <button
                            onClick={() => openEdit(it)}
                            title="Edit metadata"
                            style={{
                              padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                              background:"var(--surface-3)", border:"1px solid var(--border)",
                              borderRadius:"7px", color:"var(--accent-2)", cursor:"pointer", marginRight:"6px",
                            }}
                          >Edit</button>
                          <button
                            onClick={() => onDeleteRow(it)}
                            title="Delete generation + PDFs"
                            style={{
                              padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                              background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.30)",
                              borderRadius:"7px", color:"var(--danger)", cursor:"pointer",
                            }}
                          >Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {total > PAGE_SIZE && (
              <Pager total={total} pageSize={PAGE_SIZE} offset={offset} setOffset={setOffset} />
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000 }}>
          <div style={{
            width:"100%", maxWidth:"480px",
            background:"var(--bg-deep)", border:"1px solid var(--border)",
            borderRadius:"14px", padding:"22px 24px",
          }}>
            <div style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)", marginBottom:"4px" }}>Edit generation</div>
            <div style={{ fontSize:"11.5px", color:"var(--text-muted)", marginBottom:"14px" }}>
              {editing.profileName || "—"} · {editing.template || "—"} · {fmtDate(editing.createdAt)}
            </div>

            <div style={{ marginBottom:"10px" }}>
              <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Job title</label>
              <input className="field" value={editForm.jobTitle} onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))} style={fieldBase} />
            </div>
            <div style={{ marginBottom:"10px" }}>
              <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Company</label>
              <input className="field" value={editForm.companyName} onChange={e => setEditForm(f => ({ ...f, companyName: e.target.value }))} style={fieldBase} />
            </div>
            <div style={{ marginBottom:"14px" }}>
              <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Job link</label>
              <input className="field" value={editForm.jobUrl} onChange={e => setEditForm(f => ({ ...f, jobUrl: e.target.value }))} placeholder="https://…" style={fieldBase} />
            </div>

            {editError && (
              <div style={{ padding:"10px 12px", marginBottom:"12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"9px", color:"var(--danger)", fontSize:"12.5px" }}>{editError}</div>
            )}

            <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end" }}>
              <button onClick={closeEdit} style={{
                padding:"9px 16px", fontSize:"12.5px", fontWeight:"600",
                background:"transparent", border:"1px solid var(--border)",
                borderRadius:"9px", color:"var(--label)", cursor:"pointer",
              }}>Cancel</button>
              <button onClick={onSaveEdit} disabled={editSaving} style={{
                padding:"9px 18px", fontSize:"12.5px", fontWeight:"700",
                background: editSaving ? "rgba(109,40,217,0.45)" : "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                border:"none", borderRadius:"9px", color:"#fff",
                cursor: editSaving ? "not-allowed" : "pointer",
              }}>{editSaving ? "Saving…" : "Save changes"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InterviewBadges({ interviews, onClick }) {
  if (!interviews || interviews.length === 0) {
    return <span style={{ fontSize:"11.5px", color:"var(--text-faint)" }}>—</span>;
  }
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
      {interviews.map((iv) => {
        // Color by result if known, else by status.
        const meta = iv.result && iv.result !== "pending" ? resultMeta(iv.result) : statusMeta(iv.status);
        const t = typeLabel(iv.type);
        // Compact label: "HR · Passed" or "HR · Scheduled"
        const sub = iv.result && iv.result !== "pending" ? resultMeta(iv.result).label : statusMeta(iv.status).label;
        return (
          <span
            key={iv.id}
            onClick={onClick}
            title={`${t} (round ${iv.round}) — ${sub} · ${new Date(iv.scheduledAt).toLocaleString()}`}
            style={{
              fontSize:"11px", fontWeight:"600",
              padding:"3px 7px", borderRadius:"6px",
              color: meta.color, background:`${meta.color}1a`, border:`1px solid ${meta.color}40`,
              cursor:"pointer", whiteSpace:"nowrap",
            }}
          >{t} · {sub}</span>
        );
      })}
    </div>
  );
}

function Pager({ total, pageSize, offset, setOffset }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.floor(offset / pageSize) + 1;
  const goto = (p) => setOffset(Math.max(0, Math.min(totalPages - 1, p - 1)) * pageSize);

  // Build a windowed page list: 1, …, p-2, p-1, p, p+1, p+2, …, totalPages.
  const pages = [];
  const push = (n) => pages.push(n);
  const window = 2;
  push(1);
  if (page - window > 2) push("…l");
  for (let i = Math.max(2, page - window); i <= Math.min(totalPages - 1, page + window); i++) push(i);
  if (page + window < totalPages - 1) push("…r");
  if (totalPages > 1) push(totalPages);

  const btn = (active) => ({
    minWidth:"32px", padding:"6px 10px", fontSize:"12px", fontWeight:"600",
    background: active ? "var(--accent-soft)" : "var(--surface-2)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
    borderRadius:"7px",
    color: active ? "var(--accent-2)" : "var(--accent)",
    cursor:"pointer",
  });

  const [jump, setJump] = useState("");

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", marginTop:"14px", color:"var(--text-muted)", fontSize:"12px", flexWrap:"wrap" }}>
      <div>Page <strong style={{ color:"var(--text-2)" }}>{page}</strong> of {totalPages} · {total.toLocaleString()} total</div>
      <div style={{ display:"flex", gap:"4px", alignItems:"center", flexWrap:"wrap" }}>
        <button onClick={() => goto(page - 1)} disabled={page === 1} style={{ ...btn(false), opacity: page === 1 ? 0.4 : 1, cursor: page === 1 ? "not-allowed" : "pointer" }}>← Prev</button>
        {pages.map((p, i) =>
          typeof p === "number"
            ? <button key={i} onClick={() => goto(p)} style={btn(p === page)}>{p}</button>
            : <span key={i} style={{ color:"var(--text-faint)", padding:"0 4px" }}>…</span>
        )}
        <button onClick={() => goto(page + 1)} disabled={page === totalPages} style={{ ...btn(false), opacity: page === totalPages ? 0.4 : 1, cursor: page === totalPages ? "not-allowed" : "pointer" }}>Next →</button>

        <span style={{ marginLeft:"10px", color:"var(--text-faint)" }}>Go to</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={jump}
          onChange={e => setJump(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              const n = parseInt(jump, 10);
              if (Number.isFinite(n)) { goto(n); setJump(""); }
            }
          }}
          placeholder="#"
          style={{
            width:"60px", padding:"5px 8px", fontSize:"12px",
            background:"var(--field-bg)", border:"1px solid var(--border)",
            borderRadius:"6px", color:"var(--text)", outline:"none",
          }}
        />
      </div>
    </div>
  );
}
