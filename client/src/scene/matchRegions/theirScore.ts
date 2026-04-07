import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Space, Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

// Opponent score region — anchored top right
export default class TheirScoreRegion extends Region {
  private width = Space.iconSize * 2 + Space.pad * 3

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.theirScore)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%-${this.width}`,
    })

    return this
  }

  displayState(_state: GameModel): void {}
}
