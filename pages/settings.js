import { useEffect, useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import { apiGet, apiPost } from "../lib/api";

export default function SettingsPage() {
  const [status, setStatus]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [busy, setBusy]       = useState(false);

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

  // Refresh after the OAuth popup signals success.
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
      if (!w) {
        // Popup blocked — fall back to a same-tab redirect.
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onDisconnect = async () => {
    if (busy) return;
    if (!confirm("Disconnect Google Calendar? Existing events that were already pushed will remain on your Google Calendar; new interviews will not sync until you reconnect.")) return;
    setBusy(true);
    setError("");
    try {
      const res = await apiPost("/api/google/disconnect");
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

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

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px", display:"flex", flexDirection:"column", gap:"18px", maxWidth:"720px" }}>

            <div style={{
              background:"var(--surface)", border:"1px solid var(--border)",
              borderRadius:"14px", padding:"22px 26px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"4px" }}>
                <GoogleLogo />
                <h2 style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)" }}>Google Calendar</h2>
              </div>
              <p style={{ fontSize:"12.5px", color:"var(--text-muted)", lineHeight:"1.5", marginBottom:"16px" }}>
                Connect your Google account to automatically push every interview you schedule (or update) to your Google Calendar. Deleting an interview here also removes it from your calendar.
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

              {!loading && status?.configured && (
                <>
                  <div style={{
                    display:"flex", alignItems:"center", gap:"10px",
                    padding:"10px 12px",
                    background: status.connected ? "rgba(16,185,129,0.10)" : "var(--surface-2)",
                    border:`1px solid ${status.connected ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
                    borderRadius:"9px",
                    marginBottom:"14px",
                  }}>
                    <span style={{
                      width:"10px", height:"10px", borderRadius:"50%",
                      background: status.connected ? "#10b981" : "var(--text-faint)",
                      boxShadow: status.connected ? "0 0 6px #10b981" : "none",
                    }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:"13px", fontWeight:"600", color:"var(--text)" }}>
                        {status.connected ? "Connected" : "Not connected"}
                      </div>
                      {status.connected && (
                        <div style={{ fontSize:"11.5px", color:"var(--text-muted)", marginTop:"2px" }}>
                          {status.email} · since {status.connectedAt ? new Date(status.connectedAt).toLocaleDateString() : "—"}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display:"flex", gap:"8px" }}>
                    {!status.connected && (
                      <button onClick={onConnect} disabled={busy} style={{
                        padding:"10px 18px", fontSize:"13px", fontWeight:"700",
                        background: busy ? "rgba(109,40,217,0.45)" : "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                        border:"none", borderRadius:"9px", color:"#fff",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}>{busy ? "Opening…" : "Connect Google Calendar"}</button>
                    )}
                    {status.connected && (
                      <button onClick={onDisconnect} disabled={busy} style={{
                        padding:"10px 18px", fontSize:"13px", fontWeight:"600",
                        background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.30)",
                        borderRadius:"9px", color:"var(--danger)",
                        cursor: busy ? "not-allowed" : "pointer",
                      }}>{busy ? "Working…" : "Disconnect"}</button>
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
