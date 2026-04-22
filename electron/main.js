const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const PORT = 3000;
const isDev = !app.isPackaged;
let mainWindow = null;
let nextServer = null;

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

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0f1c',
    autoHideMenuBar: true,
    title: 'Super',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(
    'data:text/html,<html style="background:%230a0f1c;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="color:%2322d3ee;font-family:sans-serif;font-size:20px">Starting Resume Tailor...</p></html>'
  );

  try {
    await startNextServer();
    await waitForServer();
    mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (err) {
    mainWindow.loadURL(
      `data:text/html,<html style="background:%230a0f1c;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p style="color:%23ff4444;font-family:sans-serif;font-size:18px">Error: ${err.message}</p></html>`
    );
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
