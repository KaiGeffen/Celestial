import avatarNames from '../lib/avatarNames'
import Catalog from '../../../shared/state/catalog'

// Json data
import avatarData from './avatars.json'
import iconData from './icons.json'
import chromeData from './chrome.json'
import backgroundData from './backgrounds.json'
import keywordData from './keywords.json'
import storyData from './stories.json'
import sfxData from './sfx.json'
import dialogData from './dialog.json'
import { Space, Flags } from '../settings/settings'

const EXTENSION = 'webp'

// Entry in the prefix map below
interface PrefixEntry {
  fp: string
  prefix: string
  list: string[]
  // Spritesheet specification
  sheet?: {
    width: number
    height: number
  }
}

const imagePrefixMap: PrefixEntry[] = [
  {
    fp: `avatars//${Flags.mobile ? 'mobile/' : ''}`,
    prefix: 'avatar-',
    list: avatarData,
  },
  {
    fp: `cards/${Flags.mobile ? 'mobile/' : ''}`,
    prefix: '',
    list: [
      ...Catalog.allCards.filter((card) => !card.beta),
      Catalog.cardback,
    ].map((card) => card.name),
  },
  {
    fp: 'cutouts/',
    prefix: 'cutout-',
    list: Catalog.collectibleCards.map((card) => card.name),
  },
  {
    fp: 'icons/',
    prefix: 'icon-',
    list: iconData,
  },
  {
    fp: 'chrome/',
    prefix: 'chrome-',
    list: chromeData,
  },
  {
    fp: 'keywords/',
    prefix: 'kw-',
    list: keywordData,
  },
  {
    fp: 'backgrounds/',
    prefix: 'bg-',
    list: backgroundData,
  },
  {
    fp: 'story/',
    prefix: 'story-',
    list: storyData,
  },
]

// NOTE Button preloaded to use in scene
const spritesheetPrefixMap: PrefixEntry[] = [
  {
    fp: `avatars/${Flags.mobile ? 'mobile/' : ''}`,
    prefix: 'avatar-',
    list: avatarNames,
    sheet: {
      width: Space.avatarSize,
      height: Space.avatarSize,
    },
  },
  {
    fp: 'spritesheet/',
    prefix: 'icon-',
    list: ['Mission'],
    sheet: {
      width: 80,
      height: 80,
    },
  },
]

const prefixMap: PrefixEntry[] = [...imagePrefixMap, ...spritesheetPrefixMap]

export default class Loader {
  // Load any assets that are needed within the preload scene
  static preload(scene: Phaser.Scene) {
    // Set the load path
    scene.load.path = 'assets/'

    // Load button as a spritesheet
    Loader.loadButton(scene)
  }

  static loadAll(scene: Phaser.Scene) {
    // Load all audio
    Loader.loadAudio(scene)

    // Load the videos
    Loader.loadVideos(scene)

    // Load the round results
    Loader.loadResults(scene)

    // Load the rest of the assets
    Loader.bulkLoad(scene)

    scene.load.start()

    // After loading is complete, do anything that relies on the loaded resources
    scene.load.on('complete', () => {
      // Generate the animations for a match results
      Loader.loadAnimations(scene)
    })
  }

  private static loadAnimations(scene: Phaser.Scene): void {
    ;['Win', 'Lose', 'Tie'].forEach((s) => {
      const name = `icon-Round${s}`

      scene.anims.create({
        key: name,
        frameRate: 2,
        frames: scene.anims.generateFrameNumbers(name, { start: 0, end: 3 }),
      })
    })
  }

  // Load all of the assets that load in a normal way
  private static bulkLoad(
    scene: Phaser.Scene,
    map: PrefixEntry[] = prefixMap,
  ): void {
    // For each type of asset
    map.forEach((assetType: PrefixEntry) => {
      // For each asset of that type
      assetType.list.forEach((name) => {
        let key = `${assetType.prefix}${name}`
        let filepath = `${assetType.fp}${name}.${EXTENSION}`

        if (assetType.sheet === undefined) {
          scene.load.image(key, filepath)
        } else {
          scene.load.spritesheet(key, filepath, {
            frameWidth: assetType.sheet.width,
            frameHeight: assetType.sheet.height,
          })
        }
      })
    })
  }

  // Loads the basic button as a spritesheet
  private static loadButton(scene: Phaser.Scene): void {
    scene.load.spritesheet(`icon-Button`, `spritesheet/Button.${EXTENSION}`, {
      frameWidth: Space.buttonWidth,
      frameHeight: Space.buttonHeight,
    })
  }

  // Loads all audio
  private static loadAudio(scene: Phaser.Scene): void {
    // Load all sfx
    sfxData.forEach((sound) => {
      scene.load.audio(sound, `sfx/${sound}.mp3`)
    })

    // Load each characters dialog clip
    dialogData.forEach((name) => {
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
      const name = `icon-Round${s}`

      scene.load.spritesheet(name, `icons/Round${s}.${EXTENSION}`, {
        frameWidth: 563,
        frameHeight: 258,
      })
    })
  }
}
