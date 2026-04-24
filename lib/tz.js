// Shared timezone helpers. Used by the calendar week view AND the interview
// schedule modal so date+time round-trips correctly across IANA zones,
// including DST transitions.

export const TIMEZONES = [
  { value: "Asia/Shanghai",       label: "Local", short: "CN" },
  { value: "America/Los_Angeles", label: "Pacific (PT)",    short: "PT" },
  { value: "America/Denver",      label: "Mountain (MT)",   short: "MT" },
  { value: "America/Chicago",     label: "Central (CT)",    short: "CT" },
  { value: "America/New_York",    label: "Eastern (ET)",    short: "ET" },
];

export const TZ_KEY = "_calendar_tz";

const _fmtCache = new Map();
function partsFmt(tz) {
  if (!_fmtCache.has(tz)) {
    _fmtCache.set(tz, new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }));
  }
  return _fmtCache.get(tz);
}

// Returns { year, month, day, hour, minute, second } as numbers as observed
// in the given IANA timezone for the given Date instant.
export function partsInTz(date, tz) {
  const fmt = partsFmt(tz);
  const parts = fmt.formatToParts(date);
  const get = (t) => parseInt(parts.find((p) => p.type === t)?.value, 10);
  return {
    year:   get("year"),
    month:  get("month"),
    day:    get("day"),
    hour:   get("hour") % 24, // some locales return "24" for midnight
    minute: get("minute"),
    second: get("second") || 0,
  };
}

export function ymdInTz(date, tz) {
  const p = partsInTz(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

// Build a Date for the given wall-clock time (year/month/day/hour/minute) as
// observed in `tz`. Handles DST correctly.
//
// Strategy: build a Date as if the wall time were UTC, then ask Intl what
// wall time that UTC instant *actually* shows in tz. The diff is the timezone
// offset at that instant; subtract it to land on the right UTC moment.
export function wallTimeToUTC(year, month, day, hour, minute, tz) {
  const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const observed = partsInTz(naiveUtc, tz);
  const observedAsUtc = Date.UTC(
    observed.year, observed.month - 1, observed.day,
    observed.hour, observed.minute, observed.second
  );
  const offsetMs = observedAsUtc - naiveUtc.getTime();
  return new Date(naiveUtc.getTime() - offsetMs);
}

// Convert a UTC Date to a "YYYY-MM-DDTHH:MM" string suitable for an
// <input type="datetime-local"> showing the wall time in the given tz.
export function utcToInputInTz(date, tz) {
  const p = partsInTz(date, tz);
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

// Reverse: take a "YYYY-MM-DDTHH:MM" string from the input and the user's
// chosen tz; produce an ISO UTC string for the API.
export function inputInTzToISO(localStr, tz) {
  if (!localStr) return null;
  const m = String(localStr).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const utc = wallTimeToUTC(+y, +mo, +d, +h, +mi, tz);
  return isNaN(utc.getTime()) ? null : utc.toISOString();
}

// Get the user's preferred timezone (saved by the calendar page); fall back
// to the first entry (Local).
export function getPreferredTimezone() {
  if (typeof window === "undefined") return TIMEZONES[0].value;
  try {
    const saved = window.localStorage.getItem(TZ_KEY);
    if (saved && TIMEZONES.find((t) => t.value === saved)) return saved;
  } catch { /* ignore */ }
  return TIMEZONES[0].value;
}
