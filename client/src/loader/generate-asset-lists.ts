import * as fs from 'fs'
import * as path from 'path'

const ASSETS_ROOT = path.join(__dirname, '../../../client/assets')

interface AssetList {
  [directory: string]: {
    files: string[]
    dimensions?: { [filename: string]: { width: number; height: number } }
  }
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
  'img/roundResult',
  'sfx',
  'dialog',
]

function parseDimensions(
  dirName: string,
): { width: number; height: number } | undefined {
  const match = dirName.match(/^(\d+)x(\d+)$/)
  if (match) {
    return {
      width: parseInt(match[1]),
      height: parseInt(match[2]),
    }
  }
  return undefined
}

function getAssetFiles(dir: string): {
  files: string[]
  dimensions?: { [filename: string]: { width: number; height: number } }
} {
  const fullPath = path.join(ASSETS_ROOT, dir)
  if (!fs.existsSync(fullPath)) {
    console.warn(`Directory not found: ${fullPath}`)
    return { files: [] }
  }

  // Handle audio files differently
  if (dir === 'sfx' || dir === 'dialog') {
    const files = fs
      .readdirSync(fullPath)
      .filter((file) => file.endsWith('.mp3'))
      .map((file) => file.replace('.mp3', ''))
    return { files }
  }

  const result = {
    files: [] as string[],
    dimensions: {} as { [filename: string]: { width: number; height: number } },
  }

  const entries = fs.readdirSync(fullPath, { withFileTypes: true })

  entries.forEach((entry) => {
    if (entry.isDirectory()) {
      const dims = parseDimensions(entry.name)
      if (dims) {
        // Add files from dimension directory
        const subFiles = fs
          .readdirSync(path.join(fullPath, entry.name))
          .filter((file) => file.endsWith('.webp'))
          .map((file) => file.replace('.webp', ''))

        // Store dimensions for these files
        subFiles.forEach((file) => {
          result.files.push(file)
          result.dimensions[file] = dims
        })
      }
    } else if (entry.isFile() && entry.name.endsWith('.webp')) {
      // Regular image file
      result.files.push(entry.name.replace('.webp', ''))
    }
  })

  if (Object.keys(result.dimensions).length === 0) {
    delete result.dimensions
  }

  return result
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
