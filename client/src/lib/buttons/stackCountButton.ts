import 'phaser'
import Button from './button'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import { Style } from '../../settings/style'

export type StackCountKind = 'deck' | 'discard'

/** Count badge: chrome-stackCount image with centered count text on top. */
export default class StackCountButton extends Button {
  owner: number
  kind: StackCountKind

  constructor(
    within: Phaser.Scene | Phaser.GameObjects.Container | ContainerLite,
    x: number,
    y: number,
    owner: number,
    kind: StackCountKind,
  ) {
    super(within, x, y, {
      text: {
        text: '',
        interactive: false,
        style: Style.stackCountButton,
      },
      icon: {
        name: 'chrome-stackCount',
        interactive: true,
        circular: false,
      },
    })
    this.icon.setScale(0.5)
    this.owner = owner
    this.kind = kind
  }

  setText(s: string): Button {
    const result = super.setText(s)

    let hint: string
    if (this.kind === 'deck') {
      hint =
        this.owner === 0
          ? `You have ${s} cards in your deck.\nClick to see them all (unordered).`
          : `They have ${s} cards in their deck.\nClick to see their last shuffle.`
    } else {
      hint =
        this.owner === 0
          ? `You have ${s} cards in your discard pile.\nClick to see them all.`
          : `They have ${s} cards in their discard pile.\nClick to see them all.`
    }
    this.makeHintable(hint)

    return result
  }
}
