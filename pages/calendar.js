import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import { apiGet, apiPost } from "../lib/api";
import {
  INTERVIEW_TYPES, INTERVIEW_STATUSES, INTERVIEW_RESULTS,
  typeLabel, statusMeta,
} from "../lib/interviews";
import { TIMEZONES, TZ_KEY, partsInTz, ymdInTz, inputInTzToISO } from "../lib/tz";
import EventDetailsModal from "../components/EventDetailsModal";
import { colorForUser, initialsFor } from "../lib/userColor";

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
function startOfWeek(d)  { const x = new Date(d); x.setHours(0,0,0,0); x.setDate(x.getDate() - x.getDay()); return x; }
function addDays(d, n)   { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d)          { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmt12h(hour, minute) {
  const h = ((hour + 11) % 12) + 1;
  const m = String(minute).padStart(2, "0");
  const ap = hour < 12 ? "AM" : "PM";
  return `${h}:${m} ${ap}`;
}
function fmtHour12(hour) {
  const h = ((hour + 11) % 12) + 1;
  const ap = hour < 12 ? "AM" : "PM";
  return `${h} ${ap}`;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState("week"); // "month" | "week"
  const [cursor, setCursor]     = useState(() => startOfWeek(new Date()));
  const [mine, setMine]         = useState([]);
  const [others, setOthers]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickForm, setQuickForm] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [userFilter, setUserFilter] = useState("all"); // "all" | "me" | <userId>
  const [directory, setDirectory]   = useState([]);
  const [timezone, setTimezone]     = useState(TIMEZONES[0].value);

  // Load saved timezone preference, then mirror future changes back.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(TZ_KEY);
      if (saved && TIMEZONES.find((t) => t.value === saved)) setTimezone(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(TZ_KEY, timezone); } catch { /* ignore */ }
  }, [timezone]);

  // Tick once a minute so the "current time" line moves smoothly.
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    apiGet("/api/users/directory").then(r => r.ok ? r.json() : []).then(setDirectory).catch(() => {});
  }, []);

  // Snap cursor to the right anchor when toggling view modes.
  useEffect(() => {
    setCursor((c) => viewMode === "week" ? startOfWeek(c) : startOfMonth(c));
  }, [viewMode]);

  // Month: 42-cell 6×7 grid. Week: 7 cells starting on the cursor's Sunday.
  const cells = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(cursor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    const first = startOfMonth(cursor);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor, viewMode]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = cells[0];
      const to = new Date(cells[cells.length - 1]);
      to.setHours(23, 59, 59, 999);
      const baseParams = { from: from.toISOString(), to: to.toISOString() };

      let minePromise, othersPromise;
      if (userFilter === "all") {
        // Self interviews + everyone else's anonymized.
        minePromise = apiGet(`/api/interviews?${new URLSearchParams(baseParams).toString()}`);
        othersPromise = apiGet(`/api/interviews/others?${new URLSearchParams(baseParams).toString()}`);
      } else if (userFilter === "me") {
        // Only your own interviews — hide others.
        minePromise = apiGet(`/api/interviews?${new URLSearchParams(baseParams).toString()}`);
        othersPromise = Promise.resolve({ ok: true, json: () => ({ items: [] }) });
      } else {
        // Specific user — show ONLY their interviews, treated as the primary
        // event list (so they're rendered with full detail like "mine").
        const params = new URLSearchParams({ ...baseParams, userId: userFilter });
        minePromise = apiGet(`/api/interviews?${params.toString()}`);
        othersPromise = Promise.resolve({ ok: true, json: () => ({ items: [] }) });
      }

      const [mineRes, othersRes] = await Promise.all([minePromise, othersPromise]);
      if (!mineRes.ok) throw new Error(await mineRes.text() || `HTTP ${mineRes.status}`);
      const mineData = await mineRes.json();
      setMine(mineData.items || []);
      if (othersRes.ok) {
        const od = await othersRes.json();
        setOthers(od.items || []);
      } else {
        setOthers([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cells, userFilter]);

  useEffect(() => { refresh(); }, [refresh]);

  // Group events by ymd in the selected timezone — so the same event lands
  // on the correct calendar day whether the user views in CN, PT, etc.
  const byDate = useMemo(() => {
    const m = {};
    for (const ev of mine)  { const k = ymdInTz(new Date(ev.scheduledAt), timezone); (m[k] ||= { mine: [], others: [] }).mine.push(ev); }
    for (const ev of others){ const k = ymdInTz(new Date(ev.scheduledAt), timezone); (m[k] ||= { mine: [], others: [] }).others.push(ev); }
    return m;
  }, [mine, others, timezone]);

  const today = ymdInTz(new Date(), timezone);
  const monthLabel = (() => {
    if (viewMode === "month") return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
    const wkStart = startOfWeek(cursor);
    const wkEnd = addDays(wkStart, 6);
    const sameMonth = wkStart.getMonth() === wkEnd.getMonth();
    const sameYear = wkStart.getFullYear() === wkEnd.getFullYear();
    const left = sameMonth
      ? `${MONTHS[wkStart.getMonth()]} ${wkStart.getDate()}`
      : `${MONTHS[wkStart.getMonth()].slice(0,3)} ${wkStart.getDate()}${sameYear ? "" : `, ${wkStart.getFullYear()}`}`;
    const right = sameMonth
      ? `${wkEnd.getDate()}, ${wkEnd.getFullYear()}`
      : `${MONTHS[wkEnd.getMonth()].slice(0,3)} ${wkEnd.getDate()}, ${wkEnd.getFullYear()}`;
    return `${left} – ${right}`;
  })();

  const stepBack = () => setCursor(c => viewMode === "week" ? addDays(c, -7) : addMonths(c, -1));
  const stepFwd  = () => setCursor(c => viewMode === "week" ? addDays(c, 7)  : addMonths(c, 1));
  const goToday  = () => setCursor(viewMode === "week" ? startOfWeek(new Date()) : startOfMonth(new Date()));

  // `date` is a Date for the day the user clicked. `opts.hour`/`opts.minute`
  // (when present, e.g. from clicking on a row in the week-hour grid) are
  // interpreted as wall-clock time in the calendar's selected timezone.
  // Otherwise default to 10:00 in that timezone.
  const openQuickAdd = (date, opts = {}) => {
    const dayInTz = ymdInTz(date, timezone); // YYYY-MM-DD
    const hour = Number.isFinite(opts.hour) ? opts.hour : 10;
    const minute = Number.isFinite(opts.minute) ? opts.minute : 0;
    const pad = (n) => String(n).padStart(2, "0");
    const scheduledAt = `${dayInTz}T${pad(hour)}:${pad(minute)}`;
    setQuickForm({
      type: "hr",
      round: 1,
      status: "scheduled",
      result: "pending",
      scheduledAt,
      timezone,
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
      const iso = inputInTzToISO(quickForm.scheduledAt, quickForm.timezone || timezone);
      if (!iso) {
        alert("Date & time is invalid.");
        setSaving(false);
        return;
      }
      const payload = {
        ...quickForm,
        round: Number(quickForm.round) || 1,
        durationMinutes: Number(quickForm.durationMinutes) || 45,
        scheduledAt: iso,
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
            <div style={{ display:"flex", gap:"6px", alignItems:"center", flexWrap:"wrap" }}>
              <ViewToggle value={viewMode} onChange={setViewMode} />
              <TimezoneSelect value={timezone} onChange={setTimezone} />
              <UserFilter value={userFilter} onChange={setUserFilter} directory={directory} />
              <SyncFromGoogleButton onDone={refresh} />
              <button onClick={stepBack} style={navBtn}>← Prev</button>
              <button onClick={goToday} style={navBtn}>Today</button>
              <button onClick={stepFwd} style={navBtn}>Next →</button>
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

            {viewMode === "week" ? (
              <WeekHourGrid
                cells={cells}
                mine={mine}
                others={others}
                timezone={timezone}
                nowTick={nowTick}
                onSelectDay={setSelectedDay}
                onSelectInterview={setSelectedInterview}
                onAddAt={openQuickAdd}
              />
            ) : (
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
                          {events.mine.slice(0, 3).map((ev) => {
                            const ownerKey = ev.ownerEmail || ev.ownerId;
                            const ownerC = ownerKey ? colorForUser(ownerKey) : null;
                            return (
                              <div key={ev.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedInterview(ev); }}
                                style={{
                                  display:"flex", alignItems:"center", gap:"4px",
                                  fontSize:"10.5px", padding:"2px 5px", borderRadius:"4px",
                                  color:"#fff",
                                  background: TYPE_COLORS[ev.type] || "var(--text-muted)",
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                  opacity: ev.status === "cancelled" ? 0.5 : 1,
                                  textDecoration: ev.status === "cancelled" ? "line-through" : "none",
                                  boxShadow: ownerC ? `inset 3px 0 0 ${ownerC}` : undefined,
                                }}
                                title={`${ev.ownerEmail ? ev.ownerEmail + " · " : ""}${ev.title || typeLabel(ev.type)}${ev.companyName ? ` @ ${ev.companyName}` : ""}${ev.profileName ? ` (profile: ${ev.profileName})` : ""}`}
                              >
                                <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {new Date(ev.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: timezone })} · {ev.title || ev.companyName || typeLabel(ev.type)}
                                </span>
                              </div>
                            );
                          })}
                          {events.others.slice(0, 2).map((ev) => {
                            const ownerKey = ev.ownerEmail || ev.ownerId || ev.id;
                            const ownerC = colorForUser(ownerKey);
                            return (
                              <div key={ev.id}
                                onClick={(e) => { e.stopPropagation(); setSelectedInterview(ev); }}
                                style={{
                                  display:"flex", alignItems:"center", gap:"4px",
                                  fontSize:"10.5px", padding:"2px 5px", borderRadius:"4px",
                                  color:"var(--text-muted)",
                                  background:"var(--surface-3)",
                                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                  border:`1px dashed ${ownerC}`,
                                }}
                                title={`${ev.ownerEmail || "user"} · ${typeLabel(ev.type)}${ev.companyName ? ` @ ${ev.companyName}` : ""}`}
                              >
                                <span style={{ display:"inline-block", width:"6px", height:"6px", borderRadius:"50%", background: ownerC }} />
                                <span style={{ overflow:"hidden", textOverflow:"ellipsis" }}>
                                  {new Date(ev.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: timezone })} · {ev.title || ev.companyName || typeLabel(ev.type)}
                                </span>
                              </div>
                            );
                          })}
                          {(events.mine.length + events.others.length) > 5 && (
                            <div style={{ fontSize:"10px", color:"var(--text-faint)" }}>+{events.mine.length + events.others.length - 5} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {dayEvents && (
              <DayDrawer
                ymdStr={selectedDay}
                events={dayEvents}
                timezone={timezone}
                onClose={() => setSelectedDay(null)}
                onAdd={() => { setSelectedDay(null); openQuickAdd(new Date(selectedDay)); }}
                onOpenInterview={(iv) => setSelectedInterview(iv)}
              />
            )}

            {selectedInterview && (
              <EventDetailsModal
                interview={selectedInterview}
                viewerTz={timezone}
                onClose={() => setSelectedInterview(null)}
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

function DayDrawer({ ymdStr, events, timezone, onClose, onAdd, onOpenInterview }) {
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
                      {new Date(ev.scheduledAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", timeZone: timezone })} · {ev.title || `${typeLabel(ev.type)} (R${ev.round})`}
                    </div>
                    <div style={{ fontSize:"12px", color:"var(--text-2)", marginTop:"2px" }}>
                      {ev.title ? `${typeLabel(ev.type)} (R${ev.round})` : (ev.jobTitle || "—")}
                      {ev.companyName ? ` · ${ev.companyName}` : (ev.jobTitle && ev.title ? ` · ${ev.jobTitle}` : "")}
                    </div>
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
                      {new Date(ev.scheduledAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", timeZone: timezone })} · {typeLabel(ev.type)} (R{ev.round})
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

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px" }}>
          <Field label="Date & time">
            <input className="field" type="datetime-local" value={form.scheduledAt} onChange={e => ch("scheduledAt", e.target.value)} style={fieldBase} />
          </Field>
          <Field label="Timezone">
            <select className="field" value={form.timezone} onChange={e => ch("timezone", e.target.value)} style={fieldBase}>
              {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
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

function ViewToggle({ value, onChange }) {
  const opt = (v, label) => (
    <button
      key={v}
      onClick={() => onChange(v)}
      style={{
        padding:"6px 12px", fontSize:"12px", fontWeight:"600",
        background: value === v ? "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)" : "transparent",
        color: value === v ? "#fff" : "var(--text-muted)",
        border:"none", borderRadius:"6px", cursor:"pointer",
      }}
    >{label}</button>
  );
  return (
    <div style={{
      display:"inline-flex",
      background:"var(--surface-2)", border:"1px solid var(--border)",
      borderRadius:"8px", padding:"3px",
    }}>
      {opt("month", "Month")}
      {opt("week", "Week")}
    </div>
  );
}

function UserFilter({ value, onChange, directory }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Show interviews of"
      style={{
        padding:"7px 12px", fontSize:"12.5px", fontWeight:"600",
        background:"var(--surface-2)", border:"1px solid var(--border)",
        borderRadius:"8px", color:"var(--accent)", cursor:"pointer",
        fontFamily:"inherit", outline:"none",
      }}
    >
      <option value="all">All users</option>
      <option value="me">Just me</option>
      <option disabled>──────────</option>
      {(directory || []).map((u) => (
        <option key={u.id} value={u.id}>{u.name || u.email}</option>
      ))}
    </select>
  );
}

function TimezoneSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="Timezone (week view)"
      style={{
        padding:"7px 12px", fontSize:"12.5px", fontWeight:"600",
        background:"var(--surface-2)", border:"1px solid var(--border)",
        borderRadius:"8px", color:"var(--accent)", cursor:"pointer",
        fontFamily:"inherit", outline:"none",
      }}
    >
      {TIMEZONES.map((t) => (
        <option key={t.value} value={t.value}>{t.label}</option>
      ))}
    </select>
  );
}

// Hourly grid: 24 rows × 7 day columns + a left "time" column. Events are
// absolutely positioned per day column based on their start time + duration
// in the selected timezone. A horizontal "now" line is drawn across today's
// column whenever today is in the displayed week.
function WeekHourGrid({ cells, mine, others, timezone, nowTick, onSelectDay, onSelectInterview, onAddAt }) {
  const HOUR_PX = 36;       // height of one hour row
  const TIME_COL = 56;      // width of the time labels column
  const TOTAL_H = HOUR_PX * 24;

  // Pre-compute each day's ymd in the selected timezone for matching events.
  const dayKeys = cells.map((d) => ymdInTz(d, timezone));
  const todayKey = ymdInTz(new Date(nowTick), timezone);

  // Compute "now" position in pixels (relative to top of grid) for the today
  // column. Returns null if today is not visible in this week.
  const nowParts = partsInTz(new Date(nowTick), timezone);
  const nowTopPx = nowParts.hour * HOUR_PX + (nowParts.minute / 60) * HOUR_PX;
  const todayColIndex = dayKeys.indexOf(todayKey);

  // Group events by their day key in the selected timezone.
  function eventsForDay(idx) {
    const k = dayKeys[idx];
    const own = mine.filter((ev) => ymdInTz(new Date(ev.scheduledAt), timezone) === k);
    const oth = others.filter((ev) => ymdInTz(new Date(ev.scheduledAt), timezone) === k);
    return { own, oth };
  }

  function eventTopHeight(ev) {
    const p = partsInTz(new Date(ev.scheduledAt), timezone);
    const top = p.hour * HOUR_PX + (p.minute / 60) * HOUR_PX;
    const dur = Math.max(ev.durationMinutes || 45, 20); // min visible 20 min
    const height = (dur / 60) * HOUR_PX;
    return { top, height: Math.max(height, 18) };
  }

  function onColumnClick(e, dayDate) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hour = Math.max(0, Math.min(23, Math.floor(y / HOUR_PX)));
    let minute = Math.round(((y % HOUR_PX) / HOUR_PX) * 60 / 15) * 15;
    if (minute >= 60) minute = 0; // snap-to-15 can roll over near hour edge
    onAddAt(dayDate, { hour, minute });
  }

  return (
    <div style={{
      background:"var(--surface)", border:"1px solid var(--border)",
      borderRadius:"14px", overflow:"hidden",
    }}>
      {/* Day-name header row */}
      <div style={{ display:"grid", gridTemplateColumns:`${TIME_COL}px repeat(7, 1fr)`, borderBottom:"1px solid var(--border-soft)" }}>
        <div style={{ padding:"10px 8px", fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px", textAlign:"right" }}>
          {(TIMEZONES.find((t) => t.value === timezone)?.short) || "TZ"}
        </div>
        {cells.map((d, i) => {
          const isToday = dayKeys[i] === todayKey;
          return (
            <div
              key={i}
              onClick={() => onSelectDay(dayKeys[i])}
              style={{
                padding:"10px 8px", textAlign:"center", cursor:"pointer",
                borderLeft:"1px solid var(--border-soft)",
                background: isToday ? "var(--surface-2)" : "transparent",
              }}
            >
              <div style={{ fontSize:"10.5px", fontWeight:"700", color:"var(--label)", textTransform:"uppercase", letterSpacing:"0.6px" }}>{WEEKDAYS[d.getDay()]}</div>
              <div style={{ fontSize:"15px", fontWeight: isToday ? "700" : "600", color: isToday ? "var(--accent)" : "var(--text)", marginTop:"2px" }}>{d.getDate()}</div>
            </div>
          );
        })}
      </div>

      {/* Hour-by-hour body */}
      <div style={{
        display:"grid",
        gridTemplateColumns:`${TIME_COL}px repeat(7, 1fr)`,
        position:"relative",
        maxHeight:"70vh",
        overflowY:"auto",
      }}>
        {/* Time-label column */}
        <div style={{ position:"relative", height: `${TOTAL_H}px`, borderRight:"1px solid var(--border-soft)" }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              style={{
                position:"absolute", left:0, right:4,
                top: `${h * HOUR_PX}px`, height: `${HOUR_PX}px`,
                fontSize:"10px", color:"var(--text-faint)",
                textAlign:"right", paddingRight:"6px", paddingTop:"2px",
              }}
            >{h === 0 ? "" : fmtHour12(h)}</div>
          ))}
        </div>

        {/* 7 day columns */}
        {cells.map((d, i) => {
          const { own, oth } = eventsForDay(i);
          const isToday = i === todayColIndex;
          return (
            <div
              key={i}
              onClick={(e) => onColumnClick(e, d)}
              style={{
                position:"relative",
                height: `${TOTAL_H}px`,
                borderLeft:"1px solid var(--border-soft)",
                background: isToday ? "var(--surface-2)" : "transparent",
                cursor:"crosshair",
              }}
            >
              {/* Hour grid lines */}
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} style={{
                  position:"absolute", left:0, right:0, top: `${h * HOUR_PX}px`,
                  height:"1px", background:"var(--border-soft)",
                }} />
              ))}

              {/* My events */}
              {own.map((ev) => {
                const { top, height } = eventTopHeight(ev);
                const p = partsInTz(new Date(ev.scheduledAt), timezone);
                const ownerKey = ev.ownerEmail || ev.ownerId;
                const ownerC = ownerKey ? colorForUser(ownerKey) : null;
                const ownerInits = ownerKey ? initialsFor(ev.ownerName || ev.ownerEmail || "") : null;
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectInterview(ev); }}
                    style={{
                      position:"absolute", left:"4px", right:"4px",
                      top: `${top}px`, height: `${height}px`,
                      borderRadius:"5px", padding:"3px 6px",
                      background: TYPE_COLORS[ev.type] || "var(--text-muted)",
                      color:"#fff", fontSize:"11px", fontWeight:"600",
                      overflow:"hidden", textOverflow:"ellipsis",
                      boxShadow:"0 2px 6px rgba(0,0,0,0.25)",
                      cursor:"pointer",
                      opacity: ev.status === "cancelled" ? 0.5 : 1,
                      textDecoration: ev.status === "cancelled" ? "line-through" : "none",
                    }}
                    title={`${ev.ownerEmail ? ev.ownerEmail + " · " : ""}${ev.title || typeLabel(ev.type)}${ev.companyName ? ` @ ${ev.companyName}` : ""}${ev.profileName ? ` (profile: ${ev.profileName})` : ""}`}
                  >
                    {ownerC && (
                      <span style={{
                        position:"absolute", top:"3px", right:"3px",
                        width:"15px", height:"15px", borderRadius:"50%",
                        background: ownerC, color:"#fff",
                        fontSize:"8.5px", fontWeight:"700",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        border:"1.5px solid rgba(255,255,255,0.35)",
                      }}>{ownerInits}</span>
                    )}
                    <div style={{ fontSize:"10px", opacity:0.9 }}>{fmt12h(p.hour, p.minute)}</div>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", paddingRight: ownerC ? "16px" : "0" }}>
                      {ev.title || ev.companyName || typeLabel(ev.type)}
                    </div>
                  </div>
                );
              })}

              {/* Others' events — colored by owner with dashed border + corner badge */}
              {oth.map((ev) => {
                const { top, height } = eventTopHeight(ev);
                const ownerKey = ev.ownerEmail || ev.ownerId || ev.id;
                const ownerC = colorForUser(ownerKey);
                const ownerInits = initialsFor(ev.ownerName || ev.ownerEmail || "user");
                return (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectInterview(ev); }}
                    style={{
                      position:"absolute", left:"4px", right:"4px",
                      top: `${top}px`, height: `${height}px`,
                      borderRadius:"5px", padding:"3px 6px",
                      background:"var(--surface-3)",
                      border:`1px dashed ${ownerC}`,
                      color:"var(--text-muted)", fontSize:"10.5px",
                      overflow:"hidden", textOverflow:"ellipsis",
                      cursor:"pointer",
                    }}
                    title={`${ev.ownerEmail || "user"} · ${typeLabel(ev.type)}${ev.companyName ? ` @ ${ev.companyName}` : ""}`}
                  >
                    <span style={{
                      position:"absolute", top:"3px", right:"3px",
                      width:"15px", height:"15px", borderRadius:"50%",
                      background: ownerC, color:"#fff",
                      fontSize:"8.5px", fontWeight:"700",
                      display:"flex", alignItems:"center", justifyContent:"center",
                    }}>{ownerInits}</span>
                    <div style={{ fontSize:"9.5px", color: ownerC, fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.4px", paddingRight:"16px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {ev.ownerEmail ? ev.ownerEmail.split("@")[0] : "user"}
                    </div>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {ev.title || typeLabel(ev.type)}
                    </div>
                  </div>
                );
              })}

              {/* Current-time line, only on today's column */}
              {isToday && (
                <>
                  <div style={{
                    position:"absolute", left:0, right:0, top: `${nowTopPx}px`,
                    height:"2px", background:"#ef4444",
                    boxShadow:"0 0 6px rgba(239,68,68,0.6)",
                    zIndex:5, pointerEvents:"none",
                  }} />
                  <div style={{
                    position:"absolute", left:"-5px", top: `${nowTopPx - 4}px`,
                    width:"10px", height:"10px", borderRadius:"50%",
                    background:"#ef4444", boxShadow:"0 0 6px rgba(239,68,68,0.7)",
                    zIndex:6, pointerEvents:"none",
                  }} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
