const { spawnSync } = require('child_process')
const path = require('path')

const clientVersion = require(path.join(__dirname, '../client/package.json')).version
const passthrough = process.argv.slice(2)

const result = spawnSync(
  'npx',
  ['electron-builder', `-c.extraMetadata.version=${clientVersion}`, ...passthrough],
  { stdio: 'inherit', cwd: __dirname, shell: true }
)

process.exit(result.status === null ? 1 : result.status)
