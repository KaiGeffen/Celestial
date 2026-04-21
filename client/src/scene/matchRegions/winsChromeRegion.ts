import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

/** Vertical offset from container origin to each scaled `chrome-wins` center (their above, ours below). */
const WINS_CHROME_VERTICAL_HALF_SPREAD = 80

const WINS_CHROME_SCALE = 0.6

/**
 * Left-side anchor with two `chrome-wins` panels stacked: opponent above, us below.
 */
export default class WinsChromeRegion extends Region {
  private imgTheir: Phaser.GameObjects.Image
  private imgOur: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: '0%+140',
      y: '50%',
    })

    this.imgTheir = scene.add
      .image(0, -WINS_CHROME_VERTICAL_HALF_SPREAD, 'chrome-wins')
      .setOrigin(0.5)
      .setScale(WINS_CHROME_SCALE)
    this.imgOur = scene.add
      .image(0, WINS_CHROME_VERTICAL_HALF_SPREAD, 'chrome-wins')
      .setOrigin(0.5)
      .setScale(WINS_CHROME_SCALE)

    this.container.add([this.imgTheir, this.imgOur])
    this.container.setVisible(false)

    return this
  }

  displayState(_state: GameModel): void {}
}
