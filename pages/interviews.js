import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api";
import {
  INTERVIEW_TYPES, INTERVIEW_STATUSES, INTERVIEW_RESULTS,
  typeLabel, statusMeta, resultMeta,
} from "../lib/interviews";
import { TIMEZONES, utcToInputInTz, inputInTzToISO, getPreferredTimezone } from "../lib/tz";

const fieldBase = {
  width: "100%", padding: "9px 12px", fontSize: "13px",
  background: "var(--field-bg)", border: "1px solid var(--border)",
  borderRadius: "9px", outline: "none", color: "var(--text)",
  transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit",
};

function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function emptyForm() {
  return {
    title: "",
    type: "hr",
    round: 1,
    status: "scheduled",
    result: "pending",
    scheduledAt: "",
    timezone: typeof window === "undefined" ? "Asia/Shanghai" : getPreferredTimezone(),
    durationMinutes: 45,
    location: "",
    interviewer: "",
    notes: "",
    generationId: "",
    jobTitle: "",
    companyName: "",
  };
}

function Pill({ color, label }) {
  return (
    <span style={{
      fontSize:"11px", fontWeight:"600",
      padding:"3px 8px", borderRadius:"6px",
      color, background:`${color}1a`, border:`1px solid ${color}40`,
    }}>{label}</span>
  );
}

export default function InterviewsPage() {
  const router = useRouter();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [history, setHistory]   = useState([]); // recent generations for the picker
  const [userFilter, setUserFilter] = useState("me"); // "me" | "all" | <userId>
  const [directory, setDirectory]   = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (userFilter && userFilter !== "me") params.set("userId", userFilter);
      const qs = params.toString();
      const res = await apiGet(`/api/interviews${qs ? "?" + qs : ""}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userFilter]);

  useEffect(() => {
    refresh();
    apiGet("/api/generations?limit=100&offset=0").then(r => r.json()).then(d => setHistory(d.items || [])).catch(() => {});
    apiGet("/api/users/directory").then(r => r.ok ? r.json() : []).then(setDirectory).catch(() => {});
  }, [refresh]);

  // Allow ?for=<generationId> to open the modal pre-linked to a resume.
  useEffect(() => {
    const gid = router.query?.for;
    if (gid && history.length) {
      const gen = history.find(h => h.id === gid);
      openCreate({
        generationId: String(gid),
        jobTitle: gen?.jobTitle || "",
        companyName: gen?.companyName || "",
      });
      router.replace("/interviews", undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query, history]);

  const openCreate = (overrides = {}) => {
    setEditingId(null);
    setForm({ ...emptyForm(), ...overrides });
    setShowModal(true);
  };

  const openEdit = (it) => {
    const tz = it.timezone || getPreferredTimezone();
    setEditingId(it.id);
    setForm({
      title: it.title || "",
      type: it.type,
      round: it.round,
      status: it.status,
      result: it.result,
      scheduledAt: utcToInputInTz(new Date(it.scheduledAt), tz),
      timezone: tz,
      durationMinutes: it.durationMinutes || 45,
      location: it.location || "",
      interviewer: it.interviewer || "",
      notes: it.notes || "",
      generationId: it.generationId || "",
      jobTitle: it.jobTitle || "",
      companyName: it.companyName || "",
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setError(""); };

  const onSave = async () => {
    if (saving) return;
    if (!form.scheduledAt) { setError("Date & time is required."); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        round: Number(form.round) || 1,
        durationMinutes: Number(form.durationMinutes) || 45,
        scheduledAt: inputInTzToISO(form.scheduledAt, form.timezone),
      };
      if (!payload.scheduledAt) { setError("Date & time is invalid."); return; }
      if (!payload.generationId) delete payload.generationId;
      const res = editingId
        ? await apiPut(`/api/interviews/${editingId}`, payload)
        : await apiPost("/api/interviews", payload);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      await refresh();
      closeModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (it) => {
    if (!confirm(`Delete this ${typeLabel(it.type)} interview at ${fmtDateTime(it.scheduledAt)}?`)) return;
    try {
      const res = await apiDelete(`/api/interviews/${it.id}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) { alert("Delete failed: " + err.message); }
  };

  const upcoming = items.filter(i => new Date(i.scheduledAt) >= new Date() && (i.status === "scheduled" || i.status === "rescheduled"));
  const past = items.filter(i => !upcoming.includes(i));

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }
        ::-webkit-scrollbar { width:5px; }
        select option { background:var(--bg-deep); color:var(--text); }
        .nav-link:hover { background:var(--surface-3)!important; color:var(--accent-2)!important; }
        .field:focus { border-color:var(--accent)!important; box-shadow:0 0 0 3px var(--accent-soft)!important; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"var(--bg)" }}>
        <Sidebar active="interviews" />

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"var(--topbar-bg)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid var(--border-soft)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"var(--text)" }}>Interviews</h1>
              <p style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"1px" }}>{upcoming.length} upcoming · {past.length} past</p>
            </div>
            <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
              <select
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                title="Show interviews of"
                style={{
                  padding:"7px 12px", fontSize:"12.5px", fontWeight:"600",
                  background:"var(--surface-2)", border:"1px solid var(--border)",
                  borderRadius:"8px", color:"var(--accent)", cursor:"pointer",
                  fontFamily:"inherit", outline:"none",
                }}
              >
                <option value="me">Just me</option>
                <option value="all">All users</option>
                <option disabled>──────────</option>
                {(directory || []).map((u) => (
                  <option key={u.id} value={u.id}>{u.name || u.email}</option>
                ))}
              </select>
              <button
                onClick={() => openCreate()}
                style={{
                  padding:"8px 16px", fontSize:"12.5px", fontWeight:"700",
                  background:"linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                  border:"none", borderRadius:"9px", color:"#fff", cursor:"pointer",
                }}
              >+ Schedule interview</button>
            </div>
          </header>

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>

            {error && !showModal && (
              <div style={{ padding:"12px 16px", marginBottom:"14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"var(--danger)", fontSize:"13px" }}>{error}</div>
            )}

            <Section title="Upcoming" items={upcoming} loading={loading} onEdit={openEdit} onDelete={onDelete} />
            <Section title="Past / Other" items={past} loading={loading} onEdit={openEdit} onDelete={onDelete} />
          </div>
        </div>
      </div>

      {showModal && (
        <Modal
          title={editingId ? "Edit interview" : "Schedule interview"}
          form={form}
          setForm={setForm}
          history={history}
          error={error}
          saving={saving}
          onCancel={closeModal}
          onSave={onSave}
          isEditing={Boolean(editingId)}
        />
      )}
    </>
  );
}

