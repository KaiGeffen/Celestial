import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

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
  'img/journey',
  'img/border',
  'img/relic',
  'img/pet',
  'img/roundResult',
  'img/chrome',
  'sfx',
  'dialog',
]

// Function to convert PNG to WebP using Sharp
async function convertPngToWebp(pngPath: string): Promise<string> {
  const webpPath = pngPath.replace('.png', '.webp')

  try {
    // Use Sharp to convert PNG to WebP
    await sharp(pngPath)
      .webp({ quality: 80 }) // Adjust quality as needed (0-100)
      .toFile(webpPath)

    console.log(`Converted ${pngPath} to ${webpPath}`)

    // Delete the original PNG file after successful conversion
    fs.unlinkSync(pngPath)

    return webpPath
  } catch (error) {
    console.error(`Failed to convert ${pngPath} to WebP:`, error)
    return pngPath // Return original path if conversion fails
  }
}

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

async function getAssetFiles(dir: string): Promise<{
  files: string[]
  dimensions?: { [filename: string]: { width: number; height: number } }
}> {
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

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dims = parseDimensions(entry.name)
      if (dims) {
        // Add files from dimension directory
        const subFiles = fs
          .readdirSync(path.join(fullPath, entry.name))
          .filter((file) => file.endsWith('.webp') || file.endsWith('.png'))

        for (const file of subFiles) {
          let processedFile = file
          // Convert PNG to WebP if needed
          if (file.endsWith('.png')) {
            const pngPath = path.join(fullPath, entry.name, file)
            await convertPngToWebp(pngPath)
            processedFile = file.replace('.png', '.webp')
          }

          const baseName = processedFile.replace('.webp', '')
          result.files.push(baseName)
          result.dimensions[baseName] = dims
        }
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.webp') || entry.name.endsWith('.png'))
    ) {
      // Regular image file
      if (entry.name.endsWith('.png')) {
        // Convert PNG to WebP
        const pngPath = path.join(fullPath, entry.name)
        await convertPngToWebp(pngPath)
        result.files.push(entry.name.replace('.png', ''))
      } else {
        result.files.push(entry.name.replace('.webp', ''))
      }
    }
  }

  if (Object.keys(result.dimensions).length === 0) {
    delete result.dimensions
  }

  return result
}

async function generateAssetLists(): Promise<void> {
  const assetLists: AssetList = {}

  // Generate lists for each directory
  for (const dir of DIRECTORIES) {
    // Use the last part of the path as the key (e.g., 'img/avatar' -> 'avatar')
    const dirKey = dir.split('/').pop()!
    assetLists[dirKey] = await getAssetFiles(dir)
  }

  // Generate the output file
  const output = `// This file is auto-generated. Do not edit manually.
export const assetLists = ${JSON.stringify(assetLists, null, 2)} as const;`

  // Write to the output file
  const outputPath = path.join(__dirname, 'assetLists.ts')
  fs.writeFileSync(outputPath, output)
  console.log(`Asset lists generated at ${outputPath}`)
}

// Run the generator
generateAssetLists().catch((error) => {
  console.error('Error generating asset lists:', error)
  process.exit(1)
})
