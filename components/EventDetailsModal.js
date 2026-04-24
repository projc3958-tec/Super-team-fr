// Modal showing the full details of one interview. Opened when the user
// clicks an event chip on the calendar. Read-only when the interview belongs
// to another user; the owner sees Edit + Delete buttons that route to the
// /interviews page.

import { useRouter } from "next/router";
import { typeLabel, statusMeta, resultMeta } from "../lib/interviews";
import { partsInTz } from "../lib/tz";
import { colorForUser, initialsFor } from "../lib/userColor";

const TYPE_COLORS = {
  hr:            "#a78bfa",
  technical:     "#22d3ee",
  behavioral:    "#fb923c",
  system_design: "#10b981",
  final:         "#db2777",
  other:         "#94a3b8",
};

function isUrl(s) {
  if (!s) return false;
  return /^https?:\/\//i.test(String(s).trim());
}

function fmtDateTimeInTz(iso, tz) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const p = partsInTz(d, tz);
  const hour12 = ((p.hour + 11) % 12) + 1;
  const ap = p.hour < 12 ? "AM" : "PM";
  const monthName = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][p.month - 1];
  return `${monthName} ${p.day}, ${p.year} · ${hour12}:${String(p.minute).padStart(2, "0")} ${ap}`;
}

function endTimeInTz(iso, durationMinutes, tz) {
  if (!iso) return null;
  const start = new Date(iso);
  if (isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + (durationMinutes || 45) * 60 * 1000);
  const p = partsInTz(end, tz);
  const hour12 = ((p.hour + 11) % 12) + 1;
  const ap = p.hour < 12 ? "AM" : "PM";
  return `${hour12}:${String(p.minute).padStart(2, "0")} ${ap}`;
}

