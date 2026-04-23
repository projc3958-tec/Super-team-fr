import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { login, isAuthenticated } from "../lib/api";

const Logo = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="14" fill="url(#loginlg)"/>
    <path d="M27 8L15 26h9l-3 14 13-19h-9L27 8z" fill="white" fillOpacity="0.95"/>
    <defs>
      <linearGradient id="loginlg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6"/>
        <stop offset="1" stopColor="#db2777"/>
      </linearGradient>
    </defs>
  </svg>
);

const fieldBase = {
  width: "100%", padding: "12px 14px", fontSize: "14px",
  background: "rgba(12,10,30,0.7)", border: "1px solid rgba(139,92,246,0.18)",
  borderRadius: "10px", outline: "none", color: "#e2e8f0",
  transition: "border-color 0.2s, box-shadow 0.2s", fontFamily: "inherit",
};

export default function Login() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (isAuthenticated()) router.replace("/");
  }, [router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#0c0a1e; color:#f1f5f9; }
        input,select,textarea,button { font-family:inherit; }
        .field:focus { border-color:rgba(139,92,246,0.55)!important; box-shadow:0 0 0 3px rgba(139,92,246,0.12)!important; }
      `}</style>

      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px", background:"radial-gradient(ellipse at top, rgba(139,92,246,0.10), transparent 60%) #0c0a1e" }}>
        <div style={{ width:"100%", maxWidth:"380px" }}>

          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginBottom:"22px" }}>
            <Logo />
            <h1 style={{ fontSize:"20px", fontWeight:"700", color:"#f1f5f9", marginTop:"14px", letterSpacing:"-0.3px" }}>Super Team</h1>
            <p style={{ fontSize:"12px", color:"#7c6fcd", letterSpacing:"1.2px", textTransform:"uppercase", marginTop:"3px", fontWeight:"600" }}>Resume Studio</p>
          </div>

          <form onSubmit={onSubmit} style={{
            background:"rgba(8,6,26,0.8)",
            border:"1px solid rgba(139,92,246,0.15)",
            borderRadius:"16px",
            padding:"26px 26px 22px",
            backdropFilter:"blur(10px)",
          }}>
            <h2 style={{ fontSize:"15px", fontWeight:"700", color:"#e2d9ff", marginBottom:"4px" }}>Sign in</h2>
            <p style={{ fontSize:"12px", color:"#6b7280", marginBottom:"18px" }}>Use the credentials provided by your administrator.</p>

            <div style={{ marginBottom:"12px" }}>
              <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"6px" }}>Email</label>
              <input
                className="field"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={fieldBase}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div style={{ marginBottom:"14px" }}>
              <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:"6px" }}>Password</label>
              <div style={{ position:"relative" }}>
                <input
                  className="field"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ ...fieldBase, paddingRight:"60px" }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  style={{
                    position:"absolute", right:"6px", top:"50%", transform:"translateY(-50%)",
                    padding:"5px 10px", fontSize:"11px", fontWeight:"600",
                    background:"transparent", border:"none", color:"#7c6fcd", cursor:"pointer",
                  }}
                >{show ? "Hide" : "Show"}</button>
              </div>
            </div>

            {error && (
              <div style={{
                padding:"10px 12px", marginBottom:"12px",
                background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)",
                borderRadius:"9px", color:"#f87171", fontSize:"12.5px", lineHeight:"1.4",
              }}>{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width:"100%", padding:"13px 20px",
                fontSize:"14px", fontWeight:"700", letterSpacing:"-0.2px",
                color:"#fff",
                background: submitting ? "rgba(109,40,217,0.45)" : "linear-gradient(135deg, #7c3aed 0%, #9333ea 40%, #db2777 100%)",
                border:"none", borderRadius:"11px",
                cursor: submitting ? "not-allowed" : "pointer",
                boxShadow: submitting ? "none" : "0 4px 24px rgba(139,92,246,0.35)",
                transition:"all 0.2s",
              }}
            >{submitting ? "Signing in…" : "Sign in"}</button>

            <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"14px", lineHeight:"1.5", textAlign:"center" }}>
              Need access? Ask an administrator to create an account for you.
            </p>
          </form>

          <div style={{ textAlign:"center", marginTop:"16px", fontSize:"10.5px", color:"#374151" }}>
            Super Team v1.0.0
          </div>
        </div>
      </div>
    </>
  );
}
