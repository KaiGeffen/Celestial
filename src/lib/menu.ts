import "phaser"
import { Space, Color } from '../settings/settings'
import BaseScene from '../scene/baseScene'

// TODO Remove and convert all to the new menus implementation

export default class Menu {
	container: Phaser.GameObjects.Container

	// Callback called when menu closes
	onCloseCallback: () => void

	// Make x and y default to middle of screen
	constructor(scene: Phaser.Scene, width: number, height: number, visible: boolean = true, depth: number = 0) {
		// Esc key closes all menus
		let esc = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
		esc.on('down', function() {
			if (this.container.visible) {
				BaseScene.menuClosing = true

				this.close()
			}
		}, this)

		// Create a container for this menu
		let x = Space.windowWidth/2
		let y = Space.windowHeight/2
		this.container = scene.add.container(x, y).setVisible(visible).setDepth(depth)

		// Invisible background rectangles, stops other containers from being clicked
		let invisBackground = scene.add.rectangle(0, 0, Space.windowWidth * 30, Space.windowHeight * 30, 0x000000, 0.2).setOrigin(0.5)
		invisBackground.setInteractive()

		invisBackground.on('pointerdown', () => this.close())

		// Visible background, which does nothing when clicked
		let visibleBackground = scene.add['rexRoundRectangle'](0, 0, width, height, 30, Color.menuBackground,
			).setAlpha(0.95).setOrigin(0.5)
		visibleBackground.setInteractive()
		visibleBackground.setStrokeStyle(10, Color.menuBorder, 1)

		this.container.add([invisBackground, visibleBackground])
	}

	// Add gameobject(s) to this menu
	add(child: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[]): void {
		this.container.add(child)
	}

	// Open this menu
	open(): void {
		this.container.scene.sound.play('open')
		this.container.setVisible(true)
	}

	// Close this menu
	close(): void {
		this.container.scene.sound.play('close')

		this.container.setVisible(false)

		if (this.onCloseCallback !== undefined) {
			this.onCloseCallback()			
		}
	}

	// Destroy the menu and all objects within it
	destroy(): void {
		this.container.destroy()
	}

	// Set the callback which is made when the menu closes
	setOnClose(f: () => void): void {
		this.onCloseCallback = f
	}

	// Fit the menu to its contents
	layout(): void {
		// TODO
	}
}
