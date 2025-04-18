import 'phaser'
import { Depth, Space } from '../../settings/settings'
import Region from './baseRegion'
import { GameScene } from '../gameScene'
import GameModel from '../../../../shared/state/gameModel'

interface Butterfly {
  sprite: Phaser.GameObjects.Image
  targetX: number
  targetY: number
  driftPhase: number
  driftOffset: { x: number; y: number }
  restTimer: number
  isResting: boolean
  fadeState: 'in' | 'out' | 'visible'
  fadeValue: number
  restingRotation?: number // The random rotation when resting
}

export default class CompanionRegion extends Region {
  private butterflies: Butterfly[] = []
  private bounds: Phaser.Geom.Rectangle
  private spawnTimer: number = 0
  private readonly MAX_BUTTERFLIES = 4
  private readonly SPAWN_INTERVAL = 2000 // Reduced to spawn more frequently

  // Movement constants
  private readonly DRIFT_SPEED = 0.001 // Significantly reduced to smooth movement
  private readonly DRIFT_AMOUNT = 30
  private readonly MOVE_SPEED = 0.8
  private readonly REST_DURATION = 3000
  private readonly FADE_SPEED = 0.02

  // Butterfly colors
  private readonly COLORS = [
    0xffffff, // White
    0xffb0b0, // Pink
    0xb0ffb0, // Light green
    0xb0b0ff, // Light blue
    0xffe0b0, // Light orange
    0xe0b0ff, // Light purple
  ]

  create(scene: GameScene): this {
    this.scene = scene

    const width = Space.avatarSize + Space.pad * 2
    const height = Space.windowHeight - 500

    this.container = scene.add.container(0, 250).setDepth(Depth.companion)
    this.bounds = new Phaser.Geom.Rectangle(0, 0, width, height)

    // Create initial butterfly
    this.spawnButterfly()

    return this
  }

  displayState(state: GameModel): void {
    // This region doesn't need to react to game state
  }

  update(time: number, delta: number): void {
    // Handle spawning
    this.spawnTimer += delta
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0
      // More aggressive spawning until we reach max
      if (this.butterflies.length < this.MAX_BUTTERFLIES) {
        this.spawnButterfly()
      } else if (this.butterflies.length > 1 && Math.random() < 0.2) {
        const index = Math.floor(Math.random() * this.butterflies.length)
        this.butterflies[index].fadeState = 'out'
      }
    }

    // Update each butterfly
    this.butterflies = this.butterflies.filter((butterfly) => {
      this.updateButterfly(butterfly, time, delta)

      if (butterfly.fadeState === 'out' && butterfly.fadeValue <= 0) {
        butterfly.sprite.destroy()
        return false
      }
      return true
    })
  }

  private updateButterfly(
    butterfly: Butterfly,
    time: number,
    delta: number,
  ): void {
    // Handle fading
    if (butterfly.fadeState === 'in') {
      butterfly.fadeValue = Math.min(1, butterfly.fadeValue + this.FADE_SPEED)
      if (butterfly.fadeValue >= 1) butterfly.fadeState = 'visible'
    } else if (butterfly.fadeState === 'out') {
      butterfly.fadeValue = Math.max(0, butterfly.fadeValue - this.FADE_SPEED)
    }
    butterfly.sprite.setAlpha(butterfly.fadeValue)

    if (butterfly.isResting) {
      butterfly.restTimer += delta
      if (butterfly.restTimer >= this.REST_DURATION) {
        butterfly.isResting = false
        this.pickNewTarget(butterfly)
      } else {
        butterfly.sprite.setRotation(butterfly.restingRotation)
      }
      return
    }

    // Update drift phase
    butterfly.driftPhase += this.DRIFT_SPEED * delta // Scale with delta time

    // Simpler, smoother drift
    const driftX = Math.sin(butterfly.driftPhase) * this.DRIFT_AMOUNT
    const driftY = Math.cos(butterfly.driftPhase * 0.7) * this.DRIFT_AMOUNT

    // Calculate direction to target
    const dx = butterfly.targetX - butterfly.sprite.x
    const dy = butterfly.targetY - butterfly.sprite.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < this.MOVE_SPEED) {
      butterfly.isResting = true
      butterfly.restTimer = 0
      butterfly.restingRotation = Math.random() * Math.PI * 2
      return
    }

    // Combine drift with movement towards target
    const moveX = (dx / distance) * this.MOVE_SPEED + driftX * 0.01
    const moveY = (dy / distance) * this.MOVE_SPEED + driftY * 0.01

    // Update position with bounds checking
    const newX = Phaser.Math.Clamp(
      butterfly.sprite.x + moveX,
      20,
      this.bounds.width - 20,
    )
    const newY = Phaser.Math.Clamp(
      butterfly.sprite.y + moveY,
      20,
      this.bounds.height - 20,
    )

    butterfly.sprite.x = newX
    butterfly.sprite.y = newY

    // Smoother rotation
    const targetRotation = Math.atan2(moveY, moveX) + Math.PI / 2
    let currentRotation = butterfly.sprite.rotation
    let rotationDiff = targetRotation - currentRotation

    // Normalize rotation difference
    while (rotationDiff > Math.PI) rotationDiff -= Math.PI * 2
    while (rotationDiff < -Math.PI) rotationDiff += Math.PI * 2

    butterfly.sprite.setRotation(currentRotation + rotationDiff * 0.05)
  }

  private spawnButterfly(): void {
    const sprite = this.scene.add
      .image(this.bounds.centerX, this.bounds.centerY, 'icon-Butterfly')
      .setOrigin(0.5)
      .setAlpha(0)
      .setTint(this.COLORS[Math.floor(Math.random() * this.COLORS.length)])

    const butterfly: Butterfly = {
      sprite,
      targetX: 0,
      targetY: 0,
      driftPhase: Math.random() * Math.PI * 2,
      driftOffset: { x: 0, y: 0 },
      restTimer: 0,
      isResting: false,
      fadeState: 'in',
      fadeValue: 0,
      restingRotation: 0,
    }

    this.pickNewTarget(butterfly)
    this.container.add(sprite)
    this.butterflies.push(butterfly)
  }

  private pickNewTarget(butterfly: Butterfly): void {
    butterfly.targetX = Phaser.Math.Between(20, this.bounds.width - 20)

    const upwardBias = Math.random() < 0.5
    const minY = upwardBias ? 20 : butterfly.sprite.y - 100
    const maxY = upwardBias
      ? Math.min(butterfly.sprite.y, this.bounds.height - 20)
      : this.bounds.height - 20

    butterfly.targetY = Phaser.Math.Between(minY, maxY)
  }
}
