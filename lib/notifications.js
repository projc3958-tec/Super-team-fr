// Browser notifications for upcoming interviews. Fires at T-30 and T-5
// minutes before each scheduled interview. Survives page navigation by
// keeping fired-marker state in sessionStorage and re-scheduling on every
// page load.

import { apiGet, isAuthenticated } from "./api";

const FIRED_KEY = "_iv_notifs_fired";       // Set of "<id>:<offsetMin>" markers
const ENABLED_KEY = "_iv_notifs_enabled";   // user toggle ("1" or absent)
const POLL_MS = 5 * 60 * 1000;              // re-fetch upcoming list every 5 min
const OFFSETS_MIN = [30, 5];                // when (minutes before) to fire

let pollHandle = null;
const timers = new Map(); // key -> timeoutId

function fired() {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(FIRED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function markFired(key) {
  const s = fired(); s.add(key);
  try { sessionStorage.setItem(FIRED_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationsPermission() {
  return notificationsSupported() ? Notification.permission : "denied";
}

export function notificationsEnabled() {
  if (typeof window === "undefined") return false;
  if (!notificationsSupported()) return false;
  if (Notification.permission !== "granted") return false;
  try { return localStorage.getItem(ENABLED_KEY) === "1"; } catch { return false; }
}

export async function enableNotifications() {
  if (!notificationsSupported()) {
    throw new Error("This browser doesn't support notifications.");
  }
  let perm = Notification.permission;
  if (perm === "default") {
    perm = await Notification.requestPermission();
  }
  if (perm !== "granted") {
    throw new Error("Notification permission was not granted.");
  }
  try { localStorage.setItem(ENABLED_KEY, "1"); } catch { /* ignore */ }
  // Show a quick test pop so the user knows it's working.
  try { new Notification("Super Job Studio", { body: "Notifications enabled. You'll get reminders 30 and 5 minutes before each interview." }); } catch { /* ignore */ }
  start();
  return true;
}

export function disableNotifications() {
  try { localStorage.removeItem(ENABLED_KEY); } catch { /* ignore */ }
  stop();
}

function clearTimers() {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

function fmtTimeLabel(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function eventLabel(iv) {
  if (iv.title) return iv.title;
  const type = iv.type || "Interview";
  const co = iv.companyName ? ` @ ${iv.companyName}` : "";
  return `${type[0].toUpperCase()}${type.slice(1)}${co}`;
}

function fire(iv, offsetMin) {
  const key = `${iv.id}:${offsetMin}`;
  if (fired().has(key)) return;
  markFired(key);

  const at = new Date(iv.scheduledAt);
  const body = `Starts at ${fmtTimeLabel(at)}${iv.location ? ` · ${iv.location.slice(0, 80)}` : ""}`;
  const title = `In ${offsetMin} min: ${eventLabel(iv)}`;

  // Always emit an in-app event so the toast UI can show even if the OS
  // notification can't (no permission, page foregrounded, etc.).
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("interview:reminder", {
        detail: { interview: iv, offsetMin, title, body },
      }));
    } catch { /* ignore */ }
  }

  // Native browser notification — only when permission is granted.
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag: `iv-${iv.id}-${offsetMin}`,  // collapses duplicates if browser supports it
      requireInteraction: offsetMin <= 5,
    });
  } catch (err) {
    console.warn("[notifications] fire failed:", err.message);
  }
}

function scheduleFor(iv) {
  const at = new Date(iv.scheduledAt).getTime();
  for (const off of OFFSETS_MIN) {
    const fireAt = at - off * 60 * 1000;
    const delay = fireAt - Date.now();
    const key = `${iv.id}:${off}`;
    if (timers.has(key)) continue;
    if (delay <= 0) {
      // Already past — fire if event itself is still in the future and we
      // haven't fired this offset yet. If event already started, skip.
      if (at - Date.now() > 0 && !fired().has(key)) fire(iv, off);
      continue;
    }
    // setTimeout caps at ~24.8 days (2^31 ms) — safe for our 24h window.
    const t = setTimeout(() => { fire(iv, off); timers.delete(key); }, delay);
    timers.set(key, t);
  }
}

async function refresh() {
  if (!isAuthenticated()) return;
  if (!notificationsEnabled()) return;
  try {
    const from = new Date();
    const to = new Date(Date.now() + 26 * 60 * 60 * 1000); // 26h ahead so 24h+ events still scheduled
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString(), status: "scheduled" });
    const res = await apiGet(`/api/interviews?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    clearTimers();
    for (const iv of data.items || []) {
      // Only schedule events still in the future and not cancelled.
      if (iv.status !== "scheduled" && iv.status !== "rescheduled") continue;
      const at = new Date(iv.scheduledAt).getTime();
      if (at - Date.now() > 26 * 60 * 60 * 1000) continue;  // out of window
      if (at - Date.now() <= 0) continue;                   // already started
      scheduleFor(iv);
    }
  } catch (err) {
    console.warn("[notifications] refresh failed:", err.message);
  }
}

export function start() {
  if (typeof window === "undefined") return;
  stop();
  refresh();
  pollHandle = setInterval(refresh, POLL_MS);
}

export function stop() {
  if (pollHandle) { clearInterval(pollHandle); pollHandle = null; }
  clearTimers();
}

// Auto-start when imported on the client if the user already opted in.
if (typeof window !== "undefined" && notificationsEnabled()) {
  // Defer slightly so the rest of the app boots first.
  setTimeout(() => start(), 1500);
}
