const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const steamworks = require('steamworks.js')

// Must be called before app is ready so the command-line switches are set in time
steamworks.electronEnableSteamOverlay()

// Initialize Steam. Fails gracefully if Steam isn't running.
let steam = null
try {
  steam = steamworks.init(3810590)
  console.log(`Steam initialized — logged in as: ${steam.localplayer.getName()}`)
} catch (e) {
  console.warn('Steam not available:', e.message)
}

// Fixed port for the local file server.
// Must NOT be 4949 — that would set Flags.local=true and point the game at
// the local WebSocket server instead of the production server.
const PORT = 8082

const MIME_TYPES = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.ogg':  'audio/ogg',
  '.mp3':  'audio/mpeg',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
}

function getClientPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'client')
    : path.join(__dirname, '..', 'client')
}

function startServer(clientPath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0]
      const filePath = path.join(clientPath, urlPath === '/' ? 'index.html' : urlPath)

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' })
        res.end(data)
      })
    })

    server.listen(PORT, '127.0.0.1', () => resolve(server))
    server.on('error', reject)
  })
}

function createWindow() {
  const iconPath = path.join(__dirname, 'icon.png')

  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 576,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Celestial',
    icon: iconPath,
  })

  // Set dock icon on macOS (BrowserWindow icon alone isn't enough)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath)
  }

  win.loadURL(`http://localhost:${PORT}/index.html`)

  // Open external links in the system browser instead of a new Electron window
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  await startServer(getClientPath())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
