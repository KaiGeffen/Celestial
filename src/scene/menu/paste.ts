import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import avatarNames from '../../lib/avatarNames'
import Buttons from '../../lib/buttons/buttons'
import Button from '../../lib/buttons/button'
import { Color, Space, Style, Mechanics } from '../../settings/settings'
import Menu from './menu'
import MenuScene from '../menuScene'


const width = 500
const inputTextWidth = 400

export default class PasteMenu extends Menu {
	deckCode: string

	constructor(scene: MenuScene, params) {
		super(scene, width)

		this.createContent(params.callback)

		this.layout()
	}

	// private createSizer(scene: Phaser.Scene)  {
	// 	let panel = scene['rexUI'].add.fixWidthSizer(
	// 	{
	// 		x: Space.windowWidth/2,
	// 		y: Space.windowHeight/2,
	// 		width: width,

	// 		align: 'center',
	// 		space: {
	// 			bottom: Space.padSmall,
	// 			line: Space.pad,

	// 		},
	// 	}
	// 	)

	// 	// Add background
	// 	let rect = scene['rexUI'].add.roundRectangle(0, 0, 0, 0, Space.corner, Color.background, 1).setInteractive()
	// 	panel.addBackground(rect)

	// 	return panel
	// }

	private createContent(createCallback: (name: string, avatar: number, deckCode?: string) => void) {
		this.sizer.add(this.createHeader('Paste Deck Code', width))
		.addNewLine()

		const padding = {space: {
			left: Space.pad,
			right: Space.pad,
		}}

		// Add hint
		let txtHint = this.scene.add.text(0, 0, 'Paste your deck code here:', Style.basic)
		this.sizer.add(txtHint, padding)
		.addNewLine()

		this.sizer.add(this.createField(), padding)
		.addNewLine()

		this.sizer.add(this.createButtons(createCallback), padding)
	}

	private createField() {
		let that = this

		let sizer = this.scene['rexUI'].add.sizer({width: width})
		sizer.addSpace()

		let inputText = this.scene.add['rexInputText'](
			0, 0, inputTextWidth, 40, {
				type: 'text',
				text: '',
				placeholder: 'Deck code',
				tooltip: 'Copy/paste deck codes here.',
				fontFamily: 'Mulish',
				fontSize: '20px',
				color: Color.textboxText,
				backgroundColor: Color.textboxBackground,
				maxLength: 4 * Mechanics.deckSize,
				selectAll: true,
			}).on('textchange', function(inputText) {
   				// Set the deck code to the given string
   				that.deckCode = inputText.text
   			})

		sizer.add(inputText)
		.addSpace()

		return sizer
	}

	// Create the buttons at the bottom which navigate to other scenes/menus
	private createButtons(createCallback: (name: string, avatar: number, deckCode?: string) => void) {
		let sizer = this.scene['rexUI'].add.sizer({
			width: width - Space.pad * 2,
			space: {
				item: Space.pad
			}
		})

		sizer
		.add(this.createCancel())
		.addSpace()
		.add(this.createConfirm(createCallback))

		return sizer
	}

	private createCancel() {
		let container = new ContainerLite(this.scene, 0, 0, Space.smallButtonWidth, Space.smallButtonHeight)

		new Buttons.Basic(container, 0, 0, 'Cancel', () => {
			this.scene.scene.stop()
		})

		return container
	}

	private createConfirm(createCallback: (name: string, avatar: number, deckCode?: string) => void) {
		let container = new ContainerLite(this.scene, 0, 0, Space.smallButtonWidth, Space.smallButtonHeight)

		new Buttons.Basic(container, 0, 0, 'Create', () => {
			createCallback('PASTED', 0, this.deckCode)

			// Close this scene
			this.scene.scene.stop()
		})

		return container
	}
}
