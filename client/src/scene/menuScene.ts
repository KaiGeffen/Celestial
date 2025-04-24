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

  create(params): void {
    super.create(params)

    this.sceneEnding = false

    this.playSound('open')

    this.addBackground()

    this.menu = createMenu(this, params.menu, params)

    // When esc is pressed, close this scene
    let esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    esc.on('down', () => {
      this.menu.close()
    })

    this.scene.bringToTop()

    this.transitionIn()
  }

  // Play a transition as this menu opens
  transitionIn(): void {
    const camera = this.cameras.main

    this.tweens.add({
      targets: camera,
      alpha: 1,
      duration: Time.menuTransition,
      onStart: () => {
        camera.alpha = 0
      },
    })
  }

  private addTitle(s: string) {
    this.add
      .text(
        Space.windowWidth / 2,
        Space.windowHeight / 2 - 150,
        s,
        Style.menuTitle,
      )
      .setOrigin(0.5)
  }

  private addMessage(s: string) {
    this.add
      .text(Space.windowWidth / 2, Space.windowHeight / 2, s, Style.basic)
      .setOrigin(0.5)
  }

  private addBackground() {
    const x = Space.windowWidth / 2
    const y = Space.windowHeight / 2

    // Invisible background rectangles, stops other containers from being clicked
    let invisBackground = this.add.rectangle(
      x,
      y,
      Space.windowWidth,
      Space.windowHeight,
      0x000000,
      0.7,
    )
    invisBackground.setInteractive()
    invisBackground.on('pointerdown', () => {
      this.menu.close()
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
