import 'phaser'
import BaseScene from './baseScene'
import avatarDetails from '../catalog/avatarDetails.json'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer.js'
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel.js'
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
  private portraitImage: Phaser.GameObjects.Image
  private infoSizer: Sizer
  private scrollPanel: ScrollablePanel
  private expBarBg: Phaser.GameObjects.Rectangle
  private expBar: Phaser.GameObjects.Rectangle
  private expText: Phaser.GameObjects.Text
  private nameText: Phaser.GameObjects.Text
  private descText: Phaser.GameObjects.Text

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

    this.createPortrait()
    this.createHeader()
    this.createContents()
    this.createProgress()
  }

  createPortrait() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const char = CHARACTERS[this.selectedCharacterIndex]
    const portraitKey = `avatar-${char.name}Full`
    this.portraitImage = this.add.image(0, 0, portraitKey)
    this.plugins.get('rexAnchor')['add'](this.portraitImage, {
      left: 'left',
      top: 'top',
      height: '100%',
    })
    // Maintain aspect ratio for fullsize avatar
    this.portraitImage.once('texturecomplete', () => {
      const naturalWidth = this.portraitImage.width
      const naturalHeight = this.portraitImage.height
      const scale = this.cameras.main.height / naturalHeight
      this.portraitImage.setDisplaySize(
        naturalWidth * scale,
        this.cameras.main.height,
      )
    })
    if (this.portraitImage.texture.key !== '__MISSING') {
      // If already loaded
      const naturalWidth = this.portraitImage.width
      const naturalHeight = this.portraitImage.height
      const scale = this.cameras.main.height / naturalHeight
      this.portraitImage.setDisplaySize(
        naturalWidth * scale,
        this.cameras.main.height,
      )
    }
    // Add character name at the bottom of the fullsize image
    const charName = `${char.name} — ${char.surname}`
    this.nameText = this.add.text(0, 0, charName, {
      ...Style.announcement,
      wordWrap: { width: width * 0.5 - 48 },
      align: 'center',
    })
    this.plugins.get('rexAnchor')['add'](this.nameText, {
      left: 'left',
      bottom: 'bottom-32',
      width: '50%',
    })
  }

  createHeader() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    // 1. Header: Horizontal scrollable panel for avatar selection
    this.scrollPanel = this.rexUI.add.scrollablePanel({
      x: 0,
      y: 0,
      width: width * 0.5 - 48,
      height: 100,
      scrollMode: 0, // horizontal
      panel: {
        child: this.createAvatarRow(),
        mask: { padding: 1 },
      },
      slider: false,
      mouseWheelScroller: false,
      space: { left: 0, right: 0, top: 0, bottom: 0, panel: 0 },
    })
  }

  createContents() {
    const width = this.cameras.main.width
    const height = this.cameras.main.height
    const char = CHARACTERS[this.selectedCharacterIndex]
    // 2. Info: Only description
    this.descText = this.add.text(0, 0, char.description, {
      ...Style.basic,
      wordWrap: { width: width * 0.5 - 48 },
      align: 'center',
    })
    const infoSection = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 12 },
    })
    infoSection.add(this.descText, { align: 'center' })
    // Create the right info sizer and add header and info
    this.infoSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      x: width * 0.75,
      y: height / 2,
      width: width * 0.5,
      height: height,
      space: { item: 24, top: 48, left: 24, right: 24, bottom: 48 },
    })
    this.infoSizer.add(this.scrollPanel, { align: 'center' })
    this.infoSizer.add(infoSection, {
      proportion: 1,
      align: 'center',
      expand: true,
    })
    this.infoSizer.layout()
  }

  createProgress() {
    const width = this.cameras.main.width
    const char = CHARACTERS[this.selectedCharacterIndex]
    const barWidth = width * 0.5 - 96
    const barHeight = 24
    const exp = char.exp ?? 0
    const expToNext = char.expToNext ?? 100
    const expPercent = Math.min(exp / expToNext, 1)
    this.expBarBg = this.add
      .rectangle(0, 0, barWidth, barHeight, 0x222222, 0.7)
      .setOrigin(0.5, 0.5)
    this.expBar = this.add
      .rectangle(
        -barWidth / 2 + (barWidth * expPercent) / 2,
        0,
        barWidth * expPercent,
        barHeight,
        0x00cfff,
        1,
      )
      .setOrigin(0.5, 0.5)
    this.expText = this.add
      .text(0, 0, `${exp} / ${expToNext} EXP`, {
        ...Style.basic,
        fontSize: '18px',
      })
      .setOrigin(0.5, 0.5)
    const expSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 4 },
    })
    const expBarSizer = this.rexUI.add.sizer({ orientation: 'horizontal' })
    expBarSizer.add(this.expBarBg, { align: 'center' })
    expBarSizer.add(this.expBar, { align: 'center' })
    expSizer.add(expBarSizer, { align: 'center' })
    expSizer.add(this.expText, { align: 'center' })
    // Add to infoSizer at the bottom
    this.infoSizer.add(expSizer, { align: 'center' })
    this.infoSizer.layout()
  }

  createAvatarRow() {
    const rowSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 16 },
    })
    CHARACTERS.forEach((char, idx) => {
      // Use AvatarButton in a ContainerLite, as in alterDeck.ts
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.avatarSize,
        Space.avatarSize,
      )
      new AvatarButton({
        within: container,
        name: char.name,
        x: Space.avatarSize / 2,
        y: Space.avatarSize / 2,
        emotive: false,
        muteClick: true,
        origin: [0.5, 0.5],
        f: () => {
          this.selectedCharacterIndex = idx
          this.scene.restart() // Recreate the scene to update everything
        },
      })
      rowSizer.add(container)
      // Add spacing except after the last button
      if (idx < CHARACTERS.length - 1) {
        rowSizer.addSpace(Space.pad)
      }
    })
    return rowSizer
  }
}
