// Token-aware fetch helper. Stores JWT + user in localStorage and adds the
// Authorization header to every request. On 401, clears credentials and
// (when in the browser) sends the user to /login.

export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TOKEN_KEY = "_auth_token";
const USER_KEY = "_auth_user";

export function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

export function getUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setAuth(token, user) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user)  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("auth:changed"));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Wipe per-session preferences so the next sign-in starts fresh.
  try {
    localStorage.removeItem("_gen_prefs");
    localStorage.removeItem("_iv_notifs_enabled");
    sessionStorage.removeItem("_iv_notifs_fired");
  } catch { /* ignore */ }
  window.dispatchEvent(new Event("auth:changed"));
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function hasPermission(perm) {
  const u = getUser();
  if (!u) return false;
  if (u.role === "admin") return true;
  return Array.isArray(u.permissions) && u.permissions.includes(perm);
}

export function isAdmin() {
  const u = getUser();
  return Boolean(u && u.role === "admin");
}

function buildHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

// Core fetch wrapper. `path` is the path after API base (e.g. "/api/profiles"
// or a full URL). On 401 it clears credentials and triggers a redirect.
export async function apiFetch(path, opts = {}) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  const init = { ...opts };
  init.headers = buildHeaders(opts.headers);
  const res = await fetch(url, init);
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return res;
}

// JSON-bodied helpers — POST/PUT auto-stringify and set Content-Type.
async function jsonReq(path, method, body) {
  return apiFetch(path, {
    method,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
export const apiGet    = (path)        => apiFetch(path, { headers: { Accept: "application/json" } });
export const apiPost   = (path, body)  => jsonReq(path, "POST",   body);
export const apiPut    = (path, body)  => jsonReq(path, "PUT",    body);
export const apiDelete = (path)        => apiFetch(path, { method: "DELETE", headers: { Accept: "application/json" } });

export async function login(email, password) {
  const res = await apiPost("/api/auth/login", { email, password });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(text || `Login failed (HTTP ${res.status})`); }
  if (!res.ok) throw new Error(data?.error || `Login failed (HTTP ${res.status})`);
  setAuth(data.token, data.user);
  return data.user;
}

export function logout() {
  clearAuth();
  if (typeof window !== "undefined") window.location.href = "/login";
}
