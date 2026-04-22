import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Device ID ───────────────────────────────────────────────────────────────
async function resolveDeviceId() {
  if (typeof window === "undefined") return "default";
  if (window.electronAPI) return window.electronAPI.getDeviceId();
  let id = localStorage.getItem("_device_id");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("_device_id", id); }
  return id;
}

let _deviceId = null;
async function getDeviceId() {
  if (!_deviceId) _deviceId = await resolveDeviceId();
  return _deviceId;
}

function apiHeaders(deviceId) {
  return { "Content-Type": "application/json", "x-device-id": deviceId };
}

// ─── Logo / Nav (same as other pages) ────────────────────────────────────────
const Logo = () => (
  <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
    <rect width="38" height="38" rx="11" fill="url(#plg)"/>
    <path d="M21.5 6L12 21h7l-2.5 11 10-15h-7L21.5 6z" fill="white" fillOpacity="0.95"/>
    <defs>
      <linearGradient id="plg" x1="0" y1="0" x2="38" y2="38" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8b5cf6"/><stop offset="1" stopColor="#db2777"/>
      </linearGradient>
    </defs>
  </svg>
);

function NavLink({ icon, label, href, active }) {
  return (
    <Link href={href} className="nav-link" style={{
      display:"flex", alignItems:"center", gap:"10px",
      padding:"9px 12px", borderRadius:"9px", textDecoration:"none",
      fontSize:"13.5px", fontWeight: active ? "600" : "500",
      color: active ? "#e2d9ff" : "#6b7280",
      background: active ? "rgba(139,92,246,0.18)" : "transparent",
      border:`1px solid ${active ? "rgba(139,92,246,0.25)" : "transparent"}`,
      transition:"all 0.15s",
    }}>
      <span style={{ fontSize:"15px", opacity: active ? 1 : 0.7 }}>{icon}</span>
      {label}
    </Link>
  );
}

// ─── Empty profile skeleton ───────────────────────────────────────────────────
const emptyProfile = () => ({
  name: "", title: "", email: "", phone: "", location: "", linkedin: "", website: "",
  years_of_experience: "",
  summary: "",
  experience: [],
  education: [],
  skillRows: [],      // UI representation: [{key:"",vals:""}]
});

function toApiProfile(form) {
  const skills = {};
  form.skillRows.forEach(({ key, vals }) => {
    if (key.trim()) skills[key.trim()] = vals.split(",").map(s => s.trim()).filter(Boolean);
  });
  const { skillRows: _, ...rest } = form;
  return { ...rest, skills };
}

function fromApiProfile(data) {
  const skillRows = Object.entries(data.skills || {}).map(([key, vals]) => ({
    key, vals: Array.isArray(vals) ? vals.join(", ") : String(vals),
  }));
  const { skills: _, id: __, ...rest } = data;
  return { ...emptyProfile(), ...rest, skillRows };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const inp = {
  width:"100%", padding:"9px 12px", fontSize:"13px",
  background:"rgba(12,10,30,0.7)", border:"1px solid rgba(139,92,246,0.18)",
  borderRadius:"8px", outline:"none", color:"#e2e8f0",
  transition:"border-color 0.2s", fontFamily:"inherit",
};
const Inp = (props) => <input {...props} className="finp" style={{ ...inp, ...props.style }} />;
const Txt = (props) => <textarea {...props} className="finp" style={{ ...inp, resize:"vertical", lineHeight:"1.6", ...props.style }} />;

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom:"12px" }}>
      <label style={{ display:"block", fontSize:"10.5px", fontWeight:"700", color:"#7c6fcd", textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:"5px" }}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ title, icon, onAdd, addLabel }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"12px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
        <span style={{ fontSize:"14px" }}>{icon}</span>
        <span style={{ fontSize:"12px", fontWeight:"700", color:"#a78bfa", textTransform:"uppercase", letterSpacing:"0.8px" }}>{title}</span>
      </div>
      {onAdd && (
        <button onClick={onAdd} style={{ padding:"4px 12px", fontSize:"12px", fontWeight:"600", background:"rgba(139,92,246,0.12)", border:"1px solid rgba(139,92,246,0.25)", borderRadius:"6px", color:"#c4b5fd", cursor:"pointer" }}>
          + {addLabel}
        </button>
      )}
    </div>
  );
}

