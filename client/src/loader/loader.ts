import avatarNames from '../lib/avatarNames'
import Catalog from '../../../shared/state/catalog'
import { Space, Flags } from '../settings/settings'
import { assetLists } from './assetLists'

const EXTENSION = 'webp'

interface AssetInfo {
  files: string[]
  dimensions?: {
    [filename: string]: {
      width: number
      height: number
    }
  }
}

export default class Loader {
  // Load any assets that are needed within the preload scene
  static preload(scene: Phaser.Scene) {
    // Set the load path
    scene.load.path = 'assets/'

    // Load button as a spritesheet, used in this scene
    scene.load.spritesheet(`icon-Button`, `img/Button.${EXTENSION}`, {
      frameWidth: Space.buttonWidth,
      frameHeight: Space.buttonHeight,
    })
  }

  // Load all assets
  static loadAll(scene: Phaser.Scene) {
    // Load all audio
    Loader.loadAudio(scene)

    // Load the videos
    Loader.loadVideos(scene)

    // Load all assets from each directory
    Object.entries(assetLists as unknown as Record<string, AssetInfo>).forEach(
      ([directory, info]) => {
        if (directory === 'sfx' || directory === 'dialog') {
          return // Audio handled separately
        }

        info.files.forEach((file: string) => {
          const key = `${directory}-${file}`
          const dims = info.dimensions?.[file]

          if (dims) {
            // If file has dimensions, it's in a dimension directory
            const filepath = `img/${directory}/${dims.width}x${dims.height}/${file}.${EXTENSION}`
            scene.load.spritesheet(key, filepath, {
              frameWidth: dims.width,
              frameHeight: dims.height,
            })

            // Set up animations for round sprites
            if (directory === 'roundResult') {
              scene.load.once('complete', () => {
                console.log('setting up animations for', key)
                scene.anims.create({
                  key: key,
                  frameRate: 2,
                  frames: scene.anims.generateFrameNumbers(key, {
                    start: 0,
                    end: 3,
                  }),
                })
              })
            }
          } else {
            // Regular image file
            const filepath = `img/${directory}/${file}.${EXTENSION}`
            scene.load.image(key, filepath)
          }
        })
      },
    )

    scene.load.start()

    // After loading is complete, do anything that relies on the loaded resources
    scene.load.on('complete', () => {
      // Generate the animations for match results
      Loader.loadAnimations(scene)
    })
  }

  private static loadAnimations(scene: Phaser.Scene): void {
    ;['Win', 'Lose', 'Tie'].forEach((s) => {
      const name = `roundResult-${s}`

      scene.anims.create({
        key: name,
        frameRate: 2,
        frames: scene.anims.generateFrameNumbers(name, { start: 0, end: 3 }),
      })
    })
  }

  // Loads all audio
  private static loadAudio(scene: Phaser.Scene): void {
    const audioInfo = assetLists['sfx'] as unknown as AssetInfo
    const dialogInfo = assetLists['dialog'] as unknown as AssetInfo
    const audioAssets = audioInfo?.files || []
    const dialogAssets = dialogInfo?.files || []

    // Load SFX
    audioAssets.forEach((name) => {
      scene.load.audio(name, `sfx/${name}.mp3`)
    })

    // Load dialog
    dialogAssets.forEach((name) => {
      scene.load.audio(`dialog-${name}`, `dialog/${name}.mp3`)
    })
  }

  // Loads all video textures
  private static loadVideos(scene: Phaser.Scene): void {
    // scene.load.video('priorityHighlight', 'priority.mp4')
  }
}
