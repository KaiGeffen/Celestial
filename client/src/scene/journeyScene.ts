import 'phaser'
import BaseScene from './baseScene'
import { Style, Space, Color, UserSettings, Flags } from '../settings/settings'
import Buttons from '../lib/buttons/buttons'
import Catalog from '../../../shared/state/catalog'
import Cutout from '../lib/buttons/cutout'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { JOURNEY_MISSIONS, JourneyMission } from '../data/journeyMissions'
import Decklist from '../lib/decklist'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import { Deck } from '../../../shared/types/deck'
import avatarNames from '../lib/avatarNames'
import AvatarButton from '../lib/buttons/avatar'
import newScrollablePanel from '../lib/scrollablePanel'
import { MechanicsSettings } from '../../../shared/settings'
import Button from '../lib/buttons/button'
import { CatalogRegionJourney } from './builderRegions/catalog'
import {
  getCharacterLevel,
  getCharacterLevelProgress,
  getCharacterExpToNextLevel,
  MAX_LEVEL,
} from '../data/levelProgression'
import Card from '../../../shared/state/card'
import getUnlockedCards, {
  getUnlocksAtLevel,
} from '../data/journeyCardInventory'
import { createExpBar } from '../lib/expBar'
import { CardImage } from '../lib/cardImage'

export default class JourneyScene extends BaseScene {
  // Mission details
  selectedMission: JourneyMission
  selectedAvatar: number
  txtMissionTitle: Phaser.GameObjects.Text
  txtMissionDescription: Phaser.GameObjects.Text
  avatar: AvatarButton
  decklist: Decklist
  // The catalog region with all collectible cards
  catalogRegion: CatalogRegionJourney
  startBtn: Button

  // Timer until next journey available
  txtTimer: Phaser.GameObjects.Text

  // Views
  characterSelectView: Phaser.GameObjects.Container
  missionDetailsView: Sizer
  postMatchView: Phaser.GameObjects.Container
  waitingView: Sizer

  // Card pool sizer
  cardPoolSizer: Sizer

  // Card pool text reference
  cardPoolText: Phaser.GameObjects.Text

  constructor() {
    super({
      key: 'JourneyScene',
    })
  }

  create(params): void {
    super.create()

    // TODO Temporary
    // this.selectedAvatar = 0
    // params = {
    //   ...params,
    //   postMatch: true,
    //   expGained: 100,
    //   postMatchText: 'Test',
    // }

    // Launch map behind this scene
    this.scene.launch('MapScene')
    this.scene.sendToBack('MapScene')

    // Create the first screen
    this.createCharacterSelect()

    // Create the mission screen
    this.createMissionDetails()

    // Create post match screen
    this.createPostMatch(params.expGained ?? 0, params.postMatchText ?? '')

    // Create waiting notice
    this.createWaitingNotice()

    // Show view depending on context
    if (params.postMatch) {
      this.postMatchView.setAlpha(1)
    } else {
      this.characterSelectView.setAlpha(1)
    }
  }

