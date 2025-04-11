import 'phaser'
import Button from '../../lib/buttons/button'
import Buttons from '../../lib/buttons/buttons'
import GameModel from '../../../../shared/state/gameModel'
import { Color, Depth, Space, Style } from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'
import { UserSettings } from '../../settings/userSettings'

const width = Space.avatarSize + Space.pad * 2
const height = 250

export default class OurAvatarRegion extends Region {
  btnInspire: Button
  btnNourish: Button
  btnSight: Button
  btnDeck: Button
  btnDiscard: Button
  avatar: Button

  create(scene: GameScene): this {
    this.scene = scene
    this.container = scene.add
      .container(0, Space.windowHeight - height)
      .setDepth(Depth.ourAvatar)

    this.createBackground()
    this.createStatusDisplay()
    this.createAvatar()
    this.createStacks()

    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    // Avatar
    this.avatar.setQuality({ num: state.avatars[0] })

    // Statuses
    let amts = [0, 0, 0, 0]
    state.status[0].forEach((status) => {
      amts[status]++
    })

    const amtInspire = amts[1]
    const amtNourish = amts[2] - amts[3]

    this.btnInspire.setVisible(amtInspire !== 0).setText(`${amtInspire}`)
    this.btnNourish.setVisible(amtNourish !== 0).setText(`${amtNourish}`)
    this.btnSight
      .setVisible(state.vision[0] !== 0)
      .setText(`${state.vision[0]}`)

    // Pile sizes
    this.btnDeck.setText(`${state.deck[0].length}`)
    this.btnDiscard.setText(`${state.pile[0].length}`)
  }

  private createStacks(): void {
    let x = width / 4
    const y = 40
    this.btnDeck = new Buttons.Stacks.Deck(this.container, x, y, 0)
    this.addHotkeyHint([x, y], 'Q')

    // Discard pile
    x = (width * 3) / 4
    this.btnDiscard = new Buttons.Stacks.Discard(this.container, x, y, 0)
    this.addHotkeyHint([x, y], 'W')
  }

  private addHotkeyListeners() {
    // Deck
    this.scene.input.keyboard.on('keydown-Q', () => {
      if (UserSettings._get('hotkeys')) {
        this.btnDeck.onClick()
      }
    })

    // Discard
    this.scene.input.keyboard.on('keydown-W', () => {
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

  private createBackground(): void {
    const background = this.scene.add.image(0, -7, 'chrome-Avatar').setOrigin(0)
    this.container.add(background)
  }

  private createAvatar(): void {
    const x = width / 2
    const y = 140
    this.avatar = new Buttons.Avatar(this.container, x, y).setQuality({
      emotive: true,
    })

    // TODO Make Avatar be separate from border and take a config including cosmetics
    const border = this.scene.add.image(x, y, 'icon-Border')
    this.container.add(border)
  }

  private createStatusDisplay(): void {
    const y = -(Space.pad + 50 / 2)
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

  tutorialHide(): void {
    this.btnDeck.setVisible(false)
    this.btnDiscard.setVisible(false)
  }
}
