// In-app toast stack for interview reminders. Renders in the bottom-right,
// slides in, dismisses on click or after a timeout. Listens for the
// "interview:reminder" CustomEvent emitted by lib/notifications.js, and also
// surfaces a one-off success toast via the "toast" event.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";

const TYPE_COLORS = {
  hr:            "#a78bfa",
  technical:     "#22d3ee",
  behavioral:    "#fb923c",
  system_design: "#10b981",
  final:         "#db2777",
  other:         "#94a3b8",
};

const TYPE_LABEL = {
  hr: "HR",
  technical: "Technical",
  behavioral: "Behavioral",
  system_design: "System design",
  final: "Final",
  other: "Other",
};

let _toastSeq = 0;
function nextId() { return `t${++_toastSeq}_${Date.now()}`; }

export default function NotificationToasts() {
  const router = useRouter();
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  // Auto-dismiss timers per toast id.
  useEffect(() => {
    if (toasts.length === 0) return;
    const handles = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), t.ttl || 12000)
    );
    return () => handles.forEach(clearTimeout);
  }, [toasts, dismiss]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onReminder = (ev) => {
      const { interview, offsetMin } = ev.detail || {};
      if (!interview) return;
      const accent = TYPE_COLORS[interview.type] || "#a78bfa";
      const at = new Date(interview.scheduledAt);
      setToasts((cur) => [
        ...cur,
        {
          id: nextId(),
          kind: "reminder",
          accent,
          urgent: offsetMin <= 5,
          // Long auto-dismiss for the 5-min reminder so the user actually sees it.
          ttl: offsetMin <= 5 ? 60_000 : 20_000,
          headline: offsetMin <= 5
            ? `Starting in ${offsetMin} minute${offsetMin === 1 ? "" : "s"}`
            : `In ${offsetMin} minutes`,
          title: interview.title || `${TYPE_LABEL[interview.type] || "Interview"}${interview.companyName ? ` · ${interview.companyName}` : ""}`,
          subtitle: interview.companyName && (interview.title || interview.jobTitle)
            ? `${interview.jobTitle || TYPE_LABEL[interview.type] || ""}${interview.companyName ? ` @ ${interview.companyName}` : ""}`.trim()
            : (interview.location || ""),
          time: at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          openHref: "/calendar",
        },
      ]);
    };

    const onToast = (ev) => {
      const { kind = "info", title, body, ttl } = ev.detail || {};
      const accentByKind = { success: "#10b981", error: "#f87171", info: "#a78bfa" };
      setToasts((cur) => [
        ...cur,
        {
          id: nextId(),
          kind,
          accent: accentByKind[kind] || "#a78bfa",
          urgent: false,
          ttl: ttl || 6000,
          title,
          subtitle: body,
        },
      ]);
    };

    window.addEventListener("interview:reminder", onReminder);
    window.addEventListener("toast", onToast);
    return () => {
      window.removeEventListener("interview:reminder", onReminder);
      window.removeEventListener("toast", onToast);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <>
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
          50%      { box-shadow: 0 0 0 14px rgba(239,68,68,0); }
        }
        .toast-wrap {
          position: fixed; right: 18px; bottom: 18px;
          display: flex; flex-direction: column; gap: 10px;
          z-index: 10000; max-width: 380px; pointer-events: none;
        }
        .toast {
          pointer-events: auto;
          background: var(--bg-deep, #08061a);
          border: 1px solid var(--border, rgba(139,92,246,0.18));
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
          animation: slideIn 280ms cubic-bezier(0.2, 0.9, 0.2, 1.05);
          color: var(--text, #f1f5f9);
          width: 360px;
          display: flex; flex-direction: column;
        }
        .stripe {
          height: 4px;
        }
        .body {
          display: grid; grid-template-columns: 36px 1fr auto; gap: 12px;
          padding: 12px 14px;
          align-items: start;
        }
        .icon {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: #fff;
          align-self: center;
        }
        .icon.urgent { animation: pulseGlow 1.6s ease-out infinite; }
        .text { min-width: 0; }
        .head {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.6px;
          margin-bottom: 4px;
        }
        .title {
          font-size: 13.5px; font-weight: 600;
          color: var(--text, #f1f5f9);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sub {
          font-size: 11.5px; color: var(--text-muted, #94a3b8);
          margin-top: 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .time {
          font-size: 11px; color: var(--text-muted, #94a3b8);
          margin-top: 4px; font-weight: 600;
        }
        .actions {
          display: flex; flex-direction: column; gap: 4px;
          align-self: stretch; justify-content: center;
        }
        .btn {
          font-size: 11px; font-weight: 600;
          background: transparent; border: none; cursor: pointer;
          padding: 4px 10px; border-radius: 6px;
          font-family: inherit;
        }
        .btn.primary { color: var(--accent-2, #c4b5fd); }
        .btn.primary:hover { background: var(--accent-soft, rgba(139,92,246,0.18)); }
        .btn.muted { color: var(--text-muted, #94a3b8); }
        .btn.muted:hover { background: var(--surface-2, rgba(139,92,246,0.07)); }
      `}</style>

      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            <div className="stripe" style={{ background: t.accent }} />
            <div className="body">
              <div className={`icon${t.urgent ? " urgent" : ""}`} style={{ background: t.accent }}>
                {t.kind === "reminder" ? "🔔" : t.kind === "success" ? "✓" : t.kind === "error" ? "!" : "ℹ"}
              </div>
              <div className="text">
                {t.headline && <div className="head" style={{ color: t.accent }}>{t.headline}</div>}
                <div className="title">{t.title}</div>
                {t.subtitle && <div className="sub">{t.subtitle}</div>}
                {t.time && <div className="time">at {t.time}</div>}
              </div>
              <div className="actions">
                {t.openHref && (
                  <button className="btn primary" onClick={() => { router.push(t.openHref); dismiss(t.id); }}>Open</button>
                )}
                <button className="btn muted" onClick={() => dismiss(t.id)}>Dismiss</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// Convenience helper any other component can call to surface a toast.
//   import { showToast } from "../components/NotificationToasts";
//   showToast({ kind: "success", title: "Saved", body: "Profile updated." });
export function showToast(detail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("toast", { detail }));
}