  private createCharacterSelect() {
    this.characterSelectView = this.add.container().setAlpha(0)

    // Get the 2 characters that appear this time
    const missionTracks = this.getMissionChoices()

    // For each character, add the avatar, text, button
    const sizers = missionTracks.map(([mission, avatarIndex]) => {
      const name = avatarNames[avatarIndex]

      // Form a sizer for this character
      const sizer = this.rexUI.add.sizer({
        orientation: 'vertical',
        space: {
          item: Space.pad,
          left: Space.pad,
          right: Space.pad,
          top: Space.pad,
          bottom: Space.pad,
        },
      })

      // Background
      const background = this.add
        .image(0, 0, 'background-Light')
        .setInteractive()
      this.addShadow(background)

      // Avatar
      const avatarFull = this.add.image(0, 0, `avatar-${name}Full`)

      // Experience bar
      // const expBarBackground = this.add.rectangle(
      //   0,
      //   0,
      //   1,
      //   1,
      //   Color.backgroundLight,
      //   0.5,
      // )
      // const expBar = createExpBar(this, avatarIndex)
      // expBar.addBackground(expBarBackground)

      // Mission title
      const text = this.add.text(
        0,
        0,
        mission.selectText,
        Style.todoJourneyTitle,
      )

      // Select button
      const btnContainer = new ContainerLite(
        this,
        0,
        0,
        Space.buttonWidth,
        Space.buttonHeight,
      )
      new Buttons.Basic({
        within: btnContainer,
        text: 'Select',
        f: () => {
          // Set mission info
          this.setMissionInfo(mission, avatarIndex)

          // Set the right views visible/invisible
          this.characterSelectView.setAlpha(0)
          this.missionDetailsView.show().layout()
        },
      })

      sizer
        .addBackground(background)
        .add(avatarFull)
        // .add(expBar, { padding: { top: -80 } })
        .add(text)
        .add(btnContainer)

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

    this.characterSelectView.add(sizers[0]).add(sizers[1])
  }

  private createMissionDetails() {
    // Create a sizer for the mission details
    this.missionDetailsView = this.rexUI.add
      .sizer({
        space: {
          top: Space.pad,
          bottom: Space.pad,
          left: Space.pad,
          right: Space.pad,
        },
      })
      .setOrigin(0)

    const background = this.add.image(0, 0, 'background-Light').setInteractive()
    this.addShadow(background)

    // Left side sizer
    const leftSizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: { item: Space.pad },
    })

    this.txtMissionTitle = this.add.text(0, 0, '', Style.announcement)
    const headerSizer = this.createHeader()
    const decklistSizer = this.createDecklist()
    const btnSizer = this.createButtons()

    leftSizer
      .add(this.txtMissionTitle)
      .add(headerSizer)
      .add(decklistSizer)
      .add(btnSizer)

    // Create catalog region
    this.catalogRegion = new CatalogRegionJourney()
    const catalogPanel = this.catalogRegion.create(this as any) // Cast to BuilderBase type

    this.missionDetailsView
      .add(leftSizer, { expand: true })
      .add(catalogPanel, { expand: true })
      .addBackground(background)
      .layout()

    // Add an anchor for the sizer
    this.plugins.get('rexAnchor')['add'](this.missionDetailsView, {
      left: `0%+${Space.pad}`,
      top: `0%+${Space.pad}`,
    })

    this.missionDetailsView.hide()
  }

  private createPostMatch(expGained: number, postMatchText: string) {
    this.postMatchView = this.add.container().setAlpha(0)

    // Avatar image
    const image = this.add
      .image(0, 0, `avatar-${avatarNames[this.selectedAvatar]}Full`)
      .setInteractive()
    this.addShadow(image)

    // Contents
    const background = this.add.image(0, 0, 'background-Light').setInteractive()
    this.addShadow(background)

    const sizer = this.rexUI.add
      .sizer({
        orientation: 'vertical',
        space: {
          item: Space.pad,
          left: Space.pad,
          right: Space.pad,
        },
      })
      .setOrigin(1, 0.5)

    const title = this.add.text(0, 0, 'Story Complete!', Style.announcement)

    const txt = this.add.text(0, 0, postMatchText, Style.basic)

    // Experience gained and associated info
    const expBar = createExpBar(this, this.selectedAvatar, expGained)

    // Any unlocked cards, revealed when exp bar levels up
    let cardsSizer: Sizer = this.rexUI.add.sizer({
      space: { item: Space.pad },
    })
    expBar.on('levelup.start', () => {
      getUnlocksAtLevel(this.selectedAvatar, expBar.level).forEach((card) => {
        const cont = new ContainerLite(
          this,
          0,
          0,
          Space.cardWidth,
          Space.cardHeight,
        )
        const cardImage = new CardImage(card, cont)
        cardsSizer.add(cont)
      })
      sizer.layout()
    })

    // Buttons
    const btnContainer = new ContainerLite(
      this,
      0,
      0,
      Space.avatarSize,
      Space.avatarSize,
    )
    new Buttons.Basic({
      within: btnContainer,
      text: 'Next',
      f: () => {
        // NOTE CardImage deleted because bug with containerlite in sizers
        cardsSizer.destroy()
        this.postMatchView.setAlpha(0)
        this.waitingView.show()
      },
    })

    sizer
      .add(title)
      .add(txt)
      .add(cardsSizer)
      .add(expBar)
      .add(btnContainer)
      .addBackground(background)
      .layout()
    this.postMatchView.add(sizer)

    // Anchors
    this.plugins.get('rexAnchor')['add'](image, {
      y: `50%`,
      left: `0%+${Space.pad}`,
    })
    this.plugins.get('rexAnchor')['add'](sizer, {
      y: `50%`,
      right: `100%-${Space.pad}`,
    })

    // Add everything to the container
    this.postMatchView.add(image).add(sizer)
  }

