import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import {
  Space,
  Style,
  Color,
  Time,
  Flags,
  BBStyle,
} from '../../settings/settings'
import Button from './button'
import Card from '../../../../shared/state/card'
import Hint from '../hint'

// Exported buttons
export default class Cutout extends Button {
  name: string
  id: number
  card: Card
  count: number
  container: ContainerLite

  // Whether this card is required for the current mission
  required = false

  constructor(within: ContainerLite, card: Card) {
    super(within, 0, 0, {
      text: {
        text: '',
        interactive: false,
        style: Style.cardCount,
        offsetX: 150,
      },
      icon: {
        name: `cutout-${card.name}`,
        // On mobile, interactive through scrollable panel
        interactive: !Flags.mobile,
        noGlow: true,
      },
      callbacks: {
        click: Flags.mobile
          ? () => {
              this.scene.scene.launch('MenuScene', {
                menu: 'focus',
                card: card,
                cost: undefined,
                getCount: () => {
                  return this.count
                },
                btnString: 'Remove',
                closeOnClick: () => {
                  return this.count === 0
                },
                callback: () => {},
              })
            }
          : () => {},
        // When hovered, show the given cards
        hover: () => {
          hint.leftPin = this.icon.getRightCenter().x
          hint.showCard(card).disableWaitTime()
          this.icon.setTint(Color.buttonSelected)
        },
        exit: () => {
          hint.hide().enableWaitTime()
          this.icon.clearTint()
        },
      },
      sound: {
        mute: Flags.mobile,
      },
    })

    // FOR TESTING TODO Flag to include
    if (!this.scene.game.textures.exists(`cutout-${card.name}`)) {
      const s = `${card.name} - ${card.cost}:${card.points}`
      const txt = this.scene.add
        .text(0, 0, s, Style.cardCount)
        .setWordWrapWidth(Space.cardWidth)
        .setOrigin(0.5, 0.5)
      within.add(txt)
    }

    // Cost and points of the card
    const txtCost = this.scene.add.rexBBCodeText(
      -164,
      -22,
      `[b]${card.cost}[/b]`,
      BBStyle.cardStats,
    )
    within.add(txtCost)
    const txtPoints = this.scene.add.rexBBCodeText(
      -130,
      -12,
      `[b]${card.points}[/b]`,
      BBStyle.cardStats,
    )
    within.add(txtPoints)

    // The base scene's hint text object
    let hint: Hint = within.scene['hint']

    // Set variables
    this.name = card.name
    this.id = card.id
    this.card = card

    this.count = 1
    this.container = within

    this.updateText()
  }

  setOnClick(f: () => void): Cutout {
    if (Flags.mobile) {
      super.setOnClick(() => {
        this.scene.scene.launch('MenuScene', {
          menu: 'focus',
          card: this.card,
          cost: undefined,
          getCount: () => {
            return this.count
          },
          btnString: 'Remove',
          closeOnClick: () => {
            return this.count === 0
          },
          callback: f,
        })
      })
    } else {
      super.setOnClick(f)
    }

    return this
  }

  // Increment the count of this card
  increment(): Cutout {
    this.count += 1

    this.updateText()

    return this
  }

  // Decrement the count of this card, and delete if we reach 0
  decrement(): Cutout {
    this.count -= 1

    this.updateText()

    return this
  }

  destroy(): Cutout {
    // Must do exit method so that hover doesn't persist
    this.onExit()

    this.container.destroy()

    return this
  }

  // Set that this card cannot have more/fewer copies
  setRequired(): Cutout {
    this.required = true

    this.onClick = () => {
      this.scene['signalError']("Can't remove a required card.")
    }

    this.updateText()

    return this
  }

  tween: Phaser.Tweens.Tween
  stopFlash(): void {
    if (this.tween) {
      this.tween.stop()
    }
  }

  private updateText(): Cutout {
    const char = this.required ? '🔒' : 'x'

    console.log(char)

    this.setText(`${char}${this.count}`)

    this.stopFlash()
    this.tween = this.scene.tweens.add({
      targets: this.txt,
      alpha: 0,
      duration: Time.flash,
      yoyo: true,
      onStart: () => {
        this.txt.alpha = 1
      },
    })

    return this
  }
}
