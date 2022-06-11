import "phaser"

import Region from './baseRegion'

import { Space, Color, Style, Depth } from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
// import { CardImage } from '../../lib/cardImage'
// import { cardback } from '../../catalog/catalog'
import ClientState from '../../lib/clientState'
// import { Animation, Zone } from '../../lib/animation'
import BaseScene from '../baseScene'


export default class ResultsRegion extends Region {
	// Whether the results have been seen already
	seen: boolean

	create (scene: BaseScene): ResultsRegion {
		let that = this

		this.scene = scene
		this.container = scene.add.container(0, 0).setDepth(Depth.results)
		this.seen = false

		// Create background
		let background = scene.add.rectangle(0, 0,
			Space.windowWidth, Space.windowHeight,
			Color.darken, 0.9
			)
		.setOrigin(0)
		.setInteractive()
		.on('pointerdown', () => {that.container.setVisible(false)})
		this.container.add(background)

		// Images
		this.createImages(scene)

		// Buttons 
		this.createButtons()

		return this
	}

	displayState(state: ClientState, isRecap: boolean): void {
		this.deleteTemp()

		// If the game isn't over, hide this
		if (state.winner === null) {
			this.hide()
			return
		}

		// If we are in a recap, hide this
		if (isRecap) {
			this.hide()
			return
		}

		// If the results have been shown before, hide this
		if (this.seen) {
			this.hide()
			return
		}

		this.show()
		this.seen = true
	}

	private createButtons() {
		let that = this

		// Exit
		let x = Space.pad + Space.largeButtonWidth/2
		let y = Space.windowHeight - (Space.pad + Space.largeButtonHeight/2)
		new Buttons.Basic(this.container, x, y, 'Exit', this.exitCallback())

		// New match
		new Buttons.Basic(this.container, Space.windowWidth/2, y, 'New Match', this.newMatchCallback())
		
		// TODO Hint
		// let txtHint = this.scene.add.text(
		// 	Space.windowWidth/2,
		// 	y - Space.largeButtonHeight/2,
		// 	'With the same deck',
		// 	Style.small
		// 	).setOrigin(0.5, 0)
		// this.container.add(txtHint)
		

		// Review
		new Buttons.Basic(this.container, Space.windowWidth - x, y, 'Review', this.reviewCallback())
	}

	private createImages(scene: Phaser.Scene) {
		// Winner
		let winner = scene.add.image(Space.windowWidth/2,
			Space.windowHeight/2,
			'icon-Winner'
			).setInteractive()
		this.container.add(winner)

		// Loser
		let loser = scene.add.image(Space.pad,
			Space.windowHeight/2,
			'icon-Loser'
			).setOrigin(0, 0.5).setInteractive()
		this.container.add(loser)

		// Stats
		let stats = scene.add.image(Space.windowWidth - Space.pad,
			0,
			'icon-ResultStats'
			).setOrigin(1, 0).setInteractive()
		this.container.add(stats)
	}

	private exitCallback(): () => void {
		let that = this
		return function() {
			that.scene.doBack()
		}
	}

	private newMatchCallback(): () => void {
		let that = this
		return function() {
			// Restarts the game scene with same arguments (Deck, matchmaking, etc)
			that.scene.scene.restart()
		}
	}

	private reviewCallback(): () => void {
		let that = this
		return function() {
			that.hide()
		}
	}
}