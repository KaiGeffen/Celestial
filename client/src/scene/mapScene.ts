import 'phaser'
import { Scene } from 'phaser'

const CAMERA_POSITIONS = [
  { x: 1184, y: 754 },
  { x: 2948, y: 135 },
  { x: 3814, y: 1449 },
  { x: 377, y: 1749 },
  { x: 661, y: 3554 },
  { x: 3785, y: 3635 },
  { x: 2069, y: 2578 },
]

export default class MapScene extends Scene {
  map: Phaser.GameObjects.Image
  isDragging = false
  panDirection

  constructor() {
    super({ key: 'MapScene' })
  }

  create(): void {
    // Create the background map
    this.map = this.add.image(0, 0, 'journey-Map').setOrigin(0).setInteractive()
    this.enableDrag()

    // Bound camera on this map
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

    // Add scroll functionality
    this.enableScrolling()

    // Randomly select a camera position
    const pos = Phaser.Math.RND.pick(CAMERA_POSITIONS)
    this.cameras.main.scrollX = pos.x
    this.cameras.main.scrollY = pos.y
  }

  update(time, delta): void {
    super.update(time, delta)

    // If pointer is released, stop panning
    if (!this.input.activePointer.isDown) {
      this.panDirection = undefined
    }

    if (this.panDirection !== undefined) {
      MapScene.moveCamera(
        this.cameras.main,
        this.panDirection[0],
        this.panDirection[1],
      )
    }

    // Dragging
    if (this.isDragging && this.panDirection === undefined) {
      const camera = this.cameras.main
      const pointer = this.input.activePointer

      const dx = ((pointer.x - pointer.downX) * delta) / 100
      const dy = ((pointer.y - pointer.downY) * delta) / 100

      MapScene.moveCamera(camera, dx, dy)
    }
  }

  private enableScrolling(): void {
    let camera = this.cameras.main
    this.input.on(
      'gameobjectwheel',
      (pointer, gameObject, dx, dy, dz, event) => {
        MapScene.moveCamera(camera, dx, dy)
      },
    )
  }

  private enableDrag(): void {
    // Arrow pointing from the start of the drag to current position
    const arrow = this.scene.scene.add
      .image(0, 0, 'icon-Arrow')
      .setAlpha(0)
      .setScrollFactor(0)

    // Map can be dragged
    this.input
      .setDraggable(this.map)
      .on('dragstart', (event) => {
        this.isDragging = true
      })
      .on('drag', (event) => {
        const angle = Phaser.Math.Angle.Between(
          event.downX,
          event.downY,
          event.x,
          event.y,
        )
        arrow
          .setPosition(event.downX, event.downY)
          .setRotation(angle + Phaser.Math.DegToRad(90))
          .setAlpha(1)
      })
      .on('dragend', () => {
        this.isDragging = false
        arrow.setAlpha(0)
      })
  }

  private static moveCamera(camera, dx, dy): void {
    camera.scrollX = Math.max(0, camera.scrollX + dx)
    camera.scrollY = Math.max(0, camera.scrollY + dy)
  }
}
