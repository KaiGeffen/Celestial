import 'phaser'
import BaseScene from './baseScene'
import avatarDetails from '../data/avatarDetails.json'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer.js'
import { Style, Space } from '../settings/settings'
import AvatarButton from '../lib/buttons/avatar'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

// Character data from avatarDetails.json
interface CharacterInfo {
  name: string
  surname: string
  description: string
  chart: number[]
  exp?: number
  level?: number
  expToNext?: number
}

const CHARACTERS: CharacterInfo[] = avatarDetails.map((char) => ({
  ...char,
  exp: 100, // Placeholder, replace with real data
  level: 1, // Placeholder, replace with real data
  expToNext: 200, // Placeholder, replace with real data
}))

export default class CharacterProfileScene extends BaseScene {
  private selectedCharacterIndex = 0
  private mainSizer: Sizer
  private portraitContainer: Phaser.GameObjects.Container
  private portraitImage: Phaser.GameObjects.Image
  private nameText: Phaser.GameObjects.Text
  private rightSizer: Sizer
  private headerSizer: Sizer
  private avatarButtons: AvatarButton[] = []
  private descText: Phaser.GameObjects.Text
  private expBarBg: Phaser.GameObjects.Rectangle
  private expBar: Phaser.GameObjects.Rectangle
  private expText: Phaser.GameObjects.Text
  private progressSizer: Sizer

  constructor() {
    super({ key: 'CharacterProfileScene' })
  }

  create(): void {
    super.create()
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    // Add background image (same as builderScene.ts)
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    this.plugins.get('rexAnchor')['add'](background, {
      width: '100%',
      height: '100%',
    })

    this.createMainSizer()
    // this.createPortrait()
    this.createRightPanel()
    this.mainSizer.layout()
  }

  createMainSizer() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    // Main horizontal sizer
    this.mainSizer = this.rexUI.add.sizer()
    this.plugins.get('rexAnchor')['add'](this.mainSizer, {
      left: 'left',
      top: 'top',
      width: '100%',
      height: '100%',
    })

    // Left: Portrait container
    this.mainSizer.add(this.createPortrait())
    // this.portraitContainer = this.add.container(0, 0)
    // this.mainSizer.add(this.portraitContainer, {
    //   proportion: 1,
    //   align: 'center',
    //   expand: true,
    // })

    // Right: Vertical sizer for header, description, progress
    this.rightSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 24, top: 48, left: 24, right: 24, bottom: 48 },
    })
    this.mainSizer.add(this.rightSizer, {
      proportion: 1,
      align: 'center',
      expand: true,
    })
    this.mainSizer.layout()
  }

  createPortrait() {
    const fixRatio = () => {
      const height = this.cameras.main.height
      console.log('fixRatio', height)
      this.portraitImage.setDisplaySize((height * 2) / 3, height)
      this.mainSizer.layout()
    }

    // Portrait image
    const char = CHARACTERS[this.selectedCharacterIndex]
    this.portraitImage = this.add.image(0, 0, `avatar-${char.name}Full`)

    this.plugins.get('rexAnchor')['add'](this.portraitImage, {
      //   left: 'left',
      //   bottom: 'bottom',
      onUpdateViewportCallback: fixRatio,
    })

    fixRatio()

    return this.portraitImage
  }

  createRightPanel() {
    // Header
    this.createHeader()
    // Description/content
    const width = this.cameras.main.width
    this.descText = this.add.text(0, 0, '', {
      ...Style.basic,
      wordWrap: { width: width * 0.5 - 48 },
      align: 'center',
    })
    // Footer (progress)
    this.createProgress()
    // Add to rightSizer: header, content, footer
    this.rightSizer.add(this.headerSizer, { align: 'center' })
    this.rightSizer.add(this.descText, {
      proportion: 1,
      align: 'center',
      expand: true,
    })
    this.rightSizer.add(this.progressSizer, { align: 'center' })
    this.rightSizer.layout()
  }

  createHeader() {
    this.headerSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
    })
    this.avatarButtons = []
    CHARACTERS.forEach((char, idx) => {
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      const avatarBtn = new AvatarButton({
        within: container,
        name: char.name,
        emotive: false,
        muteClick: true,
        f: () => {
          if (this.selectedCharacterIndex !== idx) {
            this.selectedCharacterIndex = idx
            this.updateCharacterDisplay()
          }
        },
      })
      this.avatarButtons.push(avatarBtn)
      this.headerSizer.add(container)
    })
  }

  createProgress() {
    const width = this.cameras.main.width
    const barWidth = width * 0.5 - 96
    const barHeight = 24
    this.expBarBg = this.add
      .rectangle(0, 0, barWidth, barHeight, 0x222222, 0.7)
      .setOrigin(0.5, 0.5)
    this.expBar = this.add
      .rectangle(-barWidth / 2, 0, 0, barHeight, 0x00cfff, 1)
      .setOrigin(0.5, 0.5)
    this.expText = this.add
      .text(0, 0, '', {
        ...Style.basic,
        fontSize: '18px',
      })
      .setOrigin(0.5, 0.5)
    this.progressSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 4 },
    })
    const expBarSizer = this.rexUI.add.sizer({ orientation: 'horizontal' })
    expBarSizer.add(this.expBarBg, { align: 'center' })
    expBarSizer.add(this.expBar, { align: 'center' })
    this.progressSizer.add(expBarSizer, { align: 'center' })
    this.progressSizer.add(this.expText, { align: 'center' })
  }

  updateCharacterDisplay() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const char = CHARACTERS[this.selectedCharacterIndex]
    // Update portrait
    this.portraitImage.setTexture(`avatar-${char.name}Full`)

    // Update name
    this.nameText.setText(`${char.name} — ${char.surname}`)
    // Update description
    this.descText.setText(char.description)
    // Update progress bar
    const exp = char.exp ?? 0
    const expToNext = char.expToNext ?? 100
    const expPercent = Math.min(exp / expToNext, 1)
    const barWidth = width * 0.5 - 96
    this.expBar.width = barWidth * expPercent
    this.expText.setText(`${exp} / ${expToNext} EXP`)
    // Update avatar button selection highlight (if you want to add a visual cue)
    this.avatarButtons.forEach((btn, idx) => {
      if (idx === this.selectedCharacterIndex) {
        btn.select && btn.select()
      } else {
        btn.deselect && btn.deselect()
      }
    })
  }
}
