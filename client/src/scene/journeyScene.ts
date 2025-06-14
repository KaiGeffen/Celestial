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
import premadeDecklists from '../data/premadeDecklists'
import avatarNames from '../lib/avatarNames'
import Catalog from '../../../shared/state/catalog'
import Cutout from '../lib/buttons/cutout'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import JOURNEY_CHARACTERS from '../data/journeyCharacters'
import Decklist from '../lib/decklist'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'

export default class JourneyScene extends BaseScene {
  panDirection

  map: Phaser.GameObjects.Image

  isDragging = false

  characterContainers: Phaser.GameObjects.Container[] = []
  storyPanel: Phaser.GameObjects.Container | null = null

  // NEW FLOW
  decklist: Decklist
  characterSelect: Phaser.GameObjects.Container
  missionDetails: Sizer

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
    // this.createHelpButton()

    // Add scroll functionality
    this.enableScrolling()

    // Create the first screen
    this.createCharacterSelect()

    // Create the mission screen
    this.createMissionDetails()
  }

  private createCharacterSelect() {
    this.characterSelect = this.add.container()

    // Somehow randomly get the characters that will appear
    // TODO
    const characters = [JOURNEY_CHARACTERS[0], JOURNEY_CHARACTERS[1]]

    // For each character, add the avatar, text, button
    const sizers = characters.map((char) => {
      // Form a sizer for this character
      const sizer = this.rexUI.add.sizer({
        orientation: 'vertical',
        space: { item: Space.pad },
      })

      const image = this.add.image(0, 0, char.image)
      const text = this.add.text(0, 0, char.selectText, Style.basic)
      const btnContainer = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      const button = new Buttons.Basic({
        within: btnContainer,
        text: 'Select',
        f: () => {
          this.decklist.setDeck(
            // TODO Do better
            premadeDecklists[char.deckIndex].map((id) =>
              Catalog.getCardById(id),
            ),
          )
          this.characterSelect.setAlpha(0)
          this.missionDetails.show().layout()
        },
      })

      sizer.add(image).add(text).add(btnContainer)

      return sizer.layout()
    })

    // Anchor the sizers to each side of the screen
    this.plugins.get('rexAnchor')['add'](sizers[0], {
      y: `50%`,
      left: `0%+${Space.pad}`,
    })
    this.plugins.get('rexAnchor')['add'](sizers[1], {
      y: `50%`,
      right: `100%-${Space.pad}`,
    })

    this.characterSelect.add(sizers[0]).add(sizers[1])
  }

  private createMissionDetails() {
    // Get the mission details TODO
    const mission = JOURNEY_CHARACTERS[0]

    // Create a sizer for the mission details
    this.missionDetails = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    const background = this.add.rectangle(0, 0, 1, 1, Color.backgroundLight)

    const headerSizer = this.createHeader(mission)
    const decklistSizer = this.createDecklist()
    const btnSizer = this.createButtons()

    this.missionDetails
      .add(headerSizer)
      .add(decklistSizer)
      .add(btnSizer)
      .addBackground(background)
      .layout()

    // Add an anchor for the sizer
    this.plugins.get('rexAnchor')['add'](this.missionDetails, {
      left: `0%+${Space.pad}`,
      y: `50%`,
    })

    this.missionDetails.hide()
  }

  private createHeader(mission) {
    const headerSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: Space.pad },
    })

    const container = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    const avatar = new Buttons.Avatar({
      within: container,
      avatarId: mission.index,
    })
    const txt = this.add.text(0, 0, mission.storyQuote, Style.basic)
    headerSizer.add(container).add(txt)

    return headerSizer
  }

  private createDecklist() {
    this.decklist = new Decklist(this, this.onClickCutout())

    this.decklist.setDeck(
      premadeDecklists[0].map((id) => Catalog.getCardById(id)),
    )

    return this.decklist.sizer
  }

  private createButtons() {
    const btnSizer = this.rexUI.add.sizer({
      space: { item: Space.pad },
    })

    // TODO Buttons should have option to return a containerLite
    const cont1 = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: cont1,
      text: 'Back',
      f: () => {
        this.characterSelect.setAlpha(1)
        this.missionDetails.hide()
      },
    })
    const cont2 = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: cont2,
      text: 'Customize',
    })
    const cont3 = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: cont3,
      text: 'Start',
    })
    btnSizer.add(cont1).add(cont2).add(cont3)

    return btnSizer
  }

  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        this.decklist.removeCard(cutout.card)
        this.missionDetails.layout()
      }
    }
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
    JOURNEY_CHARACTERS.forEach((char, i) => {
      const x =
        i === 0
          ? Space.windowWidth / 4 - spacing
          : (3 * Space.windowWidth) / 4 + spacing
      // Container for image, text, and button
      const container = this.add.container(x, centerY)
      container.setScrollFactor(0)
      // Character image (preserve aspect ratio)
      const img = this.add.image(0, 0, char.image).setOrigin(0.5)
      // Optionally scale down if too large for viewport
      const maxW = imgWidth,
        maxH = imgHeight
      const scale = Math.min(maxW / img.width, maxH / img.height, 1)
      img.setScale(scale)
      // Select button
      const btn = new Buttons.Basic({
        within: container,
        text: 'Select',
        y: img.displayHeight / 2 + 40,
        f: () => this.showCharacterStoryPanel(char.index),
      })
      // Select text
      const txt = this.add
        .text(
          0,
          img.displayHeight / 2 + 90,
          `"${char.selectText}"`,
          Style.basic,
        )
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
    const char = JOURNEY_CHARACTERS.find((c) => c.index === characterIndex)
    if (!char) return
    // Main container
    const panel = this.add.container(
      Space.windowWidth / 2,
      Space.windowHeight / 2,
    )
    panel.setScrollFactor(0)
    // Main sizer
    const sizer = this.rexUI.add.fixWidthSizer({
      width: Space.windowWidth * 0.8,
      align: 'center',
      space: { item: 30 },
    })
    // Add background rectangle
    const bgRect = this.add
      .rectangle(
        0,
        0,
        Space.windowWidth * 0.8,
        Space.windowHeight * 0.85,
        Color.backgroundLight,
      )
      .setOrigin(0.5)
    sizer.addBackground(bgRect)

    // Top: avatar, title, quote (side by side, vertical stack)
    const headerSizer = this.rexUI.add.sizer({
      orientation: 'horizontal',
      space: { item: 30 },
    })
    // Avatar icon
    const avatarContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    new Buttons.Avatar({
      within: avatarContainer,
      avatarId: char.index,
    })

    // Title and quote
    const titleText = this.add.text(0, 0, char.storyTitle, Style.announcement)
    const quoteText = this.add.text(0, 0, `"${char.storyQuote}"`, Style.basic)
    const titleSizer = this.rexUI.add.sizer({ orientation: 'vertical' })
    titleSizer.add(titleText).add(quoteText)
    headerSizer.add(avatarContainer).add(titleSizer)

    // Stack headerSizer, deckSizer, and btnSizer vertically
    const verticalStack = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: 20 },
    })
    verticalStack.add(headerSizer)

    // Deck display (cutouts)
    const deckSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
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
    verticalStack.add(deckSizer)

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
      f: () => {
        // Launch a journey match with the selected deck and avatar
        const deck = {
          name: `${avatarNames[char.index]} Premade`,
          cards: deckIds,
          cosmeticSet: { avatar: char.index, border: 0 },
        }
        // Set AI deck to the other character's premade deck
        const otherChar = JOURNEY_CHARACTERS.find((c) => c.index !== char.index)
        const aiDeck = otherChar
          ? {
              name: `${avatarNames[otherChar.index]} Premade`,
              cards: premadeDecklists[otherChar.deckIndex],
              cosmeticSet: { avatar: otherChar.index, border: 0 },
            }
          : undefined
        this.scene.start('JourneyMatchScene', { deck, aiDeck })
      },
    })
    btnSizer
      .add(btnBackContainer)
      .add(btnCustomizeContainer)
      .add(btnStartContainer)
    verticalStack.add(btnSizer)
    sizer.add(verticalStack)
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
