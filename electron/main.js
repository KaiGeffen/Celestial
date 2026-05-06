const { app, BrowserWindow, shell, ipcMain } = require('electron')
const path = require('path')
const http = require('http')
const fs = require('fs')
const steamworks = require('steamworks.js')
const { steamAppId } = require('../shared/steam.json')

// Must be called before app is ready so the command-line switches are set in time
steamworks.electronEnableSteamOverlay()

// Initialized in app.whenReady — Steamworks ticket APIs often fail with "channel closed"
// if called before the Steam client API is fully connected ([API loaded no]).
let steam = null

function initSteam() {
  try {
    steam = steamworks.init(steamAppId)
    console.log(`Steam initialized — logged in as: ${steam.localplayer.getName()}`)
  } catch (e) {
    console.warn('Steam not available:', e.message)
    steam = null
  }
}

// Port 4949 sets Flags.local=true, pointing the game at the local WebSocket server.
// Port 8082 is used for production builds served via Electron.
const PORT = process.env.LOCAL_DEV ? 4949 : 8082

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function getClientPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'client')
    : path.join(__dirname, '..', 'client')
}

function startServer(clientPath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0])
      const filePath = path.join(
        clientPath,
        urlPath === '/' ? 'index.html' : urlPath,
      )

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        res.writeHead(200, {
          'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        })
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
    fullscreen: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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

ipcMain.on('quit', () => app.quit())

/**
 * ISteamUserAuth/AuthenticateUserTicket expects an auth session ticket (GetAuthSessionTicket),
 * not getAuthTicketForWebApi. Steamworks often returns GenericFailure / channel closed until the
 * client API is ready — retry with backoff (see steamworks.js #165).
 */
async function createSteamSessionTicketHex() {
  const player = steam.localplayer.getSteamId()
  const steamId64 = player.steamId64
  const steamId = String(steamId64)

  let delayMs = 300
  const maxAttempts = 12

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ticketHandle = await steam.auth.getSessionTicketWithSteamId(
        steamId64,
        120,
      )
      const ticketHex = ticketHandle.getBytes().toString('hex')
      if (ticketHex?.length) {
        if (attempt > 1) {
          console.log(`Steam session ticket obtained after ${attempt} attempts`)
        }
        return { steamId, ticket: ticketHex }
      }
      console.warn(
        `Steam session ticket attempt ${attempt}/${maxAttempts}: empty ticket`,
      )
    } catch (e) {
      console.warn(
        `Steam session ticket attempt ${attempt}/${maxAttempts}:`,
        e.message,
      )
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs))
      delayMs = Math.min(delayMs * 2, 8000)
    }
  }
  return null
}

ipcMain.handle('steam:getAuthSession', async () => {
  try {
    if (!steam?.localplayer || !steam.auth) return null
    return await createSteamSessionTicketHex()
  } catch (e) {
    console.error('Failed to create Steam auth ticket:', e)
    return null
  }
})

app.whenReady().then(async () => {
  initSteam()

  await startServer(getClientPath())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