function ExpItem({ exp, idx, onChange, onRemove }) {
  const ch = (field, val) => onChange(idx, { ...exp, [field]: val });
  return (
    <div style={{ background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.1)", borderRadius:"10px", padding:"14px", marginBottom:"10px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
        <span style={{ fontSize:"12px", color:"#7c6fcd", fontWeight:"600" }}>Experience #{idx + 1}</span>
        <button onClick={() => onRemove(idx)} style={{ fontSize:"11px", color:"#f87171", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:"5px", padding:"3px 9px", cursor:"pointer" }}>Remove</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
        <FieldRow label="Job Title"><Inp placeholder="e.g. Software Engineer" value={exp.title||""} onChange={e=>ch("title",e.target.value)} /></FieldRow>
        <FieldRow label="Company"><Inp placeholder="e.g. Google" value={exp.company||""} onChange={e=>ch("company",e.target.value)} /></FieldRow>
        <FieldRow label="Location"><Inp placeholder="e.g. San Francisco, CA" value={exp.location||""} onChange={e=>ch("location",e.target.value)} /></FieldRow>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
          <FieldRow label="Start"><Inp placeholder="Jan 2020" value={exp.start_date||""} onChange={e=>ch("start_date",e.target.value)} /></FieldRow>
          <FieldRow label="End"><Inp placeholder="Present" value={exp.end_date||""} onChange={e=>ch("end_date",e.target.value)} /></FieldRow>
        </div>
      </div>
    </div>
  );
}

function EduItem({ edu, idx, onChange, onRemove }) {
  const ch = (f, v) => onChange(idx, { ...edu, [f]: v });
  return (
    <div style={{ background:"rgba(139,92,246,0.05)", border:"1px solid rgba(139,92,246,0.1)", borderRadius:"10px", padding:"14px", marginBottom:"10px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
        <span style={{ fontSize:"12px", color:"#7c6fcd", fontWeight:"600" }}>Education #{idx + 1}</span>
        <button onClick={() => onRemove(idx)} style={{ fontSize:"11px", color:"#f87171", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:"5px", padding:"3px 9px", cursor:"pointer" }}>Remove</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px" }}>
        <FieldRow label="Degree"><Inp placeholder="B.S. Computer Science" value={edu.degree||""} onChange={e=>ch("degree",e.target.value)} /></FieldRow>
        <FieldRow label="School"><Inp placeholder="University Name" value={edu.school||""} onChange={e=>ch("school",e.target.value)} /></FieldRow>
        <FieldRow label="Start Year"><Inp placeholder="2014" value={edu.start_year||""} onChange={e=>ch("start_year",e.target.value)} /></FieldRow>
        <FieldRow label="End Year"><Inp placeholder="2018" value={edu.end_year||""} onChange={e=>ch("end_year",e.target.value)} /></FieldRow>
        <FieldRow label="GPA (optional)"><Inp placeholder="3.8" value={edu.grade||""} onChange={e=>ch("grade",e.target.value)} /></FieldRow>
      </div>
    </div>
  );
}

function SkillRow({ row, idx, onChange, onRemove }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"140px 1fr 32px", gap:"8px", marginBottom:"8px", alignItems:"center" }}>
      <Inp placeholder="Category" value={row.key} onChange={e => onChange(idx, { ...row, key: e.target.value })} />
      <Inp placeholder="Python, JavaScript, React (comma-separated)" value={row.vals} onChange={e => onChange(idx, { ...row, vals: e.target.value })} />
      <button onClick={() => onRemove(idx)} style={{ width:"32px", height:"36px", fontSize:"14px", color:"#f87171", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.15)", borderRadius:"7px", cursor:"pointer" }}>×</button>
    </div>
  );
}

// ─── Profile Editor ───────────────────────────────────────────────────────────
function ProfileEditor({ form, setForm, saving, onSave, onDelete, isNew }) {
  const ch = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addExp = () => setForm(f => ({ ...f, experience: [...f.experience, { title:"", company:"", location:"", start_date:"", end_date:"Present", details:[] }] }));
  const updExp = (i, v) => setForm(f => { const a = [...f.experience]; a[i] = v; return { ...f, experience: a }; });
  const rmExp  = (i) => setForm(f => ({ ...f, experience: f.experience.filter((_,j)=>j!==i) }));

  const addEdu = () => setForm(f => ({ ...f, education: [...f.education, { degree:"", school:"", start_year:"", end_year:"", grade:"" }] }));
  const updEdu = (i, v) => setForm(f => { const a = [...f.education]; a[i] = v; return { ...f, education: a }; });
  const rmEdu  = (i) => setForm(f => ({ ...f, education: f.education.filter((_,j)=>j!==i) }));

  const divider = <div style={{ height:"1px", background:"rgba(139,92,246,0.1)", margin:"18px 0" }} />;

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column" }}>
      {/* Editor header */}
      <div style={{ padding:"18px 24px", borderBottom:"1px solid rgba(139,92,246,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
        <div>
          <h2 style={{ fontSize:"15px", fontWeight:"700", color:"#e2d9ff" }}>{isNew ? "New Profile" : `Editing: ${form.name || "Untitled"}`}</h2>
          <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"2px" }}>Fill in your resume details</p>
        </div>
        <div style={{ display:"flex", gap:"8px" }}>
          {!isNew && onDelete && (
            <button onClick={onDelete} style={{ padding:"8px 14px", fontSize:"13px", fontWeight:"600", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:"8px", color:"#f87171", cursor:"pointer" }}>
              Delete
            </button>
          )}
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            style={{
              padding:"8px 20px", fontSize:"13px", fontWeight:"700",
              background: saving || !form.name.trim() ? "rgba(139,92,246,0.1)" : "linear-gradient(135deg,#7c3aed,#db2777)",
              border:"none", borderRadius:"8px", color: saving || !form.name.trim() ? "#7c6fcd" : "#fff",
              cursor: saving || !form.name.trim() ? "not-allowed" : "pointer",
              boxShadow: saving || !form.name.trim() ? "none" : "0 2px 12px rgba(139,92,246,0.35)",
            }}
          >
            {saving ? "Saving…" : isNew ? "Create Profile" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Scrollable form */}
      <div style={{ flex:1, overflowY:"auto", padding:"22px 24px" }}>

        {/* Basic Info */}
        <SectionHeader title="Basic Info" icon="👤" />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
          <FieldRow label="Full Name *"><Inp placeholder="Jane Smith" value={form.name} onChange={e=>ch("name",e.target.value)} /></FieldRow>
          <FieldRow label="Job Title / Role"><Inp placeholder="Senior Software Engineer" value={form.title} onChange={e=>ch("title",e.target.value)} /></FieldRow>
          <FieldRow label="Email"><Inp type="email" placeholder="jane@example.com" value={form.email} onChange={e=>ch("email",e.target.value)} /></FieldRow>
          <FieldRow label="Phone"><Inp placeholder="+1 234 567 8900" value={form.phone} onChange={e=>ch("phone",e.target.value)} /></FieldRow>
          <FieldRow label="Location"><Inp placeholder="San Francisco, CA" value={form.location} onChange={e=>ch("location",e.target.value)} /></FieldRow>
          <FieldRow label="LinkedIn URL"><Inp placeholder="linkedin.com/in/janesmith" value={form.linkedin} onChange={e=>ch("linkedin",e.target.value)} /></FieldRow>
          <FieldRow label="Website (optional)"><Inp placeholder="janesmith.dev" value={form.website} onChange={e=>ch("website",e.target.value)} /></FieldRow>
          <FieldRow label="Total Years of Experience"><Inp type="number" min="0" step="1" placeholder="e.g. 8 (leave blank to auto-calc from dates)" value={form.years_of_experience || ""} onChange={e=>ch("years_of_experience",e.target.value)} /></FieldRow>
        </div>

        {divider}

        {/* Experience */}
        <SectionHeader title="Work Experience" icon="💼" onAdd={addExp} addLabel="Add Job" />
        {form.experience.length === 0 && (
          <p style={{ fontSize:"13px", color:"#4b5563", marginBottom:"12px" }}>No experience entries yet. Click "Add Job" to start.</p>
        )}
        {form.experience.map((exp, i) => (
          <ExpItem key={i} exp={exp} idx={i} onChange={updExp} onRemove={rmExp} />
        ))}

        {divider}

        {/* Education */}
        <SectionHeader title="Education" icon="🎓" onAdd={addEdu} addLabel="Add Degree" />
        {form.education.length === 0 && (
          <p style={{ fontSize:"13px", color:"#4b5563", marginBottom:"12px" }}>No education entries yet. Click "Add Degree" to start.</p>
        )}
        {form.education.map((edu, i) => (
          <EduItem key={i} edu={edu} idx={i} onChange={updEdu} onRemove={rmEdu} />
        ))}

        {divider}
      </div>
    </div>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────
function ProfileCard({ profile, active, onClick }) {
  const initials = (profile.name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div onClick={onClick} style={{
      padding:"13px 14px", borderRadius:"10px", cursor:"pointer",
      background: active ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.03)",
      border:`1px solid ${active ? "rgba(139,92,246,0.3)" : "rgba(139,92,246,0.08)"}`,
      marginBottom:"6px", transition:"all 0.15s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
        <div style={{
          width:"36px", height:"36px", borderRadius:"9px", flexShrink:0,
          background:"linear-gradient(135deg,#7c3aed,#db2777)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:"13px", fontWeight:"700", color:"#fff",
        }}>{initials}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:"13.5px", fontWeight:"600", color: active ? "#e2d9ff" : "#d4d0ea", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profile.name}</div>
          {profile.title && <div style={{ fontSize:"11.5px", color:"#6b7280", marginTop:"1px", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{profile.title}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProfilesPage() {
  const [deviceId, setDeviceId] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null); // null = new, string = editing
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState(emptyProfile());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // Init deviceId
  useEffect(() => {
    getDeviceId().then(id => { setDeviceId(id); });
  }, []);

  // Load profiles when deviceId is ready
  const loadProfiles = useCallback(async (dId) => {
    if (!dId) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${API}/api/profiles`, { headers: { "x-device-id": dId } });
      const data = await res.json();
      setProfiles(data);
    } catch {
      showToast("Failed to load profiles", "error");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => { if (deviceId) loadProfiles(deviceId); }, [deviceId, loadProfiles]);

  // Select a profile to edit
  const selectProfile = async (id) => {
    if (!deviceId) return;
    try {
      const res = await fetch(`${API}/api/profiles/${id}`, { headers: { "x-device-id": deviceId } });
      const data = await res.json();
      setForm(fromApiProfile(data));
      setSelectedId(id);
      setIsNew(false);
      setConfirmDelete(false);
    } catch {
      showToast("Failed to load profile", "error");
    }
  };

  const startNew = () => {
    setForm(emptyProfile());
    setSelectedId(null);
    setIsNew(true);
    setConfirmDelete(false);
  };

  const save = async () => {
    if (!deviceId || !form.name.trim()) return;
    setSaving(true);
    try {
      const body = JSON.stringify(toApiProfile(form));
      const headers = apiHeaders(deviceId);
      let res;
      if (isNew) {
        res = await fetch(`${API}/api/profiles`, { method:"POST", headers, body });
      } else {
        res = await fetch(`${API}/api/profiles/${selectedId}`, { method:"PUT", headers, body });
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      const saved = await res.json();
      await loadProfiles(deviceId);
      if (isNew) { setSelectedId(saved.id); setIsNew(false); }
      showToast(isNew ? "Profile created!" : "Changes saved!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteProfile = async () => {
    if (!deviceId || !selectedId) return;
    try {
      const res = await fetch(`${API}/api/profiles/${selectedId}`, {
        method: "DELETE",
        headers: { "x-device-id": deviceId },
      });
      if (!res.ok) throw new Error("Failed to delete");
      await loadProfiles(deviceId);
      setSelectedId(null);
      setIsNew(false);
      setForm(emptyProfile());
      setConfirmDelete(false);
      showToast("Profile deleted");
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const showPanel = isNew || selectedId !== null;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
        html, body { height:100%; overflow:hidden; }
        body { font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif; background:#0c0a1e; color:#f1f5f9; }
        input, select, textarea, button { font-family:inherit; }
        ::-webkit-scrollbar { width:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:rgba(139,92,246,0.35); border-radius:6px; }
        .finp:focus { border-color:rgba(139,92,246,0.55)!important; box-shadow:0 0 0 3px rgba(139,92,246,0.1)!important; outline:none!important; }
        .nav-link:hover { background:rgba(139,92,246,0.1)!important; color:#c4b5fd!important; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", top:"20px", right:"24px", zIndex:9999,
          padding:"12px 18px", borderRadius:"10px", fontSize:"13px", fontWeight:"600",
          background: toast.type === "error" ? "rgba(239,68,68,0.15)" : "rgba(139,92,246,0.15)",
          border:`1px solid ${toast.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(139,92,246,0.3)"}`,
          color: toast.type === "error" ? "#f87171" : "#c4b5fd",
          backdropFilter:"blur(12px)",
        }}>
          {toast.type === "error" ? "✗" : "✓"} {toast.msg}
        </div>
      )}

      <div style={{ display:"flex", height:"100vh", background:"#0c0a1e" }}>

        {/* ── SIDEBAR ── */}
        <aside style={{ width:"220px", flexShrink:0, background:"#08061a", borderRight:"1px solid rgba(139,92,246,0.1)", display:"flex", flexDirection:"column", padding:"22px 14px" }}>
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
            <NavLink icon="👤" label="Profiles"  href="/profiles"  active={true}  />
            <NavLink icon="📊" label="Dashboard" href="/dashboard" active={false} />
            <div style={{ height:"1px", background:"rgba(139,92,246,0.08)", margin:"14px 0 10px" }} />
            <div style={{ fontSize:"10px", fontWeight:"600", color:"#374151", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 4px", marginBottom:"6px" }}>Account</div>
            <NavLink icon="🔑" label="License" href="/license" active={false} />
          </div>
          <div style={{ paddingLeft:"2px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"6px", marginBottom:"4px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#10b981", boxShadow:"0 0 5px #10b981" }} />
              <span style={{ fontSize:"11px", color:"#6b7280" }}>Backend online</span>
            </div>
            <div style={{ fontSize:"10px", color:"#374151" }}>Super Team v1.0.0</div>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

          {/* Top bar */}
          <header style={{ padding:"0 28px", height:"56px", flexShrink:0, background:"rgba(8,6,26,0.6)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(139,92,246,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <h1 style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9" }}>My Profiles</h1>
              <p style={{ fontSize:"11px", color:"#4b5563", marginTop:"1px" }}>Create and manage your resume profiles</p>
            </div>
            <button onClick={startNew} style={{ padding:"8px 18px", fontSize:"13px", fontWeight:"700", background:"linear-gradient(135deg,#7c3aed,#db2777)", border:"none", borderRadius:"9px", color:"#fff", cursor:"pointer", boxShadow:"0 2px 12px rgba(139,92,246,0.35)" }}>
              + New Profile
            </button>
          </header>

          {/* Two-panel content */}
          <div style={{ flex:1, overflow:"hidden", display:"flex" }}>

            {/* Profile list */}
            <div style={{ width:"280px", flexShrink:0, borderRight:"1px solid rgba(139,92,246,0.08)", padding:"16px 14px", overflowY:"auto", display:"flex", flexDirection:"column" }}>
              {loadingList ? (
                <p style={{ fontSize:"13px", color:"#4b5563", textAlign:"center", marginTop:"24px" }}>Loading…</p>
              ) : profiles.length === 0 ? (
                <div style={{ textAlign:"center", marginTop:"32px" }}>
                  <div style={{ fontSize:"28px", marginBottom:"10px" }}>👤</div>
                  <p style={{ fontSize:"13px", color:"#4b5563", lineHeight:"1.6" }}>No profiles yet.<br/>Click <strong style={{ color:"#a78bfa" }}>+ New Profile</strong> to create one.</p>
                </div>
              ) : (
                profiles.map(p => (
                  <ProfileCard key={p.id} profile={p} active={selectedId === p.id} onClick={() => selectProfile(p.id)} />
                ))
              )}
            </div>

            {/* Editor panel */}
            <div style={{ flex:1, overflow:"hidden", minWidth:0 }}>
              {showPanel ? (
                <>
                  {confirmDelete ? (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
                      <div style={{ background:"rgba(17,10,40,0.95)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:"16px", padding:"36px 40px", textAlign:"center", maxWidth:"380px" }}>
                        <div style={{ fontSize:"28px", marginBottom:"12px" }}>⚠️</div>
                        <h3 style={{ fontSize:"16px", fontWeight:"700", color:"#f1f5f9", marginBottom:"8px" }}>Delete Profile?</h3>
                        <p style={{ fontSize:"13px", color:"#6b7280", marginBottom:"24px", lineHeight:"1.6" }}>This will permanently delete <strong style={{ color:"#e2d9ff" }}>{form.name}</strong>. This action cannot be undone.</p>
                        <div style={{ display:"flex", gap:"10px", justifyContent:"center" }}>
                          <button onClick={() => setConfirmDelete(false)} style={{ padding:"9px 20px", fontSize:"13px", fontWeight:"600", background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:"8px", color:"#a78bfa", cursor:"pointer" }}>Cancel</button>
                          <button onClick={deleteProfile} style={{ padding:"9px 20px", fontSize:"13px", fontWeight:"700", background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"8px", color:"#f87171", cursor:"pointer" }}>Yes, Delete</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ProfileEditor
                      form={form}
                      setForm={setForm}
                      saving={saving}
                      onSave={save}
                      onDelete={() => setConfirmDelete(true)}
                      isNew={isNew}
                    />
                  )}
                </>
              ) : (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:"12px" }}>
                  <div style={{ fontSize:"40px", opacity:0.25 }}>👤</div>
                  <p style={{ fontSize:"14px", color:"#4b5563" }}>Select a profile to edit, or create a new one.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
