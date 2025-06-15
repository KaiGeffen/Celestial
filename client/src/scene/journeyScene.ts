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
import Catalog from '../../../shared/state/catalog'
import Cutout from '../lib/buttons/cutout'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import JOURNEY_MISSIONS from '../data/journeyCharacters'
import Decklist from '../lib/decklist'
import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import { Deck } from '../../../shared/types/deck'
import avatarNames from '../lib/avatarNames'
import AvatarButton from '../lib/buttons/avatar'

export default class JourneyScene extends BaseScene {
  panDirection

  map: Phaser.GameObjects.Image

  isDragging = false

  characterContainers: Phaser.GameObjects.Container[] = []
  storyPanel: Phaser.GameObjects.Container | null = null

  // Mission details
  selectedMission
  txtMissionTitle: Phaser.GameObjects.Text
  txtMissionDescription: Phaser.GameObjects.Text
  avatar: AvatarButton
  decklist: Decklist

  // Timer until next journey available
  txtTimer: Phaser.GameObjects.Text

  // Views
  characterSelectView: Phaser.GameObjects.Container
  missionDetailsView: Sizer
  postMatchView: Phaser.GameObjects.Container
  waitingView: Sizer

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

    // Create post match screen
    this.createPostMatch(params.expGained ?? 10, params.postMatchText ?? '')

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

    // Somehow randomly get the characters that will appear
    // TODO
    const missionTracks = JOURNEY_MISSIONS

    // For each character, add the avatar, text, button
    const sizers = missionTracks.map((missions, avatarIndex) => {
      // TODO Use the level to get the right mission
      const mission = missions[0]

      const name = avatarNames[avatarIndex]

      // Form a sizer for this character
      const sizer = this.rexUI.add.sizer({
        orientation: 'vertical',
        space: { item: Space.pad },
      })

      const image = this.add.image(0, 0, `avatar-${name}Full`)
      this.plugins.get('rexDropShadowPipeline')['add'](image, {
        distance: 3,
        shadowColor: 0x000000,
      })
      const text = this.add.text(0, 0, name, Style.basic)
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
          // Set all information based on selected character
          this.txtMissionTitle.setText(`${name}'s Story`)
          this.txtMissionDescription.setText(mission.missionText)
          this.avatar.setAvatar(avatarIndex)

          this.selectedMission = mission

          this.decklist.setDeck(
            mission.deck.map((id) => Catalog.getCardById(id)),
          )

          // Set the right views visible/invisible
          this.characterSelectView.setAlpha(0)
          this.missionDetailsView.show().layout()
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

    this.characterSelectView.add(sizers[0]).add(sizers[1])
  }

  private createMissionDetails() {
    // Create a sizer for the mission details
    this.missionDetailsView = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
        top: Space.pad,
        bottom: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })

    const background = this.add.image(0, 0, 'background-Light')
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      shadowColor: 0x000000,
    })

    this.txtMissionTitle = this.add.text(0, 0, '', Style.announcement)
    const headerSizer = this.createHeader()
    const decklistSizer = this.createDecklist()
    const btnSizer = this.createButtons()

    this.missionDetailsView
      .add(this.txtMissionTitle)
      .add(headerSizer)
      .add(decklistSizer)
      .add(btnSizer)
      .addBackground(background)
      .layout()

    // Add an anchor for the sizer
    this.plugins.get('rexAnchor')['add'](this.missionDetailsView, {
      left: `0%+${Space.pad}`,
      y: `50%`,
    })

    this.missionDetailsView.hide()
  }

  private createPostMatch(expGained: number, postMatchText: string) {
    this.postMatchView = this.add.container().setAlpha(0)

    // Avatar image
    // TODO use the avatar
    const image = this.add.image(0, 0, 'avatar-JulesFull')
    this.plugins.get('rexDropShadowPipeline')['add'](image, {
      distance: 3,
      shadowColor: 0x000000,
    })

    // Contents
    const background = this.add.image(0, 0, 'background-Light')
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      shadowColor: 0x000000,
    })
    const sizer = this.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        item: Space.pad,
        left: Space.pad,
        right: Space.pad,
      },
    })
    const title = this.add.text(0, 0, 'Story Complete!', Style.announcement)
    const txt = this.add.text(0, 0, postMatchText, Style.basic)
    // TODO Progress bar / exp gained / unlocks unlocked
    const txtExpGained = this.add.text(
      0,
      0,
      `+${expGained} EXP Gained`,
      Style.basic,
    )
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
        this.postMatchView.setAlpha(0)
        this.waitingView.show()
      },
    })

    sizer
      .add(title)
      .add(txt)
      .add(txtExpGained)
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

    const background = this.add.image(0, 0, 'background-Light')
    this.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      shadowColor: 0x000000,
    })

    const txtNotice = this.add.text(
      0,
      0,
      'Daily journey complete',
      Style.announcement,
    )
    const txtTimerReminder = this.add.text(0, 0, 'Check back in:', Style.basic)
    this.txtTimer = this.add.text(0, 0, '00:00:00', Style.basic)
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
      f: () => this.scene.start('HomeScene'),
    })

    this.waitingView
      .add(txtNotice)
      .add(txtTimerReminder)
      .add(this.txtTimer)
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
      wordWrap: { width: 300 },
    })
    headerSizer.add(container).add(this.txtMissionDescription)

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
        this.characterSelectView.setAlpha(1)
        this.missionDetailsView.hide()
      },
    })
    // const cont2 = new ContainerLite(
    //   this,
    //   0,
    //   0,
    //   Space.buttonWidth,
    //   Space.buttonHeight,
    // )
    // new Buttons.Basic({
    //   within: cont2,
    //   text: 'Customize',
    // })
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
      f: () => {
        const deck: Deck = {
          name: 'Journey deck',
          cards: this.decklist.getDeckCode(),
          cosmeticSet: { avatar: this.selectedMission.avatar, border: 0 },
        }
        const opponentDeck: Deck = {
          name: 'todo name me',
          cards: this.selectedMission.opponentDeck,
          cosmeticSet: { avatar: 0, border: 0 },
        }

        this.scene.start('JourneyMatchScene', {
          deck: deck,
          aiDeck: opponentDeck,
          winText: this.selectedMission.winText,
          loseText: this.selectedMission.loseText,
        })
      },
    })
    btnSizer.add(cont1).add(cont3)

    return btnSizer
  }

  private onClickCutout(): (cutout: Cutout) => () => void {
    return (cutout: Cutout) => {
      return () => {
        this.decklist.removeCard(cutout.card)
        this.missionDetailsView.layout()
      }
    }
  }

  update(time, delta): void {
    // Update the timer
    const now = new Date()
    let target = new Date(now)
    if (now.getHours() < 12) {
      // Next noon today
      target.setHours(12, 0, 0, 0)
    } else {
      // Next midnight (start of tomorrow)
      target.setDate(now.getDate() + 1)
      target.setHours(0, 0, 0, 0)
    }
    const NEXT_JOURNEY_TIME = target

    const timeUntilNextJourney = NEXT_JOURNEY_TIME.getTime() - Date.now()
    const hours = Math.floor(timeUntilNextJourney / (1000 * 60 * 60))
    const minutes = Math.floor(
      (timeUntilNextJourney % (1000 * 60 * 60)) / (1000 * 60),
    )
    const seconds = Math.floor((timeUntilNextJourney % (1000 * 60)) / 1000)
    this.txtTimer.setText(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
    )

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
