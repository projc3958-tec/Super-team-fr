const { app, BrowserWindow, shell, ipcMain, nativeTheme } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const PORT = 4002;
const isDev = !app.isPackaged;
let mainWindow = null;
let nextServer = null;

// Set the user-facing app name early — affects task switcher, dock title, etc.
app.setName('Super Job Studio');

// Force a dark window chrome by default; the renderer overrides this when the
// user toggles the in-app theme (see ipcMain handler 'set-theme' below).
nativeTheme.themeSource = 'dark';

// --- Device ID ---
function getDeviceId() {
  const raw = [os.hostname(), os.platform(), os.arch(), os.cpus()[0]?.model || '', os.totalmem().toString()].join(':');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// --- License file ---
function licensePath() {
  return path.join(app.getPath('userData'), 'license.key');
}
function readLicense() {
  const p = licensePath();
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf-8').trim() || null;
}
function saveLicense(key) {
  fs.writeFileSync(licensePath(), key, 'utf-8');
}
function clearLicense() {
  const p = licensePath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// --- IPC ---
ipcMain.handle('get-device-id', () => getDeviceId());
ipcMain.handle('get-license', () => readLicense());
ipcMain.handle('save-license', (_, key) => saveLicense(key));
ipcMain.handle('clear-license', () => clearLicense());

// Renderer asks main to swap window-chrome theme when the in-app theme toggles.
ipcMain.handle('set-theme', (_, theme) => {
  nativeTheme.themeSource = theme === 'light' ? 'light' : 'dark';
});

// --- Next.js server ---
function getAppDir() {
  return app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
}

async function startNextServer() {
  if (isDev) return;
  const next = require('next');
  const appDir = getAppDir();
  const nextApp = next({ dev: false, dir: appDir });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  await new Promise((resolve, reject) => {
    nextServer = http.createServer((req, res) => handle(req, res));
    nextServer.listen(PORT, '127.0.0.1', resolve);
    nextServer.on('error', reject);
  });
}

function waitForServer(retries = 40) {
  return new Promise((resolve, reject) => {
    const check = (n) => {
      const req = http.get(`http://127.0.0.1:${PORT}`, () => resolve());
      req.on('error', () => {
        if (n <= 0) return reject(new Error('Server failed to start'));
        setTimeout(() => check(n - 1), 500);
      });
      req.end();
    };
    check(retries);
  });
}

function splashHtml({ message = 'Starting Super Job Studio…', error = false } = {}) {
  const accent = error ? '#f87171' : '#a78bfa';
  const subColor = error ? '#fca5a5' : '#7c6fcd';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Super Job Studio</title><style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html,body{height:100%;overflow:hidden}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
      color:#f1f5f9;
      background:radial-gradient(ellipse at top,rgba(139,92,246,0.18),transparent 60%) #08061a;
      display:flex;align-items:center;justify-content:center;
    }
    .wrap{display:flex;flex-direction:column;align-items:center;gap:16px}
    .logo{
      width:64px;height:64px;border-radius:18px;
      background:linear-gradient(135deg,#8b5cf6 0%,#db2777 100%);
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 12px 36px rgba(139,92,246,0.45);
    }
    .logo svg{width:36px;height:36px}
    h1{font-size:20px;font-weight:700;letter-spacing:-0.3px}
    .sub{font-size:11px;font-weight:600;color:${subColor};letter-spacing:1.4px;text-transform:uppercase}
    .msg{font-size:13px;color:${accent};margin-top:6px;text-align:center;max-width:420px;line-height:1.5}
    .spin{
      width:18px;height:18px;border-radius:50%;
      border:2.5px solid transparent;border-top-color:${accent};
      animation:spin 0.85s linear infinite;
      ${error ? 'display:none;' : ''}
    }
    @keyframes spin{to{transform:rotate(360deg)}}
  </style></head><body><div class="wrap">
    <div class="logo"><svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg"><path d="M21.5 6L12 21h7l-2.5 11 10-15h-7L21.5 6z" fill="white" fill-opacity="0.95"/></svg></div>
    <h1>Super Job Studio</h1>
    <div class="sub">${error ? 'Could not start' : 'Resume Studio'}</div>
    <div class="spin"></div>
    <p class="msg">${message}</p>
  </div></body></html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#08061a',
    autoHideMenuBar: true,
    title: 'Super Job Studio',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Keep the OS window title locked to the brand even when the page sets one.
  mainWindow.on('page-title-updated', (e) => e.preventDefault());

  mainWindow.loadURL(splashHtml());

  try {
    await startNextServer();
    await waitForServer();
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    mainWindow.loadURL(splashHtml({ message: 'Error: ' + err.message, error: true }));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (nextServer) nextServer.close();
  app.quit();
});
