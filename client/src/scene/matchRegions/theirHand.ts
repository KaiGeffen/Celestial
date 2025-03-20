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
  Color,
} from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'
import { MechanicsSettings } from '../../../../shared/settings'

export default class TheirBoard extends Region {
  // Effect showing that they have priority
  priorityHighlight: Phaser.GameObjects.Video

  btnDeck: Button
  btnDiscard: Button

  create(scene: GameScene): this {
    this.scene = scene

    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
    this.createBackground()

    this.createStacks()

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
    const x = 200
    const width = Space.windowWidth - 400 // (200 from each side)
    const height = Space.cardHeight / 2 - 43

    const background = this.scene.add
      .rectangle(x, 0, width, height, Color.backgroundLight)
      .setOrigin(0)

    this.container.add(background)
  }

  private createStacks(): void {
    let [x, y] = CardLocation.theirDeck(this.container)
    this.container.add(this.scene.add.image(x, y, 'Cardback'))
    this.btnDeck = new Buttons.Stacks.Deck(
      this.container,
      x,
      y + Space.cardHeight / 2,
      1,
    )

    // Discard pile
    ;[x, y] = CardLocation.theirDiscard(this.container)
    this.container.add(this.scene.add.image(x, y, 'Cardback'))
    this.btnDiscard = new Buttons.Stacks.Discard(
      this.container,
      x,
      y + Space.cardHeight / 2,
      1,
    )
  }

  // TUTORIAL FUNCTIONALITY
  hideStacks(): Region {
    this.btnDeck.setVisible(false)
    this.btnDiscard.setVisible(false)

    return this
  }
}
