import 'phaser'

import { CardImage } from '../../lib/cardImage'
import Card from '../../../../shared/state/card'
import GameModel from '../../../../shared/state/gameModel'
import { Time, Space, Color, Depth, Style } from '../../settings/settings'
import { GameScene } from '../gameScene'

// Base region
export default class Region {
  container: Phaser.GameObjects.Container

  scene: GameScene

  // All gameobjects that should be deleted before new state is shown
  temp: any[] = []

  // The cards in the current state in this region, if any
  cards: CardImage[]
  cards2: CardImage[]

  addCard(card: Card, position: [number, number] = [0, 0]): CardImage {
    return new CardImage(card, this.container).setPosition(position)
  }

  // Display parts of the given state relevant to this region
  displayState(state: GameModel): void {}

  show(): Region {
    this.container.setVisible(true)
    return this
  }

  hide(): Region {
    this.container.setVisible(false)
    return this
  }

  isVisible(): boolean {
    return this.container.visible
  }

  // Bring attention to the given region by hiding everything else on screen
  focus(text = ''): void {
    return
    const x = -this.container.x
    const y = -this.container.y

    let foo = this.scene.rexUI.add
      .textBox({
        x: Space.windowWidth / 2,
        y: Space.windowHeight / 2,
        background: this.scene.add.rectangle(
          0,
          0,
          Space.windowWidth,
          Space.windowHeight,
          Color.focusBackground,
          0.6,
        ),
        // .setOrigin(0)
        // .setInteractive()
        // .on('pointerdown', () => {foo.destroy()}),
        text: this.scene.add.text(0, 0, text, Style.tutorial),
      })
      .layout()

    foo.start(text, 10)

    this.temp.push(foo)
    // this.container.add(foo)

    // foo.start('uwuwuwuwuwuwuwuwuwuwuwuwu', 3)

    // let txt =
    // .setOrigin(0.5)
    // this.container.add(txt)
    // this.temp.push(txt)

    // // Background behind everything, then text
    // this.container.sendToBack(txt)
    // .sendToBack(background)

    // // Remember the depth of this container in the callback
    // // const depth = this.container.depth
    // background.on('pointerdown', () => {
    // 	// this.container.setDepth(depth)
    // 	txt.destroy()
    // 	background.destroy()
    // })

    // Move this container above all others
    // this.container.setDepth(Depth.aboveAll)
  }

  // Do any update consistent with phaser scenes
  update(time, delta) {}

  protected deleteTemp(): void {
    for (let i = 0; i < this.temp.length; i++) {
      this.temp[i].destroy()
    }

    delete this.temp
    this.temp = []
  }

  // Animate the given card being emphasized
  protected animateEmphasis(card: CardImage, delay: number): void {
    card.hide()

    // Animate moving x direction, appearing at start
    this.scene.tweens.add({
      targets: card.container,
      alpha: 0,
      scale: 2,
      delay: delay,
      duration: Time.recapTweenWithPause(),
      onStart: function (tween, targets, _) {
        card.show()
      },
      onComplete: function (tween, targets, _) {
        card.destroy()
      },
    })
  }
}
