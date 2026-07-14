// Copies the game's card assets and exports card/keyword data into the card
// maker, so its cards always match the game's. Runs at Docker image build
// (see Dockerfile) and locally after game assets or card data change:
//
//   npx -y tsx sites/cardmaker/generateAssets.ts
//
// Everything it writes under assets/ is generated — gitignored, never edited.

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { Keywords } from '../../shared/state/keyword'
import Catalog from '../../shared/state/catalog'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')
const gameCardAssets = path.join(repoRoot, 'client/assets/img/card')
const outDir = path.join(here, 'assets')

// --- Frame layers (background / arc / container, one per theme) ---
for (const kind of ['background', 'arc', 'container']) {
  const dest = path.join(outDir, 'card', kind)
  fs.rmSync(dest, { recursive: true, force: true })
  fs.cpSync(path.join(gameCardAssets, kind), dest, { recursive: true })
}

// --- Subject arts ---
const subjectsDest = path.join(outDir, 'subjects')
fs.rmSync(subjectsDest, { recursive: true, force: true })
fs.cpSync(path.join(gameCardAssets, 'subject'), subjectsDest, {
  recursive: true,
})

// --- Card / keyword data ---
const keywords = Keywords.getAll().map((k) => ({
  name: k.name,
  text: k.text,
  hasX: !!k.hasX,
}))
const cards = Catalog.collectibleCards.map((c) => ({
  name: c.name,
  cost: c.cost,
  points: c.points,
  text: c.text,
  theme: c.theme ?? 0,
}))
const subjects = fs
  .readdirSync(subjectsDest)
  .filter((f) => f.endsWith('.webp'))
  .map((f) => f.replace('.webp', ''))
  .sort()

fs.writeFileSync(
  path.join(outDir, 'gameData.json'),
  JSON.stringify({ keywords, cards, subjects }, null, 2),
)

console.log(
  `cardmaker assets generated: ${keywords.length} keywords, ${cards.length} cards, ${subjects.length} subjects`,
)
