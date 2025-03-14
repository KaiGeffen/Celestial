import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth } from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'

export default class TheirHandRegion extends Region {
  create(scene: GameScene): TheirHandRegion {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.theirHand)
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
  }
}
