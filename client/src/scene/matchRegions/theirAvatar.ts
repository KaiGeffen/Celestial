import 'phaser'
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
  Color,
} from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'
import CardLocation from './cardLocation'

const width = Space.avatarSize + Space.pad * 2
const height = 250

export default class TheirAvatarRegion extends Region {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button
  btnDeck: Button
  btnDiscard: Button

  avatar: Button

  create(scene: GameScene): this {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.theirAvatar)

    this.createBackground()
    this.createStatusDisplay()
    this.createAvatar()
    this.createStacks()

    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    // Avatar
    this.avatar.setQuality({ num: state.avatars[1] })

    // Statuses
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
    this.btnSight
      .setVisible(state.vision[1] !== 0)
      .setText(`${state.vision[1]}`)

    // Pile sizes
    this.btnDeck.setText(`${state.deck[1].length}`)
    this.btnDiscard.setText(`${state.pile[1].length}`)
  }

  private createStacks(): void {
    const y = 215
    this.btnDeck = new Buttons.Stacks.Deck(this.container, width / 4, y, 1)

    // Discard pile
    this.btnDiscard = new Buttons.Stacks.Discard(
      this.container,
      (width * 3) / 4,
      y,
      1,
    )
  }

  private addHotkeyListeners() {
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

  showUsername(username: string, elo: number): void {
    const x = this.avatar.icon.x
    const y0 = this.avatar.icon.y + this.avatar.icon.height / 2 + 5

    const txtUsername = this.scene.add
      .text(x, y0, username, Style.username)
      .setOrigin(0.5, 0)
    const txtUsernameElo = this.scene.add
      .text(x, y0 + 16 + 5, elo.toString(), Style.usernameElo)
      .setOrigin(0.5, 0)

    this.container.add([txtUsername, txtUsernameElo])
  }

  // Show their avatar using the given emote
  emote(emoteNumber: number): void {
    this.avatar.setQuality({ emoting: emoteNumber })
  }

  private createBackground(): void {
    const background = this.scene.add
      .image(-1, -1, 'chrome-Avatar')
      .setOrigin(0, 1)
      .setScale(1, -1)
    this.container.add(background)
  }

  private createAvatar(): void {
    const x = width / 2
    const y = 80
    this.avatar = new Buttons.Avatar(this.container, x, y)

    // TODO Make Avatar be separate from border and take a config including cosmetics
    const border = this.scene.add.image(x, y, 'icon-Border')
    this.container.add(border)
  }

  private createStatusDisplay(): void {
    const y = height + Space.pad + 50 / 2
    this.btnInspire = new Buttons.Keywords.Inspire(
      this.container,
      width / 2 - 55,
      y,
    )
    this.btnNourish = new Buttons.Keywords.Nourish(this.container, width / 2, y)
    this.btnSight = new Buttons.Keywords.Sight(
      this.container,
      width / 2 + 55,
      y,
    )
  }

  setEmoteCallback(fEmote: () => void): void {
    this.avatar.setOnClick(fEmote, false, false)
  }

  // TUTORIAL FUNCTIONALITY
  hideStacks(): Region {
    this.btnDeck.setVisible(false)
    this.btnDiscard.setVisible(false)

    return this
  }
}
