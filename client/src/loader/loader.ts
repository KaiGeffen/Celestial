import avatarNames from '../lib/avatarNames'
import Catalog from '../../../shared/state/catalog'
import { Space, Flags } from '../settings/settings'
import { assetLists } from './assetLists'

const EXTENSION = 'webp'

// Special spritesheets that need specific dimensions
interface SpritesheetConfig {
  directory: string
  sheet: {
    width: number
    height: number
  }
}

const SPRITESHEETS: SpritesheetConfig[] = [
  {
    directory: 'avatar',
    sheet: {
      width: Space.avatarSize,
      height: Space.avatarSize,
    },
  },
  {
    directory: 'spritesheet',
    sheet: {
      width: 80,
      height: 80,
    },
  },
  {
    directory: 'spritesheet',
    sheet: {
      width: 80,
      height: 160,
    },
  },
]

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

  static loadAll(scene: Phaser.Scene) {
    // Load all audio
    Loader.loadAudio(scene)

    // Load the videos
    Loader.loadVideos(scene)

    // Load the round results
    Loader.loadResults(scene)

    // Load all assets from each directory
    Object.entries(assetLists).forEach(([directory, files]) => {
      if (directory !== 'sfx' && directory !== 'dialog') {
        Loader.loadAssets(scene, directory, files)
      }
    })

    // Load spritesheets
    SPRITESHEETS.forEach((config) => {
      const files = assetLists[config.directory] || []
      Loader.loadSpritesheets(scene, config.directory, files, config.sheet)
    })

    scene.load.start()

    // After loading is complete, do anything that relies on the loaded resources
    scene.load.on('complete', () => {
      // Generate the animations for match results
      Loader.loadAnimations(scene)
    })
  }

  private static loadAssets(
    scene: Phaser.Scene,
    directory: string,
    files: readonly string[],
  ): void {
    files.forEach((name) => {
      const key = `${directory}-${name}`
      // Add img/ prefix for image directories
      const filepath =
        directory === 'sfx' || directory === 'dialog'
          ? `${directory}/${name}.mp3`
          : `img/${directory}/${name}.${EXTENSION}`
      scene.load.image(key, filepath)
    })
  }

  private static loadSpritesheets(
    scene: Phaser.Scene,
    directory: string,
    files: readonly string[],
    sheet: { width: number; height: number },
  ): void {
    files.forEach((name) => {
      const key = `${directory}-${name}`
      const filepath = `img/${directory}/${name}.${EXTENSION}`

      scene.load.spritesheet(key, filepath, {
        frameWidth: sheet.width,
        frameHeight: sheet.height,
      })
    })
  }

  private static loadAnimations(scene: Phaser.Scene): void {
    ;['Win', 'Lose', 'Tie'].forEach((s) => {
      const name = `icons-Round${s}`

      scene.anims.create({
        key: name,
        frameRate: 2,
        frames: scene.anims.generateFrameNumbers(name, { start: 0, end: 3 }),
      })
    })
  }

  // Loads all audio
  private static loadAudio(scene: Phaser.Scene): void {
    const audioAssets = assetLists['sfx'] || []
    const dialogAssets = assetLists['dialog'] || []

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

  // Load the round result animations
  private static loadResults(scene: Phaser.Scene): void {
    ;['Win', 'Lose', 'Tie'].forEach((s) => {
      const name = `icons-Round${s}`

      scene.load.spritesheet(name, `img/icons/Round${s}.${EXTENSION}`, {
        frameWidth: 563,
        frameHeight: 258,
      })
    })
  }
}
