import 'phaser'

import Region from './baseRegion'

import { Space, Color, Style, Depth, Flags } from '../../settings/settings'
import GameModel from '../../../../shared/state/gameModel'
import { GameScene } from '../gameScene'

export default class TheirScoreRegion extends Region {
  txtWins: Phaser.GameObjects.Text

  create(scene: GameScene): TheirScoreRegion {
    this.container = scene.add.container(0, 0).setDepth(Depth.theirScore)

    // Wins
    const x = Space.windowWidth - (Flags.mobile ? 5 : 140)
    const y = Flags.mobile ? Space.handHeight - 15 : 53
    this.txtWins = scene.add
      .text(x, y, '', Style.basic)
      .setOrigin(Flags.mobile ? 1 : 0, Flags.mobile ? 0.5 : 0)

    // Add each of these objects to container
    this.container.add([this.txtWins])

    return this
  }

  displayState(state: GameModel): void {
    this.txtWins.setText(`${Flags.mobile ? 'Wins: ' : ''}${state.wins[1]}/5`)
  }
}
