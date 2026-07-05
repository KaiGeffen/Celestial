/**
 * Production static server. Replaces live-server, which is a dev tool: it
 * injects a live-reload script into every page, sends no cache headers
 * (max-age=0, so every visit revalidates all ~470 assets), and exposes
 * src/ and node_modules/.
 *
 * Caching model:
 * - dist/  — webpack content-hashes the bundle filenames, safe to cache forever
 * - assets/ — the loader requests these with a ?v=<build> query, safe to cache
 *   forever; a new build changes the query and busts them
 * - html and everything else — revalidate on every load (that's how players
 *   discover new bundle filenames after a deploy)
 */
const express = require('express')
const path = require('path')

const PORT = 8083
const IMMUTABLE = 'public, max-age=31536000, immutable'
const REVALIDATE = 'public, max-age=0'

const app = express()

// Don't serve source or dependencies
app.use(['/src', '/node_modules'], (req, res) => res.status(404).end())

app.use(
  express.static(__dirname, {
    setHeaders: (res, filePath) => {
      const rel = path.relative(__dirname, filePath)
      const immutable =
        rel.startsWith(`dist${path.sep}`) || rel.startsWith(`assets${path.sep}`)
      res.setHeader('Cache-Control', immutable ? IMMUTABLE : REVALIDATE)
    },
  }),
)

app
  .listen(PORT, () => {
    console.log(`Client production server running on port ${PORT}`)
  })
  .on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.error(
        `Port ${PORT} is already in use (another client server running?)`,
      )
      process.exit(1)
    }
    throw e
  })
