import avatarNames from '../data/avatarNames'
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
  pixelArt?: boolean
}

export default class Loader {
  // Load any assets that are needed within the preload scene
  static preload(scene: Phaser.Scene) {
    // Set the load path
    scene.load.path = 'assets/'

    // Load buttons spritesheets, normal one is used in this scene
    scene.load.spritesheet(`icon-Button`, `img/Button.${EXTENSION}`, {
      frameWidth: Space.buttonWidth,
      frameHeight: Space.buttonHeight,
    })
    scene.load.spritesheet(`icon-BigButton`, `img/BigButton.${EXTENSION}`, {
      frameWidth: Space.buttonWidth,
      frameHeight: Space.bigButtonHeight,
    })

    scene.load.image(`icon-InputText`, `img/icon/InputText.${EXTENSION}`)
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

      // Set texture filtering based on pixelArt flag
      Object.entries(
        assetLists as unknown as Record<string, AssetInfo>,
      ).forEach(([directory, info]) => {
        if (directory === 'sfx' || directory === 'dialog') {
          return // Skip audio
        }
        info.files.forEach((file: string) => {
          const key = `${directory}-${file}`
          const texture = scene.textures.get(key)
          if (texture && info.pixelArt) {
            texture.setFilter(Phaser.Textures.NEAREST)
          }
        })
      })
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

  // Loads all SFX, dialog handled in HTMLAudioElement
  private static loadAudio(scene: Phaser.Scene): void {
    const audioInfo = assetLists['sfx'] as unknown as AssetInfo
    const audioAssets = audioInfo?.files || []

    // Load SFX
    audioAssets.forEach((name) => {
      scene.load.audio(name, `sfx/${name}.opus`)
    })
  }

  // Loads all video textures
  private static loadVideos(scene: Phaser.Scene): void {
    // scene.load.video('priorityHighlight', 'priority.mp4')
  }

  // Load tutorial cutscenes
  static loadTutorialCutscenes(scene: Phaser.Scene): void {
    scene.load.path = 'assets/'
    scene.load.image('tutorial-1', 'img/tutorial/1.webp')
    scene.load.image('tutorial-2', 'img/tutorial/2.webp')
    scene.load.image('tutorial-3', 'img/tutorial/3.webp')
    scene.load.image('tutorial-4', 'img/tutorial/4.webp')
  }

  // Load journey map and mission images
  static loadJourneyMapAndMission(scene: Phaser.Scene): void {
    scene.load.path = 'assets/'
    scene.load.image('journey-Map', 'img/journey/Map.webp')
    scene.load.image('journey-Mission', 'img/journey/Mission.webp')
    scene.load.image('journey-AltMap', 'img/journey/AltMap.webp')

    scene.load.start()
  }
}
