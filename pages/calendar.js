import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import Sidebar from "../components/Sidebar";
import { apiGet, apiPost } from "../lib/api";
import {
  INTERVIEW_TYPES, INTERVIEW_STATUSES, INTERVIEW_RESULTS,
  typeLabel, statusMeta,
  toLocalInput, fromLocalInput,
} from "../lib/interviews";

const fieldBase = {
  width: "100%", padding: "9px 12px", fontSize: "13px",
  background: "var(--field-bg)", border: "1px solid var(--border)",
  borderRadius: "9px", outline: "none", color: "var(--text)",
  fontFamily: "inherit",
};

const TYPE_COLORS = {
  hr:            "#a78bfa",
  technical:     "#22d3ee",
  behavioral:    "#fb923c",
  system_design: "#10b981",
  final:         "#db2777",
  other:         "#94a3b8",
};

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d)   { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function ymd(d)          { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function CalendarPage() {
  const router = useRouter();
  const [cursor, setCursor]     = useState(() => startOfMonth(new Date()));
  const [mine, setMine]         = useState([]);
  const [others, setOthers]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState(null);
  const [saving, setSaving]     = useState(false);

  // Build a 6-row grid (42 cells) starting on the Sunday before the 1st.
  const cells = useMemo(() => {
    const first = startOfMonth(cursor);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Pad both ends so events on grid edges still show.
      const from = cells[0];
      const to = new Date(cells[cells.length - 1]);
      to.setHours(23, 59, 59, 999);
      const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
      const [mineRes, othersRes] = await Promise.all([
        apiGet(`/api/interviews?${params.toString()}`),
        apiGet(`/api/interviews/others?${params.toString()}`),
      ]);
      if (!mineRes.ok) throw new Error(await mineRes.text() || `HTTP ${mineRes.status}`);
      const mineData = await mineRes.json();
      setMine(mineData.items || []);
      if (othersRes.ok) {
        const od = await othersRes.json();
        setOthers(od.items || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cells]);

  useEffect(() => { refresh(); }, [refresh]);

  // Group events by ymd.
  const byDate = useMemo(() => {
    const m = {};
    for (const ev of mine)  { const k = ymd(new Date(ev.scheduledAt)); (m[k] ||= { mine: [], others: [] }).mine.push(ev); }
    for (const ev of others){ const k = ymd(new Date(ev.scheduledAt)); (m[k] ||= { mine: [], others: [] }).others.push(ev); }
    return m;
  }, [mine, others]);

  const today = ymd(new Date());
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const openQuickAdd = (date) => {
    const at = new Date(date);
    at.setHours(10, 0, 0, 0);
    setQuickForm({
      type: "hr",
      round: 1,
      status: "scheduled",
      result: "pending",
      scheduledAt: toLocalInput(at.toISOString()),
      durationMinutes: 45,
      location: "",
      interviewer: "",
      notes: "",
      jobTitle: "",
      companyName: "",
    });
    setShowQuickAdd(true);
  };

  const onSaveQuick = async () => {
    if (saving || !quickForm) return;
    setSaving(true);
    try {
      const payload = {
        ...quickForm,
        round: Number(quickForm.round) || 1,
        durationMinutes: Number(quickForm.durationMinutes) || 45,
        scheduledAt: fromLocalInput(quickForm.scheduledAt),
      };
      const res = await apiPost("/api/interviews", payload);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setShowQuickAdd(false);
      setQuickForm(null);
      refresh();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const dayEvents = selectedDay ? byDate[selectedDay] : null;

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
        .day-cell:hover { background:var(--surface-2)!important; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"var(--bg)" }}>
        <Sidebar active="calendar" />

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"var(--topbar-bg)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid var(--border-soft)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"var(--text)" }}>Calendar</h1>
              <p style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"1px" }}>{mine.length} of yours · {others.length} from other users (anonymized)</p>
            </div>
            <div style={{ display:"flex", gap:"6px", alignItems:"center" }}>
              <SyncFromGoogleButton onDone={refresh} />
              <button onClick={() => setCursor(addMonths(cursor, -1))} style={navBtn}>← Prev</button>
              <button onClick={() => setCursor(startOfMonth(new Date()))} style={navBtn}>Today</button>
              <button onClick={() => setCursor(addMonths(cursor, 1))} style={navBtn}>Next →</button>
            </div>
          </header>

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"14px" }}>
              <div style={{ fontSize:"22px", fontWeight:"700", color:"var(--text)" }}>{monthLabel}</div>
              <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
                {Object.entries(TYPE_COLORS).map(([k, c]) => (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"11px", color:"var(--text-muted)" }}>
                    <span style={{ width:"10px", height:"10px", borderRadius:"3px", background:c, display:"inline-block" }} />
                    {typeLabel(k)}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div style={{ padding:"12px 16px", marginBottom:"14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"var(--danger)", fontSize:"13px" }}>{error}</div>
            )}

            <div style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"14px", overflow:"hidden",
            }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom:"1px solid var(--border-soft)" }}>
                {WEEKDAYS.map(w => (
                  <div key={w} style={{ padding:"10px 12px", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", textAlign:"center" }}>{w}</div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gridAutoRows:"minmax(96px, 1fr)" }}>
                {cells.map((d, i) => {
                  const k = ymd(d);
                  const isOtherMonth = d.getMonth() !== cursor.getMonth();
                  const isToday = k === today;
                  const events = byDate[k] || { mine: [], others: [] };
                  return (
                    <div
                      key={i}
                      className="day-cell"
                      onClick={() => setSelectedDay(k)}
                      style={{
                        padding:"6px 7px",
                        borderRight:"1px solid var(--border-soft)",
                        borderTop:"1px solid var(--border-soft)",
                        background: isToday ? "var(--surface-2)" : "transparent",
                        opacity: isOtherMonth ? 0.45 : 1,
                        cursor:"pointer",
                        position:"relative",
                        minHeight:"96px",
                        overflow:"hidden",
                      }}
                    >
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"4px" }}>
                        <span style={{ fontSize:"12px", fontWeight: isToday ? "700" : "500", color: isToday ? "var(--accent)" : "var(--text-2)" }}>{d.getDate()}</span>
                        {!isOtherMonth && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openQuickAdd(d); }}
                            style={{ width:"18px", height:"18px", lineHeight:"15px", textAlign:"center", padding:0, fontSize:"13px", color:"var(--accent)", background:"transparent", border:"1px dashed var(--border)", borderRadius:"5px", cursor:"pointer" }}
                            title="Add interview"
                          >+</button>
                        )}
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:"2px" }}>
                        {events.mine.slice(0, 3).map((ev) => (
                          <div key={ev.id} style={{
                            fontSize:"10.5px", padding:"2px 5px", borderRadius:"4px",
                            color:"#fff",
                            background: TYPE_COLORS[ev.type] || "var(--text-muted)",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                            opacity: ev.status === "cancelled" ? 0.5 : 1,
                            textDecoration: ev.status === "cancelled" ? "line-through" : "none",
                          }}>
                            {new Date(ev.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {ev.companyName || typeLabel(ev.type)}
                          </div>
                        ))}
                        {events.others.slice(0, 2).map((ev) => (
                          <div key={ev.id} style={{
                            fontSize:"10.5px", padding:"2px 5px", borderRadius:"4px",
                            color:"var(--text-muted)",
                            background:"var(--surface-3)",
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                            border:"1px dashed var(--border-soft)",
                          }}
                          title={`${ev.ownerEmail || "user"} · ${typeLabel(ev.type)}${ev.companyName ? ` @ ${ev.companyName}` : ""}`}
                          >
                            <span style={{ display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", background: TYPE_COLORS[ev.type] || "var(--text-muted)", marginRight:"5px" }} />
                            {new Date(ev.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {ev.companyName || typeLabel(ev.type)}
                          </div>
                        ))}
                        {(events.mine.length + events.others.length) > 5 && (
                          <div style={{ fontSize:"10px", color:"var(--text-faint)" }}>+{events.mine.length + events.others.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {dayEvents && (
              <DayDrawer
                ymdStr={selectedDay}
                events={dayEvents}
                onClose={() => setSelectedDay(null)}
                onAdd={() => { setSelectedDay(null); openQuickAdd(new Date(selectedDay)); }}
                onOpenInterview={() => router.push("/interviews")}
              />
            )}
          </div>
        </div>
      </div>

      {showQuickAdd && quickForm && (
        <QuickAdd
          form={quickForm}
          setForm={setQuickForm}
          onCancel={() => { setShowQuickAdd(false); setQuickForm(null); }}
          onSave={onSaveQuick}
          saving={saving}
        />
      )}
    </>
  );
}

const navBtn = {
  padding:"7px 12px", fontSize:"12px", fontWeight:"600",
  background:"var(--surface-2)", border:"1px solid var(--border)",
  borderRadius:"8px", color:"var(--accent)", cursor:"pointer",
};

function DayDrawer({ ymdStr, events, onClose, onAdd, onOpenInterview }) {
  const dt = new Date(ymdStr + "T00:00:00");
  const label = dt.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return (
    <div style={{
      marginTop:"18px",
      background:"var(--surface)", border:"1px solid var(--border)",
      borderRadius:"14px", padding:"18px 22px",
    }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
        <div>
          <div style={{ fontSize:"14px", fontWeight:"700", color:"var(--text)" }}>{label}</div>
          <div style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"2px" }}>{events.mine.length} of yours · {events.others.length} from others</div>
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <button onClick={onAdd} style={navBtn}>+ Add</button>
          <button onClick={onClose} style={{ ...navBtn, color:"var(--text-muted)" }}>Close</button>
        </div>
      </div>

      {events.mine.length === 0 && events.others.length === 0 && (
        <div style={{ padding:"14px 0", color:"var(--text-faint)", fontSize:"13px", textAlign:"center" }}>No events on this day.</div>
      )}

      {events.mine.length > 0 && (
        <div style={{ marginBottom:"10px" }}>
          <div style={{ fontSize:"11px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"6px" }}>Yours</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {events.mine.map(ev => {
              const sm = statusMeta(ev.status);
              return (
                <div key={ev.id} style={{
                  display:"flex", alignItems:"center", gap:"10px",
                  padding:"8px 12px", background:"var(--surface-2)", border:"1px solid var(--border)", borderRadius:"9px",
                }}>
                  <span style={{ width:"8px", height:"30px", borderRadius:"3px", background: TYPE_COLORS[ev.type] || "var(--text-muted)" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", color:"var(--text)", fontWeight:"600" }}>
                      {new Date(ev.scheduledAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })} · {typeLabel(ev.type)} (R{ev.round})
                    </div>
                    <div style={{ fontSize:"12px", color:"var(--text-2)", marginTop:"2px" }}>{ev.jobTitle || "—"}{ev.companyName ? ` @ ${ev.companyName}` : ""}</div>
                  </div>
                  <span style={{ fontSize:"11px", fontWeight:"600", padding:"3px 8px", borderRadius:"6px", color: sm.color, background:`${sm.color}1a`, border:`1px solid ${sm.color}40` }}>{sm.label}</span>
                  <button onClick={onOpenInterview} style={{ fontSize:"11px", color:"var(--accent)", background:"transparent", border:"none", cursor:"pointer" }}>Open ↗</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.others.length > 0 && (
        <div>
          <div style={{ fontSize:"11px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"6px" }}>Others</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
            {events.others.map(ev => {
              const sm = statusMeta(ev.status);
              return (
                <div key={ev.id} style={{
                  display:"flex", alignItems:"center", gap:"10px",
                  padding:"8px 12px", background:"var(--surface)", border:"1px dashed var(--border-soft)", borderRadius:"9px",
                }}>
                  <span style={{ width:"8px", height:"30px", borderRadius:"3px", background: TYPE_COLORS[ev.type] || "var(--text-muted)" }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:"13px", color:"var(--text-2)", fontWeight:"600" }}>
                      {new Date(ev.scheduledAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })} · {typeLabel(ev.type)} (R{ev.round})
                    </div>
                    <div style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"2px" }}>
                      {ev.ownerEmail || "—"}{ev.jobTitle ? ` · ${ev.jobTitle}` : ""}{ev.companyName ? ` @ ${ev.companyName}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize:"11px", fontWeight:"600", padding:"3px 8px", borderRadius:"6px", color: sm.color, background:`${sm.color}1a`, border:`1px solid ${sm.color}40` }}>{sm.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAdd({ form, setForm, onCancel, onSave, saving }) {
  const ch = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:"20px", zIndex:1000 }}>
      <div style={{
        width:"100%", maxWidth:"480px",
        background:"var(--bg-deep)", border:"1px solid var(--border)",
        borderRadius:"14px", padding:"20px 22px",
      }}>
        <div style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)", marginBottom:"16px" }}>Quick add interview</div>

        <Field label="Date & time">
          <input className="field" type="datetime-local" value={form.scheduledAt} onChange={e => ch("scheduledAt", e.target.value)} style={fieldBase} />
        </Field>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <Field label="Type">
            <select className="field" value={form.type} onChange={e => ch("type", e.target.value)} style={fieldBase}>
              {INTERVIEW_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Duration (min)">
            <input className="field" type="number" min="5" max="600" value={form.durationMinutes} onChange={e => ch("durationMinutes", e.target.value)} style={fieldBase} />
          </Field>
          <Field label="Job title">
            <input className="field" value={form.jobTitle} onChange={e => ch("jobTitle", e.target.value)} placeholder="(optional)" style={fieldBase} />
          </Field>
          <Field label="Company">
            <input className="field" value={form.companyName} onChange={e => ch("companyName", e.target.value)} placeholder="(optional)" style={fieldBase} />
          </Field>
        </div>

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
          }}>{saving ? "Saving…" : "Add"}</button>
        </div>
      </div>
    </div>
  );

  function Field({ label, children }) {
    return (
      <div style={{ marginBottom:"10px" }}>
        <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>{label}</label>
        {children}
      </div>
    );
  }
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:"10px" }}>
      <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>{label}</label>
      {children}
    </div>
  );
}

function SyncFromGoogleButton({ onDone }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiPost("/api/google/sync", { days: 90 });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && /not connected/i.test(data?.error || "")) {
          alert("Google Calendar is not connected. Open Settings to connect first.");
        } else {
          alert("Sync failed: " + (data?.error || `HTTP ${res.status}`));
        }
        return;
      }
      alert(`Imported ${data.imported} new event(s).${data.skippedExisting ? ` Skipped ${data.skippedExisting} already-tracked.` : ""}${data.skippedAllDay ? ` Skipped ${data.skippedAllDay} all-day event(s).` : ""}\nEdit each one to set the type and link a resume.`);
      onDone?.();
    } catch (err) {
      alert("Sync failed: " + err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <button onClick={onClick} disabled={busy} style={{
      ...navBtn,
      background:"var(--surface-3)",
      color:"var(--accent-2)",
      borderColor:"var(--border)",
      opacity: busy ? 0.6 : 1,
      cursor: busy ? "wait" : "pointer",
    }}>
      {busy ? "Syncing…" : "↻ Sync from Google"}
    </button>
  );
}
