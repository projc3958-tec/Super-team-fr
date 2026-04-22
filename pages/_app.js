import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function App({ Component, pageProps }) {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (router.pathname === '/license') {
      setChecking(false);
      return;
    }

    // Skip check when running in browser (not Electron)
    if (typeof window === 'undefined' || !window.electronAPI) {
      setChecking(false);
      return;
    }

    checkLicense().then((valid) => {
      if (!valid) {
        router.replace('/license');
      } else {
        setChecking(false);
      }
    });
  }, [checkLicense]);

  async function checkLicense() {
    const [key, deviceId] = await Promise.all([
      window.electronAPI.getLicense(),
      window.electronAPI.getDeviceId(),
    ]);

    if (!key) return false;

    try {
      const res = await fetch(`${API}/api/license/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, deviceId }),
      });
      return res.ok;
    } catch {
      // Offline: allow if key file exists
      return true;
    }
  }

  if (checking) {
    return (
      <div style={{
        background: '#0a0f1c',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
      }}>
        <p style={{ color: '#22d3ee', fontSize: '16px' }}>Checking license...</p>
      </div>
    );
  }

  return <Component {...pageProps} />;
}
