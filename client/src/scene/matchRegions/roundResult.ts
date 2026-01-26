import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

// Shows the current scores of the night's performance
export default class RoundResultRegion extends Region {
  roundResult: Phaser.GameObjects.Sprite

  create(scene: MatchScene): RoundResultRegion {
    this.scene = scene
    this.container = scene.add.container().setDepth(Depth.roundResult)
    this.scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `50%`,
      y: `50%`,
    })

    // Image in the center saying if you won/lost/tied
    this.roundResult = scene.add
      .sprite(0, 0, 'icon-RoundWin', 0)
      .setAlpha(0)
      .setInteractive()

    this.container.add(this.roundResult)

    return this
  }

  displayState(state: GameModel): void {
    this.deleteTemp()

    // On the final state of the recap, animate the text of round results
    const isRecapEnd = ['win', 'lose', 'tie'].includes(state.sound)
    if (state.isRecap && isRecapEnd) {
      this.animateResult(state)
    }
  }

  // Animate the results of this round
  // TODO Temporary, replace with crisper animation
  private animateResult(state: GameModel): void {
    let s
    if (state.score[0] > state.score[1]) {
      s = 'Win'
    } else if (state.score[0] < state.score[1]) {
      s = 'Lose'
    } else {
      s = 'Tie'
    }

    // Set what image displays
    const name = `roundResult-${s}`
    this.roundResult.setTexture(name, 0).play(name)

    // Tween it fading in and out
    this.scene.tweens.add({
      targets: this.roundResult,
      duration: 200,
      hold: 2000,
      ease: 'Sine.easeInOut',
      alpha: 1,
      yoyo: true,
      onStart: () => {
        this.roundResult.setAlpha(0)
      },
      onComplete: () => {
        this.roundResult.setAlpha(0)
      },
    })
  }
}
