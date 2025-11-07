import 'phaser'

import { BaseMenuScene } from './baseScene'
import { Style, Color, Space, Time } from '../settings/settings'
import Menu, { createMenu } from './menu/menu'

// The scene showing whichever menu is open, if any
// This scene is on top of any other active open scenes
export default class MenuScene extends BaseMenuScene {
  // Whether the scene has started ending, to ensure it only does so once
  sceneEnding: boolean
  menu: Menu

  constructor() {
    super({
      key: 'MenuScene',
    })
  }

  init(params): void {
    // Start with no alpha, fade in
    const camera = this.cameras.main
    camera.alpha = 0

    this.tweens.add({
      targets: camera,
      alpha: 1,
      duration: Time.menuTransition,
    })
  }

  async create(params): Promise<void> {
    super.create(params)

    // Hide hint on all active scenes
    this.scene.manager.scenes.forEach((scene) => {
      if (scene.scene.isActive() && scene['hint']) {
        scene['hint'].hide()
      }
    })

    this.sceneEnding = false

    this.playSound('open')

    this.addBackground()

    this.menu = await createMenu(this, params.menu, params)

    // When esc is pressed, close this scene
    let esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    esc.on('down', () => {
      this.menu.close()
    })

    this.scene.bringToTop()
  }

  private addBackground() {
    // Invisible background rectangles, stops other containers from being clicked
    const invisBackground = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 0.7)
      .setInteractive()
      .on('pointerdown', () => this.menu.close())

    // Anchor in center taking up full screen
    this.plugins.get('rexAnchor')['add'](invisBackground, {
      x: `50%`,
      y: `50%`,
      width: `100%`,
      height: `100%`,
    })
  }

  endScene(): () => void {
    return () => {
      // Ensures that scene will only end (Sounds etc) once
      if (this.sceneEnding) {
        return
      }
      this.sceneEnding = true

      // NOTE This is a fix for sizer objects not deleting properly in all cases
      let top = this.children.getByName('top')
      if (top !== null) {
        top.destroy()
      }

      this.tweens.add({
        targets: this.cameras.main,
        alpha: 0,
        duration: Time.menuTransition,
        onStart: () => {
          this.playSound('close')
        },
        onComplete: () => {
          this.scene.stop()
        },
      })
    }
  }
}
