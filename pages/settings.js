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

  const refreshNotif = useCallback(() => {
    setNotif({
      supported: notificationsSupported(),
      permission: notificationsPermission(),
      enabled: notificationsEnabled(),
    });
  }, []);

  useEffect(() => { refreshNotif(); }, [refreshNotif]);

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

            <div style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"14px", padding:"22px 26px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
                <span style={{ fontSize:"20px" }}>🔔</span>
                <h2 style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)" }}>Interview reminders</h2>
              </div>
              <p style={{ fontSize:"12.5px", color:"var(--text-muted)", lineHeight:"1.5", marginBottom:"16px" }}>
                Get a browser notification <strong>30 minutes</strong> and <strong>5 minutes</strong> before each interview. Reminders fire as long as Super Job Studio is open in any tab; they can't fire when the browser is closed.
              </p>

              {!notif.supported ? (
                <div style={{
                  padding:"12px 14px",
                  background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.30)",
                  borderRadius:"9px", color:"#fcd34d", fontSize:"12.5px", lineHeight:"1.5",
                }}>
                  This browser doesn't support web notifications.
                </div>
              ) : notif.permission === "denied" ? (
                <div style={{
                  padding:"12px 14px",
                  background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.30)",
                  borderRadius:"9px", color:"var(--danger)", fontSize:"12.5px", lineHeight:"1.5",
                }}>
                  Notifications are blocked for this site. Allow them in your browser's site settings (lock icon in the address bar → Notifications → Allow), then reload.
                </div>
              ) : (
                <>
                  <div style={{
                    display:"flex", alignItems:"center", gap:"10px",
                    padding:"10px 12px",
                    background: notif.enabled ? "rgba(16,185,129,0.10)" : "var(--surface-2)",
                    border:`1px solid ${notif.enabled ? "rgba(16,185,129,0.30)" : "var(--border)"}`,
                    borderRadius:"9px", marginBottom:"14px",
                  }}>
                    <span style={{
                      width:"10px", height:"10px", borderRadius:"50%",
                      background: notif.enabled ? "#10b981" : "var(--text-faint)",
                      boxShadow: notif.enabled ? "0 0 6px #10b981" : "none",
                    }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color:"var(--text)" }}>
                        {notif.enabled ? "Enabled" : "Disabled"}
                      </div>
                      <div style={{ fontSize:"11.5px", color:"var(--text-muted)", marginTop:"2px" }}>
                        Permission: {notif.permission}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:"8px" }}>
                    {!notif.enabled && (
                      <button onClick={onEnableNotif} style={{
                        padding:"10px 18px", fontSize:"13px", fontWeight:"700",
                        background:"linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                        border:"none", borderRadius:"9px", color:"#fff", cursor:"pointer",
                      }}>Enable notifications</button>
                    )}
                    {notif.enabled && (
                      <button onClick={onDisableNotif} style={{
                        padding:"10px 18px", fontSize:"13px", fontWeight:"600",
                        background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.30)",
                        borderRadius:"9px", color:"var(--danger)", cursor:"pointer",
                      }}>Disable</button>
                    )}
                  </div>
                </>
              )}
            </div>

            {error && (
              <div style={{ padding:"12px 16px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"var(--danger)", fontSize:"13px" }}>{error}</div>
            )}
          </div>
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