function Section({ title, items, loading, onEdit, onDelete }) {
  return (
    <div style={{ marginBottom:"22px" }}>
      <h2 style={{ fontSize:"12px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:"10px" }}>{title} <span style={{ color:"var(--text-faint)", fontWeight:"500", marginLeft:"6px" }}>{items.length}</span></h2>
      {loading && items.length === 0 ? (
        <div style={{ padding:"24px 0", textAlign:"center", color:"var(--text-faint)", fontSize:"13px" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding:"24px 0", textAlign:"center", color:"var(--text-faint)", fontSize:"13px" }}>None.</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
          {items.map(it => {
            const sm = statusMeta(it.status);
            const rm = resultMeta(it.result);
            return (
              <div key={it.id} style={{
                display:"grid", gridTemplateColumns:"180px 140px 1fr 1fr auto",
                gap:"14px", alignItems:"center",
                padding:"12px 16px",
                background:"var(--surface)", border:"1px solid var(--border)",
                borderRadius:"11px",
              }}>
                <div>
                  <div style={{ fontSize:"13px", color:"var(--text)", fontWeight:"600" }}>{fmtDateTime(it.scheduledAt)}</div>
                  {it.durationMinutes && <div style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"2px" }}>{it.durationMinutes} min</div>}
                </div>
                <div>
                  <div style={{ fontSize:"13px", color:"var(--text)" }}>{typeLabel(it.type)}</div>
                  <div style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"2px" }}>Round {it.round}</div>
                </div>
                <div>
                  <div style={{ fontSize:"13px", color:"var(--text)" }}>{it.title || it.jobTitle || "—"}</div>
                  <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
                    {it.companyName || (it.title && it.jobTitle ? it.jobTitle : "—")}
                    {it.ownerEmail && <span style={{ color:"var(--text-faint)", marginLeft:"6px" }}>· {it.ownerEmail}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
                  <Pill color={sm.color} label={sm.label} />
                  <Pill color={rm.color} label={rm.label} />
                </div>
                <div style={{ display:"flex", gap:"6px", whiteSpace:"nowrap" }}>
                  {!it.ownerId ? (
                    <>
                      <button onClick={() => onEdit(it)} style={{
                        padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                        background:"var(--surface-3)", border:"1px solid var(--border)",
                        borderRadius:"7px", color:"var(--accent-2)", cursor:"pointer",
                      }}>Edit</button>
                      <button onClick={() => onDelete(it)} style={{
                        padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                        background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.30)",
                        borderRadius:"7px", color:"var(--danger)", cursor:"pointer",
                      }}>Delete</button>
                    </>
                  ) : (
                    <span style={{ fontSize:"11px", color:"var(--text-faint)", padding:"5px 0" }}>read-only</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Modal({ title, form, setForm, history, error, saving, onCancel, onSave, isEditing }) {
  const ch = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000 }}>
      <div style={{
        width:"100%", maxWidth:"560px",
        background:"var(--bg-deep)", border:"1px solid var(--border)",
        borderRadius:"14px", padding:"20px 22px",
        maxHeight:"90vh", overflowY:"auto",
      }}>
        <div style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)", marginBottom:"16px" }}>{title}</div>

        <Field label="Event title">
          <input className="field" value={form.title} onChange={e => ch("title", e.target.value)} placeholder="e.g. Technical Interview with Acme" style={fieldBase} />
        </Field>

        <Field label="Linked resume (optional)">
          <ResumeCombobox
            value={form.generationId}
            options={history}
            onChange={(gid) => {
              const gen = history.find(h => h.id === gid);
              setForm(f => ({
                ...f,
                generationId: gid,
                jobTitle: gid && gen ? gen.jobTitle || f.jobTitle : f.jobTitle,
                companyName: gid && gen ? gen.companyName || f.companyName : f.companyName,
              }));
            }}
          />
        </Field>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <Field label="Job title">
            <input className="field" value={form.jobTitle} onChange={e => ch("jobTitle", e.target.value)} placeholder="Senior Engineer" style={fieldBase} />
          </Field>
          <Field label="Company">
            <input className="field" value={form.companyName} onChange={e => ch("companyName", e.target.value)} placeholder="Acme Corp" style={fieldBase} />
          </Field>
          <Field label="Type">
            <select className="field" value={form.type} onChange={e => ch("type", e.target.value)} style={fieldBase}>
              {INTERVIEW_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Round">
            <input className="field" type="number" min="1" max="20" value={form.round} onChange={e => ch("round", e.target.value)} style={fieldBase} />
          </Field>
          <Field label="Date & time">
            <input className="field" type="datetime-local" value={form.scheduledAt} onChange={e => ch("scheduledAt", e.target.value)} style={fieldBase} />
          </Field>
          <Field label="Timezone">
            <select className="field" value={form.timezone} onChange={e => ch("timezone", e.target.value)} style={fieldBase}>
              {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Duration (min)">
            <input className="field" type="number" min="5" max="600" value={form.durationMinutes} onChange={e => ch("durationMinutes", e.target.value)} style={fieldBase} />
          </Field>
          <Field label="Status">
            <select className="field" value={form.status} onChange={e => ch("status", e.target.value)} style={fieldBase}>
              {INTERVIEW_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Result">
            <select className="field" value={form.result} onChange={e => ch("result", e.target.value)} style={fieldBase}>
              {INTERVIEW_RESULTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Location / link">
          <input className="field" value={form.location} onChange={e => ch("location", e.target.value)} placeholder="Zoom URL, office address, etc." style={fieldBase} />
        </Field>
        <Field label="Interviewer(s)">
          <input className="field" value={form.interviewer} onChange={e => ch("interviewer", e.target.value)} placeholder="Names, titles" style={fieldBase} />
        </Field>
        <Field label="Notes">
          <textarea className="field" value={form.notes} onChange={e => ch("notes", e.target.value)} placeholder="Prep notes, debrief, follow-ups…" rows={4} style={{ ...fieldBase, resize:"vertical", lineHeight:"1.45" }} />
        </Field>

        {error && (
          <div style={{ padding:"10px 12px", marginTop:"4px", marginBottom:"10px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"9px", color:"var(--danger)", fontSize:"12.5px" }}>{error}</div>
        )}

        <div style={{ display:"flex", gap:"8px", justifyContent:"flex-end", marginTop:"14px" }}>
          <button onClick={onCancel} style={{
            padding:"9px 16px", fontSize:"12.5px", fontWeight:"600",
            background:"transparent", border:"1px solid var(--border)",
            borderRadius:"9px", color:"var(--label)", cursor:"pointer",
          }}>Cancel</button>
          <button onClick={onSave} disabled={saving} style={{
            padding:"9px 18px", fontSize:"12.5px", fontWeight:"700",
            background: saving ? "rgba(109,40,217,0.45)" : "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
            border:"none", borderRadius:"9px", color:"#fff",
            cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Saving…" : isEditing ? "Save changes" : "Create interview"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:"10px" }}>
      <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>{label}</label>
      {children}
    </div>
  );
}

// Searchable single-select for "Linked resume". Filters as the user types.
function ResumeCombobox({ value, options, onChange }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");

  const selected = value ? options.find((o) => o.id === value) : null;

  const labelOf = (o) => `${o.companyName || "—"} · ${o.jobTitle || "—"}`;
  const subOf = (o) => {
    if (!o.createdAt) return "";
    try { return new Date(o.createdAt).toLocaleDateString(); } catch { return ""; }
  };

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50);
    return options.filter((o) => {
      const blob = `${o.companyName || ""} ${o.jobTitle || ""} ${o.profileName || ""} ${o.template || ""}`.toLowerCase();
      return blob.includes(q);
    }).slice(0, 50);
  })();

  return (
    <div style={{ position:"relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width:"100%", padding:"9px 12px", fontSize:"13px",
          background:"var(--field-bg)", border:"1px solid var(--border)",
          borderRadius:"9px", color:"var(--text)", textAlign:"left",
          cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", gap:"8px",
          fontFamily:"inherit",
        }}
      >
        <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color: selected ? "var(--text)" : "var(--text-muted)" }}>
          {selected ? labelOf(selected) : "Not linked to a generated resume"}
        </span>
        <span style={{ display:"flex", gap:"6px", alignItems:"center" }}>
          {selected && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              title="Unlink"
              style={{ fontSize:"11px", color:"var(--danger)", padding:"0 4px", lineHeight:"14px" }}
            >×</span>
          )}
          <span style={{ fontSize:"10px", color:"var(--text-muted)" }}>▾</span>
        </span>
      </button>

      {open && (
        <div style={{
          position:"absolute", left:0, right:0, top:"100%", marginTop:"4px",
          background:"var(--bg-deep)", border:"1px solid var(--border)",
          borderRadius:"10px", boxShadow:"0 8px 24px rgba(0,0,0,0.35)",
          maxHeight:"260px", display:"flex", flexDirection:"column", overflow:"hidden",
          zIndex:10,
        }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, job title, profile, template…"
            style={{
              padding:"9px 12px", fontSize:"12.5px",
              background:"var(--field-bg)", border:"none", borderBottom:"1px solid var(--border-soft)",
              outline:"none", color:"var(--text)", fontFamily:"inherit",
            }}
          />
          <div style={{ overflowY:"auto", flex:1 }}>
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              style={{
                width:"100%", textAlign:"left",
                padding:"8px 12px", fontSize:"12.5px",
                background:"transparent", border:"none",
                color:"var(--text-muted)", cursor:"pointer", fontFamily:"inherit",
                borderBottom:"1px solid var(--border-soft)",
              }}
            >Not linked</button>
            {filtered.length === 0 ? (
              <div style={{ padding:"14px", fontSize:"12px", color:"var(--text-faint)", textAlign:"center" }}>No matching resumes.</div>
            ) : (
              filtered.map((o) => {
                const isSelected = o.id === value;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { onChange(o.id); setOpen(false); setQuery(""); }}
                    style={{
                      width:"100%", textAlign:"left",
                      padding:"8px 12px", fontSize:"12.5px",
                      background: isSelected ? "var(--accent-soft)" : "transparent",
                      border:"none", color:"var(--text)",
                      cursor:"pointer", fontFamily:"inherit",
                      borderBottom:"1px solid var(--border-soft)",
                    }}
                  >
                    <div style={{ fontWeight:"600" }}>{labelOf(o)}</div>
                    <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
                      {o.profileName || "—"}{o.template ? ` · ${o.template}` : ""}{subOf(o) ? ` · ${subOf(o)}` : ""}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
