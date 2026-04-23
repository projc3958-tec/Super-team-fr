import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { apiGet, apiPost, apiPut, apiDelete, getUser, isAdmin, logout } from "../lib/api";

const ALLOWED_PERMISSIONS = [
  { value: "view_all_stats", label: "View all-profile stats" },
];

const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" rx="11" fill="url(#alg)"/>
    <path d="M21.5 6L12 21h7l-2.5 11 10-15h-7L21.5 6z" fill="white" fillOpacity="0.95"/>
    <defs>
      <linearGradient id="alg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
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
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function Admin() {
  const router = useRouter();
  const [me, setMe]                 = useState(null);
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [creating, setCreating]     = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [revealed, setRevealed]     = useState(null); // { email, password }

  // create form state
  const [newEmail, setNewEmail]         = useState("");
  const [newName, setNewName]           = useState("");
  const [newRole, setNewRole]           = useState("user");
  const [newPerms, setNewPerms]         = useState([]);
  const [newPassword, setNewPassword]   = useState("");
  const [newGenerate, setNewGenerate]   = useState(true);

  useEffect(() => {
    const u = getUser();
    setMe(u);
    if (!isAdmin()) {
      router.replace("/");
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/users");
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setUsers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const togglePerm = (perm) => {
    setNewPerms((p) => p.includes(perm) ? p.filter(x => x !== perm) : [...p, perm]);
  };

  const onCreate = async (e) => {
    e?.preventDefault?.();
    if (creating) return;
    setError("");
    if (!newEmail.trim()) { setError("Email is required."); return; }
    if (!newGenerate && newPassword.length < 8) { setError("Password must be at least 8 characters (or use generate)."); return; }

    setCreating(true);
    try {
      const res = await apiPost("/api/users", {
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole,
        permissions: newPerms,
        password: newGenerate ? undefined : newPassword,
        generatePassword: newGenerate,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.generatedPassword) {
        setRevealed({ email: data.user.email, password: data.generatedPassword });
      }
      setShowCreate(false);
      setNewEmail(""); setNewName(""); setNewRole("user"); setNewPerms([]); setNewPassword(""); setNewGenerate(true);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const onUpdateRole = async (user, role) => {
    if (user.role === role) return;
    try {
      const res = await apiPut(`/api/users/${user.id}`, { role });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      refresh();
    } catch (err) { alert("Update failed: " + err.message); }
  };

  const onTogglePermission = async (user, perm) => {
    const next = user.permissions.includes(perm)
      ? user.permissions.filter(p => p !== perm)
      : [...user.permissions, perm];
    try {
      const res = await apiPut(`/api/users/${user.id}`, { permissions: next });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) { alert("Permission update failed: " + err.message); }
  };

  const onToggleDisabled = async (user) => {
    try {
      const res = await apiPut(`/api/users/${user.id}`, { disabled: !user.disabled });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) { alert("Update failed: " + err.message); }
  };

  const onResetPassword = async (user) => {
    if (!confirm(`Generate a new password for ${user.email}? They will need this new password to sign in.`)) return;
    try {
      const res = await apiPost(`/api/users/${user.id}/reset-password`, { generatePassword: true });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      if (data.generatedPassword) setRevealed({ email: user.email, password: data.generatedPassword });
    } catch (err) { alert("Reset failed: " + err.message); }
  };

  const onDelete = async (user) => {
    if (!confirm(`Permanently delete ${user.email}? Their resumes/profiles will be orphaned but not deleted.`)) return;
    try {
      const res = await apiDelete(`/api/users/${user.id}`);
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      refresh();
    } catch (err) { alert("Delete failed: " + err.message); }
  };

  const copyPassword = async (text) => {
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#0c0a1e; color:#f1f5f9; }
        input,select,textarea,button { font-family:inherit; }
        ::-webkit-scrollbar { width:5px; }
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
            <NavLink icon="🗂" label="History"   href="/history"   active={false} />
            <NavLink icon="📊" label="Dashboard" href="/dashboard" active={false} />
            <div style={{ height:"1px", background:"rgba(139,92,246,0.08)", margin:"14px 0 10px" }} />
            <div style={{ fontSize:"10px", fontWeight:"600", color:"#374151", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 4px", marginBottom:"6px" }}>Admin</div>
            <NavLink icon="👥" label="Users" href="/admin" active={true} />
          </div>
          <div style={{ paddingLeft:"2px" }}>
            <div style={{ fontSize:"11px", color:"#7c6fcd", marginBottom:"4px", fontWeight:"600" }}>{me?.email}</div>
            <button onClick={logout} style={{ fontSize:"11px", color:"#f87171", background:"transparent", border:"none", cursor:"pointer", padding:0 }}>Sign out →</button>
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
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>User Management</h1>
              <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"1px" }}>Create accounts, set permissions, reset passwords</p>
            </div>
            <button
              onClick={() => setShowCreate(s => !s)}
              style={{
                padding:"8px 16px", fontSize:"12.5px", fontWeight:"700",
                background:"linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                border:"none", borderRadius:"9px", color:"#fff", cursor:"pointer",
              }}
            >+ New user</button>
          </header>

          <div style={{ flex:1, overflowY:"auto", padding:"22px 28px" }}>

            {revealed && (
              <div style={{
                padding:"14px 18px", marginBottom:"18px",
                background:"rgba(16,185,129,0.10)", border:"1px solid rgba(16,185,129,0.3)",
                borderRadius:"12px",
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:"14px", flexWrap:"wrap",
              }}>
                <div>
                  <div style={{ fontSize:"12px", color:"#6ee7b7", fontWeight:"700", marginBottom:"4px" }}>Password generated for {revealed.email}</div>
                  <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:"14px", color:"#f1f5f9", letterSpacing:"0.5px" }}>{revealed.password}</div>
                  <div style={{ fontSize:"11px", color:"#6b7280", marginTop:"4px" }}>Share this once and securely. It will not be shown again.</div>
                </div>
                <div style={{ display:"flex", gap:"8px" }}>
                  <button onClick={() => copyPassword(revealed.password)} style={{
                    padding:"7px 14px", fontSize:"12px", fontWeight:"600",
                    background:"rgba(16,185,129,0.18)", border:"1px solid rgba(16,185,129,0.35)",
                    borderRadius:"8px", color:"#6ee7b7", cursor:"pointer",
                  }}>Copy</button>
                  <button onClick={() => setRevealed(null)} style={{
                    padding:"7px 14px", fontSize:"12px", fontWeight:"600",
                    background:"transparent", border:"1px solid rgba(139,92,246,0.25)",
                    borderRadius:"8px", color:"#7c6fcd", cursor:"pointer",
                  }}>Dismiss</button>
                </div>
              </div>
            )}

            {showCreate && (
              <form onSubmit={onCreate} style={{
                background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.15)",
                borderRadius:"14px", padding:"18px 22px", marginBottom:"18px",
              }}>
                <div style={{ fontSize:"13px", fontWeight:"700", color:"#e2d9ff", marginBottom:"12px" }}>Create user</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px", marginBottom:"12px" }}>
                  <div>
                    <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Email</label>
                    <input className="field" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="user@company.com" style={fieldBase} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Display name</label>
                    <input className="field" type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full name (optional)" style={fieldBase} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Role</label>
                    <select className="field" value={newRole} onChange={e => setNewRole(e.target.value)} style={fieldBase}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"5px" }}>Permissions</label>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:"8px", padding:"6px 0" }}>
                      {ALLOWED_PERMISSIONS.map(p => (
                        <label key={p.value} style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"12px", color:"#cbd5e1", cursor:"pointer" }}>
                          <input type="checkbox" checked={newPerms.includes(p.value)} onChange={() => togglePerm(p.value)} style={{ accentColor:"#8b5cf6" }} />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display:"flex", flexDirection:"column", gap:"8px", marginBottom:"14px" }}>
                  <label style={{ display:"flex", alignItems:"center", gap:"8px", fontSize:"12.5px", color:"#cbd5e1", cursor:"pointer" }}>
                    <input type="checkbox" checked={newGenerate} onChange={e => setNewGenerate(e.target.checked)} style={{ accentColor:"#8b5cf6" }} />
                    Generate a random password (recommended; will be shown once)
                  </label>
                  {!newGenerate && (
                    <input
                      className="field"
                      type="text"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      style={fieldBase}
                    />
                  )}
                </div>

                {error && (
                  <div style={{ padding:"10px 12px", marginBottom:"12px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"9px", color:"#f87171", fontSize:"12.5px" }}>{error}</div>
                )}

                <div style={{ display:"flex", gap:"8px" }}>
                  <button type="submit" disabled={creating} style={{
                    padding:"10px 18px", fontSize:"12.5px", fontWeight:"700",
                    background: creating ? "rgba(109,40,217,0.45)" : "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
                    border:"none", borderRadius:"9px", color:"#fff",
                    cursor: creating ? "not-allowed" : "pointer",
                  }}>{creating ? "Creating…" : "Create user"}</button>
                  <button type="button" onClick={() => { setShowCreate(false); setError(""); }} style={{
                    padding:"10px 16px", fontSize:"12.5px", fontWeight:"600",
                    background:"transparent", border:"1px solid rgba(139,92,246,0.25)",
                    borderRadius:"9px", color:"#7c6fcd", cursor:"pointer",
                  }}>Cancel</button>
                </div>
              </form>
            )}

            {error && !showCreate && (
              <div style={{ padding:"12px 16px", marginBottom:"14px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"10px", color:"#f87171", fontSize:"13px" }}>{error}</div>
            )}

            <div style={{ background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.1)", borderRadius:"14px", overflow:"hidden" }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
                  <thead>
                    <tr style={{ background:"rgba(139,92,246,0.07)", color:"#7c6fcd", textAlign:"left" }}>
                      {["Email", "Name", "Role", "Permissions", "Status", "Created", "Last login", "Actions"].map(h => (
                        <th key={h} style={{ padding:"11px 14px", fontSize:"10.5px", fontWeight:"700", textTransform:"uppercase", letterSpacing:"0.6px", borderBottom:"1px solid rgba(139,92,246,0.1)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && users.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:"13px" }}>Loading…</td></tr>
                    )}
                    {!loading && users.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign:"center", color:"#4b5563", padding:"40px 0", fontSize:"13px" }}>No users yet.</td></tr>
                    )}
                    {users.map(u => (
                      <tr key={u.id} style={{ borderBottom:"1px solid rgba(139,92,246,0.06)" }}>
                        <td style={{ padding:"10px 14px", color:"#e2e8f0" }}>{u.email}</td>
                        <td style={{ padding:"10px 14px", color:"#cbd5e1" }}>{u.name || "—"}</td>
                        <td style={{ padding:"10px 14px" }}>
                          <select value={u.role} onChange={e => onUpdateRole(u, e.target.value)} style={{ ...fieldBase, padding:"5px 8px", fontSize:"12px", width:"auto" }}>
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
                            {ALLOWED_PERMISSIONS.map(p => (
                              <label key={p.value} style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"11.5px", color:"#cbd5e1", cursor: u.role === "admin" ? "not-allowed" : "pointer", opacity: u.role === "admin" ? 0.55 : 1 }}>
                                <input
                                  type="checkbox"
                                  checked={u.role === "admin" || u.permissions.includes(p.value)}
                                  disabled={u.role === "admin"}
                                  onChange={() => onTogglePermission(u, p.value)}
                                  style={{ accentColor:"#8b5cf6" }}
                                />
                                {p.label}
                              </label>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding:"10px 14px" }}>
                          <span style={{
                            fontSize:"11px", fontWeight:"600",
                            padding:"3px 8px", borderRadius:"6px",
                            color: u.disabled ? "#f87171" : "#6ee7b7",
                            background: u.disabled ? "rgba(239,68,68,0.10)" : "rgba(16,185,129,0.10)",
                            border: `1px solid ${u.disabled ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"}`,
                          }}>{u.disabled ? "Disabled" : "Active"}</span>
                        </td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8", whiteSpace:"nowrap" }}>{fmtDate(u.createdAt)}</td>
                        <td style={{ padding:"10px 14px", color:"#94a3b8", whiteSpace:"nowrap" }}>{fmtDate(u.lastLoginAt)}</td>
                        <td style={{ padding:"10px 14px", whiteSpace:"nowrap" }}>
                          <button onClick={() => onResetPassword(u)} style={{
                            padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                            background:"rgba(139,92,246,0.18)", border:"1px solid rgba(139,92,246,0.3)",
                            borderRadius:"7px", color:"#c4b5fd", cursor:"pointer", marginRight:"6px",
                          }}>Reset PW</button>
                          <button onClick={() => onToggleDisabled(u)} style={{
                            padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                            background:"rgba(245,158,11,0.10)", border:"1px solid rgba(245,158,11,0.30)",
                            borderRadius:"7px", color:"#fcd34d", cursor:"pointer", marginRight:"6px",
                          }}>{u.disabled ? "Enable" : "Disable"}</button>
                          {u.id !== me?.id && (
                            <button onClick={() => onDelete(u)} style={{
                              padding:"5px 10px", fontSize:"11.5px", fontWeight:"600",
                              background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.30)",
                              borderRadius:"7px", color:"#f87171", cursor:"pointer",
                            }}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
