import 'phaser'
import BaseScene from './baseScene'
import {
  Style,
  Space,
  Color,
  UserSettings,
  Time,
  Ease,
} from '../settings/settings'
import Buttons from '../lib/buttons/buttons'
import Button from '../lib/buttons/button'
import premadeDecklists from '../catalog/premadeDecklists'
import avatarNames from '../lib/avatarNames'
import Catalog from '../../../shared/state/catalog'
import Cutout from '../lib/buttons/cutout'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

const CHARACTER_DATA = [
  {
    index: 0, // Jules
    image: 'avatar-JulesFull',
    selectText: 'Help me find my truth!',
    storyTitle: 'JULES STORY',
    storyQuote: "Don't hold back. The only thing you owe anyone is your truth.",
    deckIndex: 0,
  },
  {
    index: 2, // Mia
    image: 'avatar-MiaFull',
    selectText: 'I have to escape!',
    storyTitle: 'MIA STORY',
    storyQuote: 'You can only run for so long before the shadows catch up.',
    deckIndex: 2,
  },
]

export default class JourneyScene extends BaseScene {
  panDirection

  map: Phaser.GameObjects.Image

  isDragging = false

  characterContainers: Phaser.GameObjects.Container[] = []
  storyPanel: Phaser.GameObjects.Container | null = null

  constructor() {
    super({
      key: 'JourneyScene',
    })
  }

  create(params): void {
    super.create()

    // Create the background
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0).setInteractive()
    this.enableDrag()

    // Bound camera on this map
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Add button for help menu
    this.createHelpButton()

    // Add scroll functionality
    this.enableScrolling()

