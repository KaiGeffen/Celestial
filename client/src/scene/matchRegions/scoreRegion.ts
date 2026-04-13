import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

const HALF_WINS_BEFORE_FINAL = 4
const LOTUS_SCALE = 0.5

// Hand-tuned slot positions to match the vine arc.
// Top and bottom should mirror each other.
const SMALL_LOTUS_X = [18, 12, 6, 0]
const TOP_SMALL_LOTUS_Y = [-250, -204, -158, -112]
const BOTTOM_SMALL_LOTUS_Y = [112, 158, 204, 250]

const TEX_SMALL_OPEN = 'chrome-smallLotusOpen'
const TEX_SMALL_CLOSED = 'chrome-smallLotusClosed'
const TEX_BIG_OPEN = 'chrome-bigLotusOpen'
const TEX_BIG_CLOSED = 'chrome-bigLotusClosed'

export default class WinsRegion extends Region {
  private ourLotuses: Phaser.GameObjects.Image[] = []
  private theirLotuses: Phaser.GameObjects.Image[] = []
  private finalLotus: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.ourScore)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `0%+140`,
      y: `50%`,
    })

    this.createLotuses()
    this.container.setVisible(true)

    return this
  }

  displayState(state: GameModel): void {
    const ourWins = state.wins?.[0] ?? 0
    const theirWins = state.wins?.[1] ?? 0

    for (let i = 0; i < HALF_WINS_BEFORE_FINAL; i++) {
      this.ourLotuses[i].setTexture(i < ourWins ? TEX_SMALL_OPEN : TEX_SMALL_CLOSED)
    }

    for (let i = 0; i < HALF_WINS_BEFORE_FINAL; i++) {
      this.theirLotuses[i].setTexture(
        i < theirWins ? TEX_SMALL_OPEN : TEX_SMALL_CLOSED,
      )
    }

    const finalWon = ourWins >= 5 || theirWins >= 5
    this.finalLotus.setTexture(finalWon ? TEX_BIG_OPEN : TEX_BIG_CLOSED)
  }

  private createLotuses(): void {
    for (let i = 0; i < HALF_WINS_BEFORE_FINAL; i++) {
      const topLotus = this.scene.add
        .image(SMALL_LOTUS_X[i], TOP_SMALL_LOTUS_Y[i], TEX_SMALL_CLOSED)
        .setScale(LOTUS_SCALE)
      this.container.add(topLotus)
      this.theirLotuses.push(topLotus)
    }

    // Final 5th win (shared middle lotus)
    this.finalLotus = this.scene.add
      .image(0, 0, TEX_BIG_CLOSED)
      .setScale(LOTUS_SCALE)
    this.container.add(this.finalLotus)

    for (let i = 0; i < HALF_WINS_BEFORE_FINAL; i++) {
      const bottomLotus = this.scene.add
        .image(SMALL_LOTUS_X[i], BOTTOM_SMALL_LOTUS_Y[i], TEX_SMALL_CLOSED)
        .setScale(LOTUS_SCALE)
      this.container.add(bottomLotus)
      this.ourLotuses.push(bottomLotus)
    }
  }
}
