import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

export default class WinsRegion extends Region {
  private imgSundial: Phaser.GameObjects.Image
  private imgWins: Phaser.GameObjects.Image

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.ourScore)

    this.imgSundial = scene.add.image(0, 0, 'chrome-sundial').setOrigin(1, 0.5)
    this.imgWins = scene.add.image(0, 0, 'icon-Wins').setOrigin(1, 0.5)
    this.container.add([this.imgSundial, this.imgWins])

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%`,
      y: `50%`,
      onUpdateViewportCallback: (viewport) => {
        const sundialH = viewport.height * 0.7
        const sundialAspect =
          this.imgSundial.frame.width / this.imgSundial.frame.height
        this.imgSundial.setDisplaySize(sundialH * sundialAspect, sundialH)

        const h = viewport.height
        const aspect = this.imgWins.frame.width / this.imgWins.frame.height
        this.imgWins.setDisplaySize(h * aspect, h)
      },
    })

    return this
  }

  displayState(_state: GameModel): void {
    // TODO hook wins state into the strip frame(s)
  }
}
