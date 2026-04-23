import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { isAuthenticated } from "../lib/api";

const PUBLIC_PATHS = new Set(["/login"]);

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <div style={{
        background: "#0c0a1e",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, sans-serif",
      }}>
        <p style={{ color: "#a78bfa", fontSize: "14px" }}>Loading…</p>
      </div>
    );
  }

  return <Component {...pageProps} />;
}
