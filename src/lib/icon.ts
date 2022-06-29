import "phaser"
import { Style, Color, Space } from '../settings/settings'
import Menu from "../lib/menu"


export default class Icon {
	btn: Phaser.GameObjects.Image
	txt: Phaser.GameObjects.Text

	constructor(scene: Phaser.Scene, menu: Menu, x: number, y: number, text: string, f: () => void) {
		this.btn = scene.add.image(x, y, 'icon-' + text)

		this.btn.setInteractive()
		.on('pointerdown', () => {
			f()
		})
		.on('pointerover', () => {
			this.btn.setTint(Color.iconHighlight)
		})
		.on('pointerout', () => {
			this.btn.clearTint()
		})

		// Add a label above the icon
		let yDelta = Space.cardSize - Space.pad
    	this.txt = scene.add.text(x, y - yDelta, text, Style.announcement).setOrigin(0.5)

    	// Add both to the container
    	menu.add([this.btn, this.txt])
	}

	// Set this icon as 'locked'
	lock(): void {
		this.txt.setText('???').setAlpha(0.3)

		this.btn.setAlpha(0.3).removeInteractive()
	}
}
