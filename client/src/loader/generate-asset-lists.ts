import * as fs from 'fs'
import * as path from 'path'

const ASSETS_ROOT = path.join(__dirname, '../../../client/assets')

interface AssetList {
  [directory: string]: string[]
}

// Directories to scan
const DIRECTORIES = [
  'img/avatar',
  'img/card',
  'img/cutout',
  'img/icon',
  'img/store',
  'img/background',
  'img/story',
  'img/border',
  'img/relic',
  'sfx',
  'dialog',
]

function getAssetFiles(dir: string): string[] {
  const fullPath = path.join(ASSETS_ROOT, dir)
  if (!fs.existsSync(fullPath)) {
    console.warn(`Directory not found: ${fullPath}`)
    return []
  }

  const files = fs.readdirSync(fullPath)

  // Handle audio files differently
  if (dir === 'sfx' || dir === 'dialog') {
    return files
      .filter((file) => file.endsWith('.mp3'))
      .map((file) => file.replace('.mp3', ''))
  }

  return files
    .filter((file) => file.endsWith('.webp'))
    .map((file) => file.replace('.webp', ''))
}

function generateAssetLists(): void {
  const assetLists: AssetList = {}

  // Generate lists for each directory
  DIRECTORIES.forEach((dir) => {
    // Use the last part of the path as the key (e.g., 'img/avatar' -> 'avatar')
    const dirKey = dir.split('/').pop()!
    assetLists[dirKey] = getAssetFiles(dir)
  })

  // Generate the output file
  const output = `// This file is auto-generated. Do not edit manually.
export const assetLists = ${JSON.stringify(assetLists, null, 2)} as const;`

  // Write to the output file
  const outputPath = path.join(__dirname, 'assetLists.ts')
  fs.writeFileSync(outputPath, output)
  console.log(`Asset lists generated at ${outputPath}`)
}

generateAssetLists()
