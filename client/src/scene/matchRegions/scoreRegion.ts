import 'phaser'
import GameModel from '../../../../shared/state/gameModel'
import { Depth } from '../../settings/settings'
import Region from './baseRegion'
import { MatchScene } from '../matchScene'

const GEM_COUNT = 5

// Match `PassRegion` sun distance from the right edge (`x = -156`).
const SUN_X_FROM_RIGHT = 156

// Circle center is far offscreen to the right; the sun's center lies on that circle.
// If the sun is the left-most point on the circle: centerX = sunX + radius.
const CIRCLE_RADIUS = 360
const CIRCLE_CENTER_X_FROM_RIGHT = SUN_X_FROM_RIGHT - CIRCLE_RADIUS // positive -> offscreen right

// Their gems sit above the sun, ours below it, on the same circle.
const ARC_FIRST_DEG = 22
const ARC_SPAN_DEG = 20
const ARC_FIRST_RAD = (ARC_FIRST_DEG * Math.PI) / 180
const ARC_LAST_RAD = ((ARC_FIRST_DEG + ARC_SPAN_DEG) * Math.PI) / 180

export default class WinsRegion extends Region {
  private ourGems: Phaser.GameObjects.Image[] = []
  private theirGems: Phaser.GameObjects.Image[] = []

  create(scene: MatchScene): this {
    this.scene = scene
    this.container = scene.add.container(0, 0).setDepth(Depth.ourScore)

    scene.plugins.get('rexAnchor')['add'](this.container, {
      x: `100%`,
      y: `50%`,
    })

    this.createGems()

    return this
  }

  displayState(state: GameModel): void {
    const ourWins = state.wins?.[0] ?? 0
    const theirWins = state.wins?.[1] ?? 0

    for (let i = 0; i < GEM_COUNT; i++) {
      const filled = i < ourWins
      this.ourGems[i].setAlpha(filled ? 1 : 0.25)
    }

    for (let i = 0; i < GEM_COUNT; i++) {
      const filled = i < theirWins
      this.theirGems[i].setAlpha(filled ? 1 : 0.25)
    }
  }

  private createGems(): void {
    // Container origin is at the right edge (x=0). Offscreen right is +x.
    const circleCenterX = -CIRCLE_CENTER_X_FROM_RIGHT
    const circleCenterY = 0
    const radius = CIRCLE_RADIUS

    // "Sun center" point on the circle (left-most point).
    // const sunX = -SUN_X_FROM_RIGHT
    // const sunY = 0

    const makeArcRad = (
      out: Phaser.GameObjects.Image[],
      startRad: number,
      endRad: number,
      tint?: number,
    ) => {
      for (let i = 0; i < GEM_COUNT; i++) {
        const t = i / (GEM_COUNT - 1)
        const theta = startRad + (endRad - startRad) * t
        const x = circleCenterX + Math.cos(theta) * radius
        const y = circleCenterY + Math.sin(theta) * radius

        const gem = this.scene.add.image(x, y, 'icon-win')
        if (tint !== undefined) {
          gem.setTint(tint)
        }
        this.container.add(gem)
        out.push(gem)
      }
    }

    // Sun point is at angle π (left-most point).
    const sunTheta = Math.PI

    // Their gems: above the sun (approaching the sun from above).
    makeArcRad(
      this.theirGems,
      sunTheta - ARC_LAST_RAD,
      sunTheta - ARC_FIRST_RAD,
      0x111111,
    )

    // Our gems: below the sun (departing the sun downward).
    makeArcRad(this.ourGems, sunTheta + ARC_FIRST_RAD, sunTheta + ARC_LAST_RAD)
  }
}
