import 'phaser'
import { Style, Space } from '../settings/settings'
import BaseScene from './baseScene'
import Button from '../lib/buttons/button'
import Buttons from '../lib/buttons/buttons'

export default class PlaceholderScene extends BaseScene {
  constructor() {
    super({
      key: 'PlaceholderScene',
    })
  }

  create(): void {
    this.add
      .text(Space.windowWidth / 2, Space.windowHeight / 2, s, {
        ...Style.basic,
        wordWrap: { width: Space.windowWidth - Space.pad * 2 },
      })
      .setOrigin(0.5)

    new Buttons.Basic({
      within: this,
      text: 'Home',
      x: Space.windowWidth / 2,
      y: Space.windowHeight - Space.pad - Space.buttonHeight / 2,
      f: () => this.scene.start('HomeScene'),
    })

    super.create()
  }
}

const s = `
Having completed the tutorial, you're now ready to play the full game!

From the title screen you can continue the single-player Journey mode, slowly accumulating cards and learning about the 6 unique characters as they traverse the city.

Alternatively, in Free Play you can choose from any premade deck to play against the AI or a human opponent, or make your own deck from any of the cards in the game.

Press ESC or click the gear icon in the upper-right to open the options menu, which includes a link to the Discord to stay connected.

Thanks so much for playing! We hope you enjoy and stick around as the game develops.
`
