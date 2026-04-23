// Shared constants + helpers for interview UI.

export const INTERVIEW_TYPES = [
  { value: "hr",            label: "HR / Recruiter screen" },
  { value: "technical",     label: "Technical" },
  { value: "behavioral",    label: "Behavioral" },
  { value: "system_design", label: "System design" },
  { value: "final",         label: "Final / On-site" },
  { value: "other",         label: "Other" },
];

export const INTERVIEW_STATUSES = [
  { value: "scheduled",   label: "Scheduled",   color: "#a78bfa" },
  { value: "completed",   label: "Completed",   color: "#22d3ee" },
  { value: "cancelled",   label: "Cancelled",   color: "#9ca3af" },
  { value: "rescheduled", label: "Rescheduled", color: "#fb923c" },
  { value: "no_show",     label: "No-show",     color: "#f87171" },
];

export const INTERVIEW_RESULTS = [
  { value: "pending",  label: "Pending",  color: "#a78bfa" },
  { value: "passed",   label: "Passed",   color: "#10b981" },
  { value: "failed",   label: "Failed",   color: "#f87171" },
  { value: "offer",    label: "Offer",    color: "#22d3ee" },
  { value: "rejected", label: "Rejected", color: "#fb7185" },
];

export const typeLabel = (v) => INTERVIEW_TYPES.find((t) => t.value === v)?.label || v;
export const statusMeta = (v) => INTERVIEW_STATUSES.find((t) => t.value === v) || { label: v, color: "#94a3b8" };
export const resultMeta = (v) => INTERVIEW_RESULTS.find((t) => t.value === v) || { label: v, color: "#94a3b8" };

export function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(local) {
  if (!local) return null;
  const d = new Date(local);
  return isNaN(d.getTime()) ? null : d.toISOString();
}
