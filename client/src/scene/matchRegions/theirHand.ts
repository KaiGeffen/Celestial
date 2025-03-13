import 'phaser'
import { Keywords } from '../../../../shared/state/keyword'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import {
  Depth,
  Space,
  Style,
  Time,
  Flags,
  UserSettings,
} from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'

export default class TheirHandRegion extends Region {
  priority: Phaser.GameObjects.Image

  btnDeck: Button
  btnDiscard: Button

  btnInspire: Button
  btnNourish: Button

  // Avatar image
  avatar: Button

  create(scene: GameScene): TheirHandRegion {
    this.scene = scene

    // Avatar, status, hand, recap, pass buttons
    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
    this.createBackground()

    // Highlight visible when they have priority
    this.priority = this.scene.add
      .image(0, 0, 'chrome-TopPriority')
      .setVisible(false)
      .setOrigin(0)
    this.container.add(this.priority)

    // Create the status visuals
    this.createStatusDisplay()

    // Create our avatar
    this.avatar = this.createAvatar()

    // Create stack buttons
    if (Flags.mobile) {
      this.btnDeck = new Buttons.Stacks.Deck(
        this.container,
        Space.windowWidth - 169,
        Space.handHeight / 2,
        0,
      )
      this.btnDiscard = new Buttons.Stacks.Discard(
        this.container,
        Space.windowWidth - 111,
        Space.handHeight / 2,
        0,
      )
    } else {
      const x = Space.windowWidth - 300
      this.btnDeck = new Buttons.Stacks.Deck(
        this.container,
        x,
        (Space.handHeight * 1) / 4,
        1,
      )
      this.btnDiscard = new Buttons.Stacks.Discard(
        this.container,
        x,
        (Space.handHeight * 3) / 4,
        1,
      )
    }

    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // Priority
    this.priority.setVisible(!state.isRecap && state.priority === 1)

    // Avatar
    this.avatar.setQuality({ num: state.avatars[1] })

    // Statuses
    this.displayStatuses(state)

    this.cards = []
    for (let i = 0; i < state.hand[1].length; i++) {
      let card = this.addCard(
        state.hand[1][i],
        CardLocation.theirHand(state, i, this.container),
      ).moveToTopOnHover()

      this.cards.push(card)
      this.temp.push(card)
    }

    // Pile sizes
    this.btnDeck.setText(`${state.deck[1].length}`)
    this.btnDiscard.setText(`${state.pile[1].length}`)
  }

  addHotkeyListeners() {
    // Deck
    this.scene.input.keyboard.on('keydown-E', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDeck.onClick()
      }
    })

    // Discard
    this.scene.input.keyboard.on('keydown-R', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDiscard.onClick()
      }
    })
  }

  setOverlayCallbacks(fDeck: () => void, fDiscard: () => void): void {
    this.btnDeck.setOnClick(fDeck)
    this.btnDiscard.setOnClick(fDiscard)
  }

  showUsername(username: string): void {
    this.container.add(
      this.scene.add
        .text(
          21 + Space.avatarSize / 2,
          14 + Space.avatarSize,
          username,
          Style.username,
        )
        .setOrigin(0.5, 0),
    )
  }

  private createBackground(): void {
    const s = `icon-${Flags.mobile ? 'MobileBottom' : 'Top'}`
    let background = this.scene.add
      .image(Space.windowWidth, 0, s)
      .setOrigin(1, 0)
      .setInteractive()

    if (Flags.mobile) {
      background.setFlipY(true)
    }

    this.container.add(background)
  }

  private createPriorityHighlight(): Phaser.GameObjects.Video {
    return this.scene.add
      .video(0, 0, 'priorityHighlight')
      .setOrigin(0)
      .play(true)
      .setAlpha(0)
  }

  private createAvatar(): Button {
    const x = Flags.mobile ? 10 : 21
    const y = Flags.mobile ? 10 : 14
    let btn = new Buttons.Avatar(this.container, x, y, 'Jules')
    btn.setOrigin(0)

    return btn
  }

  private createStatusDisplay(): void {
    if (!Flags.mobile) {
      let x = 21 + Space.avatarSize - 10

      // Inspire
      let y = 14
      this.btnInspire = new Buttons.Keywords.Inspire(this.container, x - 15, y)
        .setOrigin(0)
        .setVisible(false)
      this.btnInspire.setOnHover(
        ...this.onHoverStatus('Inspired', this.btnInspire),
      )

      // Nourish
      y += Space.avatarSize / 2
      this.btnNourish = new Buttons.Keywords.Nourish(this.container, x - 15, y)
        .setOrigin(0)
        .setVisible(false)
      this.btnNourish.setOnHover(
        ...this.onHoverStatus('Nourish', this.btnNourish),
      )
    } else {
      // Bottom center of avatar
      let x = 10 + Space.avatarSize / 2
      const dx = Space.avatarSize / 4
      let y = 10 + Space.avatarSize

      this.btnInspire = new Buttons.Keywords.Inspire(
        this.container,
        x + dx,
        y + 10,
      ).setVisible(false)
      this.btnNourish = new Buttons.Keywords.Nourish(
        this.container,
        x - dx,
        y + 10,
      ).setVisible(false)
    }
  }

  private onHoverStatus(status: string, btn: Button): [() => void, () => void] {
    let that = this
    let keyword = Keywords.get(status)

    //TODO Move this into hint
    let onHover = () => {
      let s = keyword.text

      // Remove the first X (In image data)
      s = s.replace(' X', '')

      // Get the value from the given status button
      s = s.split(/\bX\b/).join(btn.getText())
      s = s.replace('you', 'they')

      // Hint shows status text
      that.scene.hint.showText(s)
    }

    let onExit = () => {
      that.scene.hint.hide()
    }

    return [onHover, onExit]
  }

  private displayStatuses(state: GameModel): void {
    // Specific to 4 TODO
    let amts = [0, 0, 0, 0]
    const length = 4

    state.status[1].forEach(function (status, index, array) {
      amts[status]++
    })

    const amtInspire = amts[1]
    const amtNourish = amts[2] - amts[3]

    this.btnInspire.setVisible(amtInspire !== 0).setText(`${amtInspire}`)

    this.btnNourish.setVisible(amtNourish !== 0).setText(`${amtNourish}`)
  }

  // They have used the given emote
  emote(emoteNumber: number): void {
    this.avatar.setQuality({ emoting: emoteNumber })
  }

  // TUTORIAL FUNCTIONALITY
  hideStacks(): Region {
    this.btnDeck.setVisible(false)
    this.btnDiscard.setVisible(false)

    return this
  }
}