export default function EventDetailsModal({ interview, viewerTz, onClose }) {
  const router = useRouter();
  if (!interview) return null;
  const iv = interview;

  const typeColor = TYPE_COLORS[iv.type] || "#94a3b8";
  const sm = statusMeta(iv.status);
  const rm = resultMeta(iv.result);
  const owned = !iv.ownerId; // server only sets ownerId when results span multiple users

  const tz = iv.timezone || viewerTz;
  const startStr = fmtDateTimeInTz(iv.scheduledAt, tz);
  const endStr = endTimeInTz(iv.scheduledAt, iv.durationMinutes, tz);
  const durationLabel = iv.durationMinutes ? `${iv.durationMinutes} min` : "";

  const ownerKey = iv.ownerEmail || iv.ownerId || "";
  const ownerColor = ownerKey ? colorForUser(ownerKey) : null;
  const ownerInitials = ownerKey ? initialsFor(iv.ownerName || iv.ownerEmail || "user") : null;

  const onEdit = () => {
    onClose();
    router.push(`/interviews?edit=${encodeURIComponent(iv.id)}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px", zIndex: 999,
      }}
    >
      <style jsx>{`
        @keyframes pop {
          from { transform: scale(0.96); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        .card {
          width: 100%; max-width: 520px;
          background: var(--bg-deep);
          border: 1px solid var(--border);
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.45);
          animation: pop 180ms cubic-bezier(0.2,0.9,0.2,1.05);
          display: flex; flex-direction: column;
          max-height: 90vh;
        }
        .head {
          padding: 18px 22px;
          background: linear-gradient(135deg, ${typeColor}26 0%, ${typeColor}10 100%);
          border-bottom: 1px solid var(--border-soft);
        }
        .body {
          padding: 16px 22px 18px;
          overflow-y: auto;
        }
        .row {
          display: grid; grid-template-columns: 92px 1fr;
          gap: 10px; padding: 8px 0;
          border-top: 1px solid var(--border-soft);
        }
        .row:first-of-type { border-top: none; }
        .row .lbl {
          font-size: 10.5px; font-weight: 700; color: var(--label);
          text-transform: uppercase; letter-spacing: 0.6px;
          padding-top: 2px;
        }
        .row .val { font-size: 13px; color: var(--text); line-height: 1.4; word-break: break-word; }
        .pill {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 8px; border-radius: 6px;
          font-size: 11px; font-weight: 600;
        }
        .actions {
          padding: 12px 22px;
          border-top: 1px solid var(--border-soft);
          display: flex; gap: 8px; justify-content: flex-end;
          background: var(--surface);
        }
        a.linklike {
          color: var(--accent-2);
          text-decoration: none;
        }
        a.linklike:hover { text-decoration: underline; }
        .ownerBadge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 3px 8px 3px 4px; border-radius: 999px;
          background: var(--surface-2); border: 1px solid var(--border);
        }
        .ownerDot {
          width: 18px; height: 18px; border-radius: 50%;
          color: #fff; font-size: 9.5px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }
      `}</style>

      <div className="card" onClick={(e) => e.stopPropagation()}>
        <div className="head">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "8px" }}>
            <span className="pill" style={{ color: typeColor, background: `${typeColor}1a`, border: `1px solid ${typeColor}40` }}>
              {typeLabel(iv.type)} · R{iv.round}
            </span>
            <span className="pill" style={{ color: sm.color, background: `${sm.color}1a`, border: `1px solid ${sm.color}40` }}>{sm.label}</span>
            <span className="pill" style={{ color: rm.color, background: `${rm.color}1a`, border: `1px solid ${rm.color}40` }}>{rm.label}</span>
            {ownerKey && (
              <span className="ownerBadge" title={iv.ownerEmail || iv.ownerName || ""}>
                <span className="ownerDot" style={{ background: ownerColor }}>{ownerInitials}</span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{iv.ownerEmail || iv.ownerName}</span>
              </span>
            )}
            {iv.googleEventId && (
              <span className="pill" style={{ color: "#34A853", background: "rgba(52,168,83,0.10)", border: "1px solid rgba(52,168,83,0.30)" }}>
                Synced{iv.googleAccountEmail ? ` · ${iv.googleAccountEmail}` : ""}
              </span>
            )}
          </div>
          <div style={{ fontSize: "17px", fontWeight: "700", color: "var(--text)", lineHeight: "1.3" }}>
            {iv.title || iv.companyName || typeLabel(iv.type)}
          </div>
          {iv.companyName && (iv.title || iv.jobTitle) && (
            <div style={{ fontSize: "12.5px", color: "var(--text-muted)", marginTop: "3px" }}>
              {iv.jobTitle ? `${iv.jobTitle} @ ${iv.companyName}` : iv.companyName}
            </div>
          )}
        </div>

        <div className="body">
          <div className="row">
            <div className="lbl">When</div>
            <div className="val">
              <div>{startStr}</div>
              {endStr && <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>Ends at {endStr}{durationLabel ? ` · ${durationLabel}` : ""}</div>}
              {iv.timezone && <div style={{ color: "var(--text-faint)", fontSize: "11px", marginTop: "2px" }}>Timezone: {iv.timezone}</div>}
            </div>
          </div>

          {iv.profileName && (
            <div className="row">
              <div className="lbl">Profile</div>
              <div className="val">{iv.profileName}</div>
            </div>
          )}

          {(iv.location || iv.interviewer) && (
            <>
              {iv.location && (
                <div className="row">
                  <div className="lbl">Location</div>
                  <div className="val">
                    {isUrl(iv.location)
                      ? <a className="linklike" href={iv.location} target="_blank" rel="noopener noreferrer">{iv.location}</a>
                      : iv.location}
                  </div>
                </div>
              )}
              {iv.interviewer && (
                <div className="row">
                  <div className="lbl">Interviewer</div>
                  <div className="val">{iv.interviewer}</div>
                </div>
              )}
            </>
          )}

          {iv.notes && (
            <div className="row">
              <div className="lbl">Notes</div>
              <div className="val" style={{ whiteSpace: "pre-wrap" }}>{iv.notes}</div>
            </div>
          )}

          {iv.generationId && (
            <div className="row">
              <div className="lbl">Resume</div>
              <div className="val">
                <a className="linklike" href={`/history`}>Linked to a generated resume</a>
              </div>
            </div>
          )}
        </div>

        <div className="actions">
          {owned && (
            <button onClick={onEdit} style={{
              padding: "8px 14px", fontSize: "12.5px", fontWeight: "600",
              background: "var(--surface-3)", border: "1px solid var(--border)",
              borderRadius: "8px", color: "var(--accent-2)", cursor: "pointer",
            }}>Edit</button>
          )}
          <button onClick={onClose} style={{
            padding: "8px 16px", fontSize: "12.5px", fontWeight: "700",
            background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
            border: "none", borderRadius: "8px", color: "#fff", cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}
