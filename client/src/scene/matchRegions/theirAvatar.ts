import 'phaser'
import { Keywords } from '../../../../shared/state/keyword'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import {
  Depth,
  Space,
  Style,
  Flags,
  UserSettings,
} from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'

export default class TheirAvatarRegion extends Region {
  priority: Phaser.GameObjects.Image

  // Stack amount
  txtWins: Phaser.GameObjects.Text
  txtHand: Phaser.GameObjects.Text
  txtDeck: Phaser.GameObjects.Text
  txtDiscard: Phaser.GameObjects.Text
  txtRemoved: Phaser.GameObjects.Text

  // All objects relating to removed (Invisible when empty)
  removedContainer: Phaser.GameObjects.Container

  // Buttons for each stack
  btnDeck: Button
  btnDiscard: Button
  btnRemoved: Button

  // Status buttons
  btnInspire: Button
  btnNourish: Button

  // Avatar image
  avatar: Button

  create(scene: GameScene): TheirAvatarRegion {
    this.scene = scene

    // Avatar, status, hand, recap, pass buttons
    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)

    // Highlight visible when they have priority
    this.priority = this.scene.add
      .image(0, 0, 'chrome-TopPriority')
      .setVisible(false)
      .setOrigin(0)
    this.container.add(this.priority)

    // Create the status visuals
    this.createStatusDisplay()

    // Create our avatar
    this.createAvatar()

    // TODO Remove
    this.showUsername('UsernameExtraLong (sfskfnskfs)')

    this.createStackButtons()

    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // Priority
    this.priority.setVisible(!state.isRecap && state.priority === 1)

    // Avatar TODO Only needs to happen once
    this.avatar.setQuality({ num: state.avatars[1] })

    // Statuses
    this.displayStatuses(state)

    // Pile sizes
    this.txtWins.setText(`${state.wins[1]}/5`)
    this.txtHand.setText(`${state.hand[1].length}`)
    this.txtDeck.setText(`${state.deck[1].length}`)
    this.txtDiscard.setText(`${state.pile[1].length}`)
    this.txtRemoved.setText(`${state.expended[1].length}`)

    // If removed is empty, make it invisible
    this.removedContainer.setVisible(state.expended[1].length > 0)

    super.displayState(state)
  }

  addHotkeyListeners() {
    // Deck
    this.scene.input.keyboard.on('keydown-A', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDeck.onClick()
      }
    })

    // Discard
    this.scene.input.keyboard.on('keydown-S', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDiscard.onClick()
      }
    })

    // Removed
    this.scene.input.keyboard.on('keydown-D', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnRemoved.onClick()
      }
    })
  }

  setOverlayCallbacks(
    deckCallback: () => void,
    discardCallback: () => void,
    removedCallback: () => void,
  ): void {
    this.btnDeck.setOnClick(deckCallback)
    this.btnDiscard.setOnClick(discardCallback)
    this.btnRemoved.setOnClick(removedCallback)
  }

  showUsername(username: string): void {
    this.container.add(
      this.scene.add.text(144, 19, username, Style.username).setOrigin(0),
    )
  }

  private createAvatar(): void {
    const x = 22
    const y = 14
    this.avatar = new Buttons.Avatar(this.container, x, y, 'Jules').setOrigin(0)

    this.avatar.icon.setDisplaySize(95, 95)
  }

  private createStatusDisplay(): void {
    if (!Flags.mobile) {
      let x = 21 + Space.avatarSize - 10

      // Inspire
      this.btnInspire = new Buttons.Keywords.Inspire(this.container, 147, 58.85)
        .setOrigin(0)
        .setVisible(true)
      this.btnInspire.setOnHover(
        ...this.onHoverStatus('Inspire', this.btnInspire),
      )

      // Nourish
      this.btnNourish = new Buttons.Keywords.Nourish(this.container, 209, 58.85)
        .setOrigin(0)
        .setVisible(true)
      this.btnNourish.setOnHover(
        ...this.onHoverStatus('Nourish', this.btnNourish),
      )
    } else {
      // TODO Remove
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

  private createStackButtons(): void {
    const x = 37
    let y = 150
    this.container.add([
      this.scene.add.image(x, y, 'icon-Wins').setScale(24 / 35),
      (this.txtWins = this.scene.add
        .text(x + 40, y, '', Style.todoPileCount)
        .setOrigin(0, 0.5)),
    ])

    y += 46
    this.container.add([
      this.scene.add.image(x, y, 'icon-Hand'),
      (this.txtHand = this.scene.add
        .text(x + 40, y, '', Style.todoPileCount)
        .setOrigin(0, 0.5)),
    ])

    y += 46
    this.btnDeck = new Buttons.Stacks.Deck(this.container, x, y, 1)
    this.container.add(
      (this.txtDeck = this.scene.add
        .text(x + 40, y, '', Style.todoPileCount)
        .setOrigin(0, 0.5)),
    )

    y += 46
    this.btnDiscard = new Buttons.Stacks.Discard(this.container, x, y, 1)
    this.container.add(
      (this.txtDiscard = this.scene.add
        .text(x + 40, y, '', Style.todoPileCount)
        .setOrigin(0, 0.5)),
    )

    y += 46
    this.removedContainer = this.scene.add.container(0, 0)
    this.container.add(this.removedContainer)
    this.btnRemoved = new Buttons.Stacks.Removed(this.removedContainer, x, y, 1)
    this.removedContainer.add(
      (this.txtRemoved = this.scene.add
        .text(x + 40, y, '', Style.todoPileCount)
        .setOrigin(0, 0.5)),
    )
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

    // If there is no inspire, move nourish to the inspire position
    if (amtInspire === 0) {
      this.btnNourish.setPosition(
        this.btnInspire.icon.x,
        this.btnInspire.icon.y,
      )
    } else {
      this.btnNourish.setPosition(
        this.btnInspire.icon.x + 63,
        this.btnInspire.icon.y,
      )
    }
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
