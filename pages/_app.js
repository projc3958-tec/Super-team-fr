import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { isAuthenticated } from "../lib/api";
import { applyTheme, getTheme } from "../lib/theme";

const PUBLIC_PATHS = new Set(["/login"]);

// Inline script run before React hydration so the user never sees a flash of
// the wrong theme. Reads localStorage and writes data-theme on <html> early.
const NO_FLASH = `(function(){try{var t=localStorage.getItem('_theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => { applyTheme(getTheme()); }, []);

  useEffect(() => {
    const path = router.pathname;
    const authed = isAuthenticated();

    if (!authed && !PUBLIC_PATHS.has(path)) {
      router.replace("/login");
      return;
    }
    if (authed && path === "/login") {
      router.replace("/");
      return;
    }
    setReady(true);

    const onAuthChange = () => {
      const stillAuthed = isAuthenticated();
      const here = router.pathname;
      if (!stillAuthed && !PUBLIC_PATHS.has(here)) router.replace("/login");
    };
    window.addEventListener("auth:changed", onAuthChange);
    window.addEventListener("storage", onAuthChange);
    return () => {
      window.removeEventListener("auth:changed", onAuthChange);
      window.removeEventListener("storage", onAuthChange);
    };
  }, [router.pathname, router]);

  return (
    <>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </Head>
      <style jsx global>{`
        :root, [data-theme="dark"] {
          --bg:           #0c0a1e;
          --bg-deep:      #08061a;
          --surface:      rgba(139,92,246,0.04);
          --surface-2:    rgba(139,92,246,0.07);
          --surface-3:    rgba(139,92,246,0.10);
          --border:       rgba(139,92,246,0.15);
          --border-soft:  rgba(139,92,246,0.08);
          --text:         #f1f5f9;
          --text-2:       #cbd5e1;
          --text-muted:   #6b7280;
          --text-faint:   #4b5563;
          --label:        #7c6fcd;
          --accent:       #a78bfa;
          --accent-2:     #c4b5fd;
          --accent-soft:  rgba(139,92,246,0.18);
          --danger:       #f87171;
          --success:      #6ee7b7;
          --field-bg:     rgba(12,10,30,0.7);
          --topbar-bg:    rgba(8,6,26,0.6);
          --scroll-thumb: rgba(139,92,246,0.35);
        }
        [data-theme="light"] {
          --bg:           #f5f3fb;
          --bg-deep:      #ffffff;
          --surface:      rgba(124,58,237,0.04);
          --surface-2:    rgba(124,58,237,0.07);
          --surface-3:    rgba(124,58,237,0.10);
          --border:       rgba(124,58,237,0.18);
          --border-soft:  rgba(124,58,237,0.10);
          --text:         #1f2937;
          --text-2:       #374151;
          --text-muted:   #6b7280;
          --text-faint:   #9ca3af;
          --label:        #6d28d9;
          --accent:       #7c3aed;
          --accent-2:     #6d28d9;
          --accent-soft:  rgba(124,58,237,0.12);
          --danger:       #dc2626;
          --success:      #059669;
          --field-bg:     #ffffff;
          --topbar-bg:    rgba(255,255,255,0.85);
          --scroll-thumb: rgba(124,58,237,0.40);
        }
        body {
          background: var(--bg) !important;
          color: var(--text) !important;
        }
        ::-webkit-scrollbar-thumb {
          background: var(--scroll-thumb) !important;
        }
        select option {
          background: var(--bg-deep);
          color: var(--text);
        }
      `}</style>
      {ready ? (
        <Component {...pageProps} />
      ) : (
        <div style={{
          background: "var(--bg)",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, sans-serif",
          color: "var(--accent)",
        }}>Loading…</div>
      )}
    </>
  );
}
