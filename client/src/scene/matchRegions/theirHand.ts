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
import { MechanicsSettings } from '../../../../shared/settings'

export default class TheirHandRegion extends Region {
  // Effect showing that they have priority
  priorityHighlight: Phaser.GameObjects.Video

  btnDeck: Button
  btnDiscard: Button

  btnInspire: Button
  btnNourish: Button

  create(scene: GameScene): TheirHandRegion {
    this.scene = scene

    // Avatar, status, hand, recap, pass buttons
    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
    this.createBackground()

    // Highlight visible when they have priority
    this.priorityHighlight = this.createPriorityHighlight().setVisible(false)
    this.container.add(this.priorityHighlight)

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

    this.addHotkeyListeners()

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

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

  // Animate them getting or losing priority
  private animatePriority(state: GameModel): void {
    const targetAlpha = state.priority === 1 && !state.isRecap ? 1 : 0

    this.scene.tweens.add({
      targets: this.priorityHighlight,
      alpha: targetAlpha,
      duration: Time.recapTweenWithPause(),
    })
  }

  // TUTORIAL FUNCTIONALITY
  hideStacks(): Region {
    this.btnDeck.setVisible(false)
    this.btnDiscard.setVisible(false)

    return this
  }
}
