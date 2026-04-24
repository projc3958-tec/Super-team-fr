import Link from "next/link";
import { useEffect, useState } from "react";
import { getUser, isAdmin, logout } from "../lib/api";
import { getTheme, toggleTheme } from "../lib/theme";

export const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="38" height="38" rx="11" fill="url(#sblg)"/>
    <path d="M21.5 6L12 21h7l-2.5 11 10-15h-7L21.5 6z" fill="white" fillOpacity="0.95"/>
    <defs>
      <linearGradient id="sblg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6"/>
        <stop offset="1" stopColor="#db2777"/>
      </linearGradient>
    </defs>
  </svg>
);

export function NavLink({ icon, label, href, active }) {
  return (
    <Link href={href} className="nav-link" style={{
      display: "flex", alignItems: "center", gap: "10px",
      padding: "9px 12px", borderRadius: "9px", textDecoration: "none",
      fontSize: "13.5px", fontWeight: active ? "600" : "500",
      color: active ? "var(--accent-2)" : "var(--text-muted)",
      background: active ? "var(--accent-soft)" : "transparent",
      border: `1px solid ${active ? "var(--border)" : "transparent"}`,
      transition: "all 0.15s",
    }}>
      <span style={{ fontSize: "15px", opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </Link>
  );
}

export default function Sidebar({ active }) {
  const [theme, setLocalTheme] = useState("dark");
  const [user, setUser]         = useState(null);

  useEffect(() => {
    setLocalTheme(getTheme());
    setUser(getUser());
  }, []);

  const onToggleTheme = () => setLocalTheme(toggleTheme());
  const admin = isAdmin();
  const generateOnly = user?.role === "generate_only";

  return (
    <aside style={{
      width:"220px", flexShrink:0,
      background:"var(--bg-deep)",
      borderRight:"1px solid var(--border-soft)",
      display:"flex", flexDirection:"column",
      padding:"22px 14px",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"32px", paddingLeft:"2px" }}>
        <Logo />
        <div>
          <div style={{ fontSize:"15px", fontWeight:"700", color:"var(--text)", letterSpacing:"-0.2px" }}>Super Job Studio</div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:"3px", flex:1 }}>
        <div style={{ fontSize:"10px", fontWeight:"600", color:"var(--text-faint)", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 4px", marginBottom:"6px" }}>Workspace</div>
        <NavLink icon="⚡" label="Generate"   href="/"           active={active === "generate"} />

        {!generateOnly && (
          <>
            <NavLink icon="👤" label="Profiles"   href="/profiles"   active={active === "profiles"} />
            <NavLink icon="🗂" label="History"    href="/history"    active={active === "history"} />
            <NavLink icon="🎯" label="Interviews" href="/interviews" active={active === "interviews"} />
            <NavLink icon="📅" label="Calendar"   href="/calendar"   active={active === "calendar"} />
            <NavLink icon="📊" label="Dashboard"  href="/dashboard"  active={active === "dashboard"} />
            <NavLink icon="⚙️" label="Settings"   href="/settings"   active={active === "settings"} />
          </>
        )}

        {admin && (
          <>
            <div style={{ height:"1px", background:"var(--border-soft)", margin:"14px 0 10px" }} />
            <div style={{ fontSize:"10px", fontWeight:"600", color:"var(--text-faint)", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 4px", marginBottom:"6px" }}>Admin</div>
            <NavLink icon="👥" label="Users" href="/admin" active={active === "admin"} />
          </>
        )}
      </div>

      <div style={{ paddingLeft:"2px" }}>
        <button
          onClick={onToggleTheme}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          style={{
            width:"100%", marginBottom:"10px",
            padding:"7px 10px", fontSize:"11.5px", fontWeight:"600",
            background:"var(--surface-2)", border:"1px solid var(--border)",
            borderRadius:"8px", color:"var(--accent)", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:"6px",
          }}
        >
          <span>{theme === "dark" ? "🌙" : "☀️"}</span>
          {theme === "dark" ? "Dark" : "Light"} theme
        </button>
        {user && (
          <div style={{ fontSize:"11px", color:"var(--label)", marginBottom:"4px", fontWeight:"600", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
        )}
        <button onClick={logout} style={{ fontSize:"11px", color:"var(--danger)", background:"transparent", border:"none", cursor:"pointer", padding:0, marginBottom:"6px" }}>Sign out →</button>
        <div style={{ fontSize:"10px", color:"var(--text-faint)" }}>Super Job Studio v1.0.0</div>
      </div>
    </aside>
  );
}
