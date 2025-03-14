import 'phaser'
import Button from '../../lib/buttons/button'
import Icons from '../../lib/buttons/icons'
import GameModel from '../../../../shared/state/gameModel'
import { Space, Style, UserSettings } from '../../settings/settings'
import { GameScene } from '../gameScene'
import Region from './baseRegion'
import CardLocation from './cardLocation'

// During the round, shows Pass button, who has passed, and who has priority
export default class ScoreboardRegion extends Region {
  theirScoreboard: Scoreboard
  ourScoreboard: Scoreboard

  create(scene: GameScene): ScoreboardRegion {
    this.scene = scene
    this.container = scene.add.container(Space.windowWidth, 0)

    const yMiddle =
      (CardLocation.story(undefined, 0, this.container, 1)[1] +
        CardLocation.story(undefined, 0, this.container, 0)[1]) /
      2
    this.theirScoreboard = new Scoreboard(scene, yMiddle - 140)
    this.ourScoreboard = new Scoreboard(scene, yMiddle + 140)

    this.container.add(this.theirScoreboard.container)
    this.container.add(this.ourScoreboard.container)

    return this
  }

  displayState(state: GameModel): void {
    if (state.isRecap) {
      this.theirScoreboard.show()
      this.ourScoreboard.show()
    } else {
      this.theirScoreboard.hide()
      this.ourScoreboard.hide()
    }

    this.theirScoreboard.setText(state.score[1].toString())
    this.ourScoreboard.setText(state.score[0].toString())
  }
}

class Scoreboard {
  background: Phaser.GameObjects.Image
  txt: Phaser.GameObjects.Text
  container: Phaser.GameObjects.Container

  constructor(scene: GameScene, y: number) {
    this.container = scene.add.container(0, y)

    this.background = scene.add.image(0, 0, 'icon-Scoreboard').setOrigin(0, 0.5)
    this.container.add(this.background)

    this.txt = scene.add.text(30, 0, '', Style.scoreboard).setOrigin(0, 0.5)
    this.container.add(this.txt)
  }

  setText(text: string) {
    this.txt.setText(text)
  }

  show() {
    this.container.setX(-this.background.width)
  }

  hide() {
    this.container.setX(0)
  }
}