  private createWaitingNotice() {
    this.waitingView = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    const background = this.add.image(0, 0, 'background-Light').setInteractive()
    this.addShadow(background)

    const txtNotice = this.add.text(
      0,
      0,
      'Daily journey complete',
      Style.announcement,
    )
    const txtHint = this.add.text(0, 0, 'You can start again!', Style.basic)
    // this.txtTimer = this.add.text(0, 0, '00:00:00', Style.basic)
    const btnContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: btnContainer,
      text: 'Exit',
      f: () => {
        this.waitingView.hide()
        this.characterSelectView.setAlpha(1)
      },
    })

    this.waitingView
      .add(txtNotice)
      .add(txtHint)
      // .add(this.txtTimer)
      .add(btnContainer)
      .addBackground(background)
      .layout()
      .hide()

    this.plugins.get('rexAnchor')['add'](this.waitingView, {
      x: `50%`,
      y: `50%`,
    })
  }

  private createHeader() {
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
    this.avatar = new AvatarButton({
      within: container,
    })
    this.txtMissionDescription = this.add.text(0, 0, '', {
      ...Style.basic,
      wordWrap: { width: Space.cutoutWidth },
      fixedWidth: Space.cutoutWidth,
      maxLines: 10,
    })
    headerSizer.add(container).add(this.txtMissionDescription)

    return headerSizer
  }

  private createDecklist() {
    this.decklist = new Decklist(this, this.onClickCutout())

    // Create a scrollable panel for the main decklist
    const panel = newScrollablePanel(this, {
      width: Space.cutoutWidth,
      height: Space.windowHeight - 420,
      scrollMode: 'vertical',
      panel: {
        child: this.decklist.sizer,
      },
    })

    return panel
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
        this.characterSelectView.setAlpha(1)
        this.missionDetailsView.hide()
      },
    })

    const cont3 = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    this.startBtn = new Buttons.Basic({
      within: cont3,
      text: 'Start',
      f: () => {
        // Start journey
        const deck: Deck = {
          name: 'Journey deck',
          cards: this.decklist.getDeckCode(),
          cosmeticSet: { avatar: this.selectedAvatar, border: 0 },
        }
        const opponentDeck: Deck = {
          name: 'todo name me',
          cards: this.selectedMission.opponentDeck,
          cosmeticSet: { avatar: 0, border: 0 },
        }

        this.scene.start('JourneyMatchScene', {
          deck: deck,
          aiDeck: opponentDeck,
          avatar: this.selectedAvatar,
          uponRoundWinText: this.selectedMission.uponRoundWinText,
          winText: this.selectedMission.winText,
          loseText: this.selectedMission.loseText,
        })
      },
    })

    this.startBtn.enabled = false
    btnSizer.add(cont1).add(cont3)

    return btnSizer
  }

  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        this.decklist.removeCard(cutout.card)
        this.missionDetailsView.layout()
        this.updateDeckState()
      }
    }
  }

  private updateDeckState() {
    const deckSize = this.decklist.getDeckCode().length

    if (deckSize === MechanicsSettings.DECK_SIZE) {
      this.startBtn.enable()
    } else {
      this.startBtn.disable()
    }
    this.missionDetailsView.layout()
  }

  private refreshCardPool() {
    const cardSet: Set<Card> = getUnlockedCards()

    // Enable dev flag to have all cards
    if (Flags.devCardsEnabled) {
      Catalog.collectibleCards.forEach((card) => {
        cardSet.add(card)
      })
    }

    // Filter the catalog to show only available cards
    this.catalogRegion.filter((card: Card) => cardSet.has(card))
  }

  private setMissionInfo(mission: JourneyMission, avatarIndex: number) {
    this.selectedMission = mission
    this.selectedAvatar = avatarIndex

    // Update the text / avatar
    this.txtMissionTitle.setText(`${avatarNames[avatarIndex]}'s Story`)
    this.txtMissionDescription.setText('Mission text coming soon')
    this.avatar.setAvatar(avatarIndex)

    // Update the decklist
    this.decklist.setJourneyDeck(
      mission.deck.map((id) => Catalog.getCardById(id)),
    )

    // Refresh the card pool to include optional cards from this mission
    this.refreshCardPool()

    // Update deck state after setting initial deck
    this.updateDeckState()
  }

  beforeExit() {
    // Stop the map scene when exiting journey
    if (this.scene.isActive('MapScene')) {
      this.scene.stop('MapScene')
    }
  }

  // Methods required by CatalogRegion
  addCardToDeck(card: Card) {
    this.decklist.addCard(card)
    this.missionDetailsView.layout()
    this.updateDeckState()
  }

  isOverfull(): boolean {
    return this.decklist.getDeckCode().length >= MechanicsSettings.DECK_SIZE
  }

  getCount(card: Card): number {
    return this.decklist.getCards().filter((id) => id === card.id).length
  }

  // Get the missions that appear this time
  private getMissionChoices(): [
    [JourneyMission, number],
    [JourneyMission, number],
  ] {
    // Total exp with all avatars
    const totalExp = UserSettings._get('avatar_experience').reduce(
      (acc, curr) => acc + curr,
      0,
    )

    // 1. Determine which characters might appear
    let maxIdx = 5
    if (totalExp < 2200) maxIdx = 4
    if (totalExp < 1200) maxIdx = 3
    if (totalExp < 600) maxIdx = 2
    if (totalExp < 200) maxIdx = 1
    const allowed = Array.from({ length: maxIdx + 1 }, (_, i) => i)

    // 2. Deterministic seed from UTC date
    const now = new Date()
    const seedStr = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`
    let seed = 0
    for (let i = 0; i < seedStr.length; i++)
      seed = (seed * 31 + seedStr.charCodeAt(i)) & 0xffffffff

    // Simple deterministic RNG (mulberry32)
    function mulberry32(a: number) {
      return function () {
        let t = (a += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
    }
    const rand = mulberry32(seed)

    // 3. Randomly pick 2 unique characters
    const results: [JourneyMission, number][] = []
    while (results.length < 2) {
      const idx = allowed[Math.floor(rand() * allowed.length)]
      if (results.find((result) => result[1] === idx)) continue

      // Get the right mission based off this avatar's exp
      const level = getCharacterLevel(idx).level
      const avatarMissionTrack = JOURNEY_MISSIONS[idx]

      // Use level to determine mission index (level 1 = index 0, etc.)
      // Clamp to available missions
      const missionIndex = Math.min(level - 1, avatarMissionTrack.length - 1)
      const mission = avatarMissionTrack[missionIndex]

      results.push([mission, idx])
    }

    // We are guaranteeing 2 results in the above loop
    return results as [[JourneyMission, number], [JourneyMission, number]]
  }
}
