// Stable per-user accent color and initials. Used to visually distinguish
// interviews owned by different accounts on the shared calendar.

const PALETTE = [
  "#a78bfa", // violet
  "#22d3ee", // cyan
  "#fb923c", // orange
  "#10b981", // emerald
  "#db2777", // pink
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // rose
  "#14b8a6", // teal
  "#8b5cf6", // purple
  "#ef4444", // red
  "#84cc16", // lime
];

// FNV-1a 32-bit hash — fast, deterministic, no deps. Good enough for picking
// a slot in a 12-color palette.
function hashStr(s) {
  let h = 0x811c9dc5;
  const str = String(s || "");
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function colorForUser(idOrEmail) {
  if (!idOrEmail) return PALETTE[0];
  return PALETTE[hashStr(idOrEmail) % PALETTE.length];
}

export function initialsFor(nameOrEmail) {
  if (!nameOrEmail) return "?";
  const s = String(nameOrEmail).trim();
  if (!s) return "?";
  // If it looks like an email, prefer the local-part.
  const local = s.includes("@") ? s.split("@")[0] : s;
  // Split on whitespace, dot, dash, underscore.
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return s[0].toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