    // Show character selection
    this.showCharacterChoices()
  }

  showCharacterChoices() {
    // Remove any previous containers
    this.characterContainers.forEach((c) => c.destroy())
    this.characterContainers = []
    if (this.storyPanel) {
      this.storyPanel.destroy()
      this.storyPanel = null
    }
    // Layout: two big images side by side, each with a select button and text
    const centerY = Space.windowHeight / 2
    const imgWidth = Space.windowWidth / 2.2
    const imgHeight = Space.windowHeight * 0.8
    const spacing = Space.windowWidth / 20
    CHARACTER_DATA.forEach((char, i) => {
      const x =
        i === 0
          ? Space.windowWidth / 4 - spacing
          : (3 * Space.windowWidth) / 4 + spacing
      // Container for image, text, and button
      const container = this.add.container(x, centerY)
      // Character image
      const img = this.add
        .image(0, 0, char.image)
        .setDisplaySize(imgWidth, imgHeight)
        .setOrigin(0.5)
      // Select button
      const btn = new Buttons.Basic({
        within: container,
        text: 'Select',
        y: imgHeight / 2 + 40,
        f: () => this.showCharacterStoryPanel(char.index),
      })
      // Select text
      const txt = this.add
        .text(0, imgHeight / 2 + 90, `"${char.selectText}"`, Style.basic)
        .setOrigin(0.5, 0)
      container.add([img, txt])
      this.characterContainers.push(container)
    })
  }

  showCharacterStoryPanel(characterIndex: number) {
    // Remove both character containers
    this.characterContainers.forEach((c) => c.destroy())
    this.characterContainers = []
    if (this.storyPanel) {
      this.storyPanel.destroy()
    }
    // Get character data
    const char = CHARACTER_DATA.find((c) => c.index === characterIndex)
    if (!char) return
    // Main container
    const panel = this.add.container(
      Space.windowWidth / 2,
      Space.windowHeight / 2,
    )
    // Main sizer
    const sizer = this.rexUI.add.fixWidthSizer({
      width: Space.windowWidth * 0.8,
      align: 'center',
      space: { item: 30 },
    })
    // Top: avatar, title, quote (side by side)
    const headerSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 30 },
    })
    // Avatar icon
    const avatarContainer = new ContainerLite(this, 0, 0, 100, 100)
    new Buttons.Avatar({
      within: avatarContainer,
      avatarId: char.index,
      border: 0,
      emotive: false,
    })
    // Title and quote
    const titleText = this.add.text(0, 0, char.storyTitle, Style.announcement)
    const quoteText = this.add.text(0, 0, `"${char.storyQuote}"`, Style.basic)
    const titleSizer = this.rexUI.add.sizer({ orientation: 'vertical' })
    titleSizer.add(titleText).add(quoteText)
    headerSizer.add(avatarContainer).add(titleSizer)
    sizer.add(headerSizer)
    // Deck display (cutouts)
    const deckSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 8 },
    })
    const deckIds = premadeDecklists[char.deckIndex]
    // Count cards by id
    const cardCounts: { [id: number]: number } = {}
    deckIds.forEach((id) => (cardCounts[id] = (cardCounts[id] || 0) + 1))
    // Sort by cost, then name
    const sortedIds = Object.keys(cardCounts)
      .map(Number)
      .sort((a, b) => {
        const ca = Catalog.getCardById(a)
        const cb = Catalog.getCardById(b)
        if (!ca || !cb) return 0
        if (ca.cost !== cb.cost) return ca.cost - cb.cost
        return ca.name.localeCompare(cb.name)
      })
    sortedIds.forEach((id) => {
      const card = Catalog.getCardById(id)
      if (!card) return
      const container = new ContainerLite(
        this,
        0,
        0,
        Space.deckPanelWidth,
        Space.cutoutHeight,
      )
      const cutout = new Cutout(container, card)
      cutout.count = cardCounts[id]
      cutout.setText(`x${cardCounts[id]}`)
      deckSizer.add(container)
    })
    sizer.add(deckSizer)
    // Bottom: 3 buttons in a sizer
    const btnSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 40 },
    })
    // Wrap each button in a container for sizer compatibility
    const btnBackContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: btnBackContainer,
      text: 'Back',
      f: () => this.showCharacterChoices(),
    })
    const btnCustomizeContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: btnCustomizeContainer,
      text: 'Customize',
      f: () => {},
    })
    const btnStartContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: btnStartContainer,
      text: 'Start',
      f: () => {},
    })
    btnSizer
      .add(btnBackContainer)
      .add(btnCustomizeContainer)
      .add(btnStartContainer)
    sizer.add(btnSizer)
    sizer.layout()
    panel.add(sizer)
    this.storyPanel = panel
  }

  update(time, delta): void {
    // If pointer is released, stop panning
    if (!this.input.activePointer.isDown) {
      this.panDirection = undefined
    }

    if (this.panDirection !== undefined) {
      JourneyScene.moveCamera(
        this.cameras.main,
        this.panDirection[0],
        this.panDirection[1],
      )
    }

    // Dragging
    if (this.isDragging && this.panDirection === undefined) {
      const camera = this.cameras.main
      const pointer = this.input.activePointer

      const dx = ((pointer.x - pointer.downX) * delta) / 100
      const dy = ((pointer.y - pointer.downY) * delta) / 100

      JourneyScene.moveCamera(camera, dx, dy)
    }
  }

  private createHelpButton(): void {
    const container = this.add.container().setDepth(10)
    new Buttons.Basic({
      within: container,
      text: 'Help',
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'help',
          callback: () => {
            this.scene.start('TutorialMatchScene', { missionID: 0 })
          },
        })
      },
      muteClick: true,
    }).setNoScroll()

    // Anchor in top right
    const dx = Space.buttonWidth / 2 + Space.iconSize + Space.pad * 2
    const dy = Space.buttonHeight / 2 + Space.pad
    this.plugins.get('rexAnchor')['add'](container, {
      x: `100%-${dx}`,
      y: `0%+${dy}`,
    })
  }

  private enableScrolling(): void {
    let camera = this.cameras.main

    this.input.on(
      'gameobjectwheel',
      (pointer, gameObject, dx, dy, dz, event) => {
        JourneyScene.moveCamera(camera, dx, dy)
      },
    )
  }

  private enableDrag(): void {
    // Arrow pointing from the start of the drag to current position
    const arrow = this.scene.scene.add
      .image(0, 0, 'icon-Arrow')
      .setAlpha(0)
      .setScrollFactor(0)

    // Map can be dragged
    this.input
      .setDraggable(this.map)
      .on('dragstart', (event) => {
        this.isDragging = true
      })
      .on('drag', (event) => {
        const angle = Phaser.Math.Angle.Between(
          event.downX,
          event.downY,
          event.x,
          event.y,
        )
        arrow
          .setPosition(event.downX, event.downY)
          .setRotation(angle + Phaser.Math.DegToRad(90))
          .setAlpha(1)
      })
      .on('dragend', () => {
        this.isDragging = false
        arrow.setAlpha(0)
      })
  }

  private static moveCamera(camera, dx, dy): void {
    camera.scrollX = Math.max(0, camera.scrollX + dx)
    camera.scrollY = Math.max(0, camera.scrollY + dy)
  }
}
