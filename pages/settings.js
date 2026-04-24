import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { apiGet, apiPost } from "../lib/api";
import {
  notificationsSupported,
  notificationsPermission,
  notificationsEnabled,
  enableNotifications,
  disableNotifications,
} from "../lib/notifications";

export default function SettingsPage() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);
  const [notif, setNotif]     = useState({ supported: false, permission: "default", enabled: false });
  const [upcoming, setUpcoming] = useState([]);

  const refreshNotif = useCallback(() => {
    setNotif({
      supported: notificationsSupported(),
      permission: notificationsPermission(),
      enabled: notificationsEnabled(),
    });
  }, []);

  const refreshUpcoming = useCallback(async () => {
    try {
      const from = new Date().toISOString();
      const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const res = await apiGet(`/api/interviews?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=scheduled&limit=5`);
      if (res.ok) {
        const d = await res.json();
        setUpcoming(d.items || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { refreshNotif(); refreshUpcoming(); }, [refreshNotif, refreshUpcoming]);

  const onTestNotification = () => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("interview:reminder", {
      detail: {
        offsetMin: 5,
        interview: {
          id: "demo",
          title: "Test reminder",
          type: "hr",
          companyName: "Acme",
          jobTitle: "Senior Engineer",
          location: "Zoom",
          scheduledAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        },
      },
    }));
  };

  const onEnableNotif = async () => {
    setError("");
    try {
      await enableNotifications();
      refreshNotif();
    } catch (err) {
      setError(err.message);
      refreshNotif();
    }
  };

  const onDisableNotif = () => {
    disableNotifications();
    refreshNotif();
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/google/status");
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setStatus(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // OAuth popup posts back when the new account is added.
  useEffect(() => {
    function onMessage(ev) {
      if (ev?.data?.source === "super-team-google" && ev.data.status === "connected") {
        refresh();
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [refresh]);

  const onConnect = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiGet("/api/google/authorize");
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      const data = await res.json();
      const w = window.open(data.url, "google-oauth", "width=520,height=640");
      if (!w) window.location.href = data.url;
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSetDefault = async (accountId) => {
    setError("");
    try {
      const res = await apiPost("/api/google/default", { accountId });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) { setError(err.message); }
  };

  const onDisconnect = async (account) => {
    if (!confirm(`Disconnect ${account.email || "this account"}? Existing events that were already pushed will remain on the Google Calendar; new interviews will not sync to this account until you reconnect.`)) return;
    setError("");
    try {
      const res = await apiPost("/api/google/disconnect", { accountId: account.accountId });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) { setError(err.message); }
  };

  const accounts = status?.accounts || [];

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; }
        ::-webkit-scrollbar { width:5px; }
        .nav-link:hover { background:var(--surface-3)!important; color:var(--accent-2)!important; }
      `}</style>

      <div style={{ display:"flex", height:"100vh", background:"var(--bg)" }}>
        <Sidebar active="settings" />

        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
          <header style={{
            padding:"0 28px", height:"56px", flexShrink:0,
            background:"var(--topbar-bg)", backdropFilter:"blur(12px)",
            borderBottom:"1px solid var(--border-soft)",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"var(--text)" }}>Settings</h1>
              <p style={{ fontSize:"11px", color:"var(--text-faint)", marginTop:"1px" }}>Integrations & account preferences</p>
            </div>
          </header>

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px", display:"flex", flexDirection:"column", gap:"18px", maxWidth:"760px" }}>

            <div style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"14px", padding:"22px 26px",
            }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:"12px", marginBottom:"4px", flexWrap:"wrap" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
                  <GoogleLogo />
                  <h2 style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)" }}>Google Calendar</h2>
                </div>
                {status?.configured && (
                  <button onClick={onConnect} disabled={busy} style={{
                    padding:"7px 14px", fontSize:"12.5px", fontWeight:"700",
                    background: busy ? "rgba(109,40,217,0.45)" : "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                    border:"none", borderRadius:"9px", color:"#fff",
                    cursor: busy ? "not-allowed" : "pointer",
                  }}>{busy ? "Opening…" : (accounts.length === 0 ? "Connect Google Calendar" : "+ Add another account")}</button>
                )}
              </div>
              <p style={{ fontSize:"12.5px", color:"var(--text-muted)", lineHeight:"1.5", marginBottom:"16px" }}>
                Connect one or more Google accounts. Each interview is pushed to the <strong>default</strong> account; you can change which account is default at any time. The "Sync from Google" button on the Calendar page pulls events from <strong>every</strong> connected account.
              </p>

              {loading && <div style={{ fontSize:"13px", color:"var(--text-faint)" }}>Loading…</div>}

              {!loading && status && !status.configured && (
                <div style={{
                  padding:"12px 14px",
                  background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.30)",
                  borderRadius:"9px", color:"#fcd34d", fontSize:"12.5px", lineHeight:"1.5",
                }}>
                  Google integration is not configured on the backend. Set <code style={{ fontFamily:"monospace" }}>GOOGLE_CLIENT_ID</code>, <code style={{ fontFamily:"monospace" }}>GOOGLE_CLIENT_SECRET</code>, and <code style={{ fontFamily:"monospace" }}>GOOGLE_REDIRECT_URI</code> in your <code>.env</code>, then restart the backend.
                </div>
              )}

              {!loading && status?.configured && accounts.length === 0 && (
                <div style={{
                  display:"flex", alignItems:"center", gap:"10px",
                  padding:"10px 12px",
                  background:"var(--surface-2)", border:"1px solid var(--border)",
                  borderRadius:"9px",
                }}>
                  <span style={{ width:"10px", height:"10px", borderRadius:"50%", background:"var(--text-faint)" }} />
                  <div style={{ fontSize:"13px", color:"var(--text)", fontWeight:"600" }}>No Google accounts connected</div>
                </div>
              )}

              {!loading && accounts.length > 0 && (
                <div style={{ display:"flex", flexDirection:"column", gap:"8px" }}>
                  {accounts.map((a) => (
                    <div key={a.accountId} style={{
                      display:"grid", gridTemplateColumns:"auto 1fr auto auto",
                      alignItems:"center", gap:"12px",
                      padding:"10px 14px",
                      background: a.isDefault ? "rgba(16,185,129,0.08)" : "var(--surface-2)",
                      border: `1px solid ${a.isDefault ? "rgba(16,185,129,0.30)" : "var(--border)"}`,
                      borderRadius:"10px",
                    }}>
                      <span style={{
                        width:"10px", height:"10px", borderRadius:"50%",
                        background: a.isDefault ? "#10b981" : "var(--accent)",
                        boxShadow: a.isDefault ? "0 0 5px #10b981" : "none",
                      }} />
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:"13px", fontWeight:"600", color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{a.email || "(unknown email)"}</div>
                        <div style={{ fontSize:"11.5px", color:"var(--text-muted)", marginTop:"2px" }}>
                          {a.name ? `${a.name} · ` : ""}connected {a.connectedAt ? new Date(a.connectedAt).toLocaleDateString() : "—"}
                          {a.isDefault && <span style={{ color:"#10b981", fontWeight:"700", marginLeft:"6px" }}>· default</span>}
                        </div>
                        <div style={{ marginTop:"4px", fontSize:"11px" }}>
                          {a.profile ? (
                            <span style={{
                              display:"inline-flex", alignItems:"center", gap:"5px",
                              padding:"2px 8px", borderRadius:"999px",
                              background:"rgba(16,185,129,0.12)", color:"#10b981",
                              border:"1px solid rgba(16,185,129,0.30)",
                              fontWeight:"600",
                            }}>
                              <span style={{ fontSize:"9px" }}>●</span>
                              Linked to profile: {a.profile.name}
                            </span>
                          ) : (
                            <span style={{
                              display:"inline-flex", alignItems:"center", gap:"5px",
                              padding:"2px 8px", borderRadius:"999px",
                              background:"var(--surface-2)", color:"var(--text-faint)",
                              border:"1px solid var(--border)",
                            }}>
                              No matching profile (add a profile with email <strong style={{ color:"var(--text-muted)" }}>{a.email}</strong>)
                            </span>
                          )}
                        </div>
                      </div>
                      {!a.isDefault && (
                        <button onClick={() => onSetDefault(a.accountId)} style={{
                          padding:"6px 12px", fontSize:"11.5px", fontWeight:"600",
                          background:"var(--surface-3)", border:"1px solid var(--border)",
                          borderRadius:"7px", color:"var(--accent)", cursor:"pointer",
                          whiteSpace:"nowrap",
                        }}>Make default</button>
                      )}
                      {a.isDefault && <span style={{ width:"100px" }} />}
                      <button onClick={() => onDisconnect(a)} style={{
                        padding:"6px 12px", fontSize:"11.5px", fontWeight:"600",
                        background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.30)",
                        borderRadius:"7px", color:"var(--danger)", cursor:"pointer",
                        whiteSpace:"nowrap",
                      }}>Disconnect</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <NotificationsCard
              notif={notif}
              upcoming={upcoming}
              onEnable={onEnableNotif}
              onDisable={onDisableNotif}
              onTest={onTestNotification}
            />

            {error && (
              <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"var(--danger)", fontSize:"13px" }}>{error}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function NotificationsCard({ notif, upcoming, onEnable, onDisable, onTest }) {
  const blocked = notif.permission === "denied";
  const unsupported = !notif.supported;

  return (
    <>
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.55); }
          50%      { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
        }
        .nf-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
        }
        .nf-head {
          padding: 18px 22px;
          background: linear-gradient(135deg, rgba(139,92,246,0.16) 0%, rgba(219,39,119,0.10) 100%);
          border-bottom: 1px solid var(--border-soft);
          display: flex; align-items: center; gap: 14px;
        }
        .bell {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; color: #fff;
          background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
          box-shadow: 0 8px 24px rgba(139,92,246,0.35);
          flex-shrink: 0;
        }
        .nf-body { padding: 18px 22px; }
        .pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 10px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.6px;
        }
        .pill.on  { background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.30); }
        .pill.off { background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border); }
        .pill.warn{ background: rgba(245,158,11,0.10); color: #fcd34d; border: 1px solid rgba(245,158,11,0.30); }
        .pill .dot { width: 8px; height: 8px; border-radius: 50%; }
        .pill.on .dot { background: #10b981; animation: pulse 1.6s ease-out infinite; }
        .pill.off .dot { background: var(--text-faint); }
        .pill.warn .dot { background: #f59e0b; }
        .offsets {
          display: flex; gap: 6px; margin-top: 8px;
        }
        .chip {
          font-size: 11px; font-weight: 600;
          padding: 3px 8px; border-radius: 6px;
          background: var(--surface-2); color: var(--accent-2);
          border: 1px solid var(--border);
        }
        .upcoming {
          margin-top: 18px;
          background: var(--surface-2);
          border: 1px solid var(--border-soft);
          border-radius: 10px;
          padding: 12px 14px;
        }
        .upcoming-head {
          font-size: 10.5px; font-weight: 700; color: var(--label);
          text-transform: uppercase; letter-spacing: 0.6px;
          margin-bottom: 8px;
        }
        .row {
          display: grid; grid-template-columns: 8px 1fr auto;
          gap: 10px; align-items: center;
          padding: 6px 0;
          border-top: 1px solid var(--border-soft);
        }
        .row:first-of-type { border-top: none; }
        .row .stripe {
          width: 6px; height: 26px; border-radius: 2px;
        }
        .row .label {
          font-size: 12.5px; color: var(--text); font-weight: 600;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .row .meta {
          font-size: 11px; color: var(--text-muted); margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .row .when {
          font-size: 11.5px; color: var(--accent-2); font-weight: 600;
          white-space: nowrap;
        }
      `}</style>

      <div className="nf-card">
        <div className="nf-head">
          <div className="bell">🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text)" }}>Interview reminders</h2>
              {unsupported ? (
                <span className="pill warn"><span className="dot" />Unsupported</span>
              ) : blocked ? (
                <span className="pill warn"><span className="dot" />Blocked</span>
              ) : notif.enabled ? (
                <span className="pill on"><span className="dot" />Enabled</span>
              ) : (
                <span className="pill off"><span className="dot" />Disabled</span>
              )}
            </div>
            <div className="offsets">
              <span className="chip">30 min before</span>
              <span className="chip">5 min before</span>
            </div>
          </div>
        </div>

        <div className="nf-body">
          {unsupported ? (
            <div style={{
              padding: "12px 14px",
              background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)",
              borderRadius: "9px", color: "#fcd34d", fontSize: "12.5px", lineHeight: "1.5",
            }}>
              This browser doesn't support web notifications.
            </div>
          ) : blocked ? (
            <div style={{
              padding: "12px 14px",
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.30)",
              borderRadius: "9px", color: "var(--danger)", fontSize: "12.5px", lineHeight: "1.5",
            }}>
              Notifications are blocked for this site. Allow them in your browser's site settings (lock icon → Notifications → Allow), then reload.
            </div>
          ) : (
            <>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: "1.5", margin: "0 0 14px" }}>
                You'll get a browser notification AND an in-app toast at both offsets. Reminders fire as long as Super Job Studio is open in any tab.
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {!notif.enabled ? (
                  <button onClick={onEnable} style={{
                    padding: "10px 18px", fontSize: "13px", fontWeight: "700",
                    background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                    border: "none", borderRadius: "9px", color: "#fff", cursor: "pointer",
                  }}>Enable notifications</button>
                ) : (
                  <>
                    <button onClick={onTest} style={{
                      padding: "10px 16px", fontSize: "12.5px", fontWeight: "600",
                      background: "var(--surface-3)", border: "1px solid var(--border)",
                      borderRadius: "9px", color: "var(--accent-2)", cursor: "pointer",
                    }}>Send test toast</button>
                    <button onClick={onDisable} style={{
                      padding: "10px 16px", fontSize: "12.5px", fontWeight: "600",
                      background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.30)",
                      borderRadius: "9px", color: "var(--danger)", cursor: "pointer",
                    }}>Disable</button>
                  </>
                )}
              </div>
            </>
          )}

          {upcoming.length > 0 && (
            <div className="upcoming">
              <div className="upcoming-head">Next 7 days · {upcoming.length} upcoming</div>
              {upcoming.map((iv) => {
                const at = new Date(iv.scheduledAt);
                const day = at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                const time = at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                const colors = { hr:"#a78bfa", technical:"#22d3ee", behavioral:"#fb923c", system_design:"#10b981", final:"#db2777", other:"#94a3b8" };
                return (
                  <div className="row" key={iv.id}>
                    <div className="stripe" style={{ background: colors[iv.type] || "#94a3b8" }} />
                    <div style={{ minWidth: 0 }}>
                      <div className="label">{iv.title || iv.companyName || iv.type}</div>
                      <div className="meta">
                        {iv.companyName && (iv.title || iv.jobTitle) ? `${iv.jobTitle || ""} @ ${iv.companyName}` : (iv.location || iv.companyName || "—")}
                      </div>
                    </div>
                    <div className="when">{day} · {time}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.51 8.18a8 8 0 0 0-.13-1.45H9v2.74h4.21a3.6 3.6 0 0 1-1.56 2.36v1.96h2.52a7.6 7.6 0 0 0 2.34-5.61z" fill="#4285F4"/>
      <path d="M9 16.5a7.4 7.4 0 0 0 5.17-1.81l-2.52-1.96a4.66 4.66 0 0 1-2.65.74 4.65 4.65 0 0 1-4.36-3.21H2.04v2.02A7.5 7.5 0 0 0 9 16.5z" fill="#34A853"/>
      <path d="M4.64 10.26a4.5 4.5 0 0 1 0-2.85V5.39H2.04a7.5 7.5 0 0 0 0 6.89l2.6-2.02z" fill="#FBBC05"/>
      <path d="M9 4.45a4.06 4.06 0 0 1 2.86 1.12l2.23-2.23A7.2 7.2 0 0 0 9 1.5a7.5 7.5 0 0 0-6.96 3.89l2.6 2.02A4.65 4.65 0 0 1 9 4.45z" fill="#EA4335"/>
    </svg>
  );
}
