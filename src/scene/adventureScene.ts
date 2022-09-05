import "phaser"
import BaseScene from './baseScene'
import { Style, Space, Color, UserSettings, Time, BBStyle, Ease } from '../settings/settings'
import Buttons from "../lib/buttons/buttons"
import Icons from "../lib/buttons/icons"
import Menu from "../lib/menu"
import { CardImage } from "../lib/cardImage"

import { getCard } from "../catalog/catalog"
// import adventureData from "../adventure.json"
// adventureData.reverse()
import { adventureData } from "../adventures/adventure"

const MAP_WIDTH = 3900
const MAP_HEIGHT = 2700

// TODO Make consistent with Journey (Change adventure to journey or vice verca)
export default class AdventureScene extends BaseScene {
	params = {scrollX: 0, scrollY: 0};

	panDirection

	constructor() {
		super({
			key: "AdventureScene"
		})
	}

	create(params): void {
		super.create()

		this.params = params

		// Create the background
		this.add.image(0, 0, 'bg-Map')
			.setOrigin(0)
			.setInteractive()

		// Add navigation arrows
		this.createArrows()

		// Add all of the available nodes
		this.addAdventureData()

		if (params.stillframe !== undefined) {
			this.createStillframe(params)
		}
		else {
			// Add scroll functionality by default if not showing a stillframe
			this.enableScrolling()
		}

		// Make up pop-up for the card you just received, if there is one
		if (params.card) {
			this.createCardPopup(params)
		}

		// Scroll to the given position
		if (params.scrollX !== undefined) {
			this.cameras.main.scrollX = params.scrollX
			this.cameras.main.scrollY = params.scrollY
		}
	}

	update(): void {
		// If pointer is released, stop panning
		if (!this.input.activePointer.isDown) {
			this.panDirection = undefined
		}

		if (this.panDirection !== undefined) {
			AdventureScene.moveCamera(this.cameras.main, this.panDirection[0], this.panDirection[1])
		}
	}

	// Create the panel containing the missions
	private createPanel(): void {
		let that = this

		let x = Space.pad
		let y = Space.pad
		let width = Space.windowWidth - Space.pad*2
		let height = Space.windowHeight - Space.pad*2

		let fullPanel = this.rexUI.add.scrollablePanel({
			x: x,
			y: y,
			width: width,
			height: height,

			scrollMode: 0,

			background: this.rexUI.add.roundRectangle(x, 0, width, height, 16, Color.menuBackground, 0.7).setOrigin(0),

			panel: {
				child: this.rexUI.add.fixWidthSizer({
					space: {
						// left: Space.pad,
						right: Space.pad - 10,
						top: Space.pad - 10,
						bottom: Space.pad - 10,
						// item: Space.pad,
						line: Space.pad,
					}
				})
			},

			slider: {
				input: 'drag',
				track: this.rexUI.add.roundRectangle(0, 0, 20, 10, 10, 0xffffff),
				thumb: this.rexUI.add.roundRectangle(0, 0, 0, 0, 16, Color.sliderThumb),
			},

			mouseWheelScroller: {
				  focus: false,
				  speed: 1
				},

				header: this.rexUI.add.fixWidthSizer({
					height: 100,
					align: 'center',
					space: {
						left: Space.pad,
						right: Space.pad,
						top: Space.pad,
						bottom: Space.pad,
						item: Space.pad,
						line: Space.pad
					}
				}).addBackground(
				this.rexUI.add.roundRectangle(0, 0, 0, 0,
					{tl: 0, tr: 16, bl: 0, br: 16},
					Color.menuHeader),
				{right: 10, bottom: 10}
				),

				space: {
					right: 10,
					left: 10,
					top: 10,
					bottom: 10,
				}
			}).setOrigin(0)
		.layout()
		let panel = fullPanel.getElement('panel')

		this.addAdventureData()

		fullPanel.layout()
	}

	private createArrows(): void {
		let that = this

		const mag = 25
		const pad = 60

		// Details for each arrow (North, East, South, West)
		const arrows = [
			{
				x: Space.windowWidth/2,
				y: pad,
				direction: [0, -mag]
			},
			{
				x: Space.windowWidth - pad,
				y: Space.windowHeight/2,
				direction: [mag, 0]
			},
			{
				x: Space.windowWidth/2,
				y: Space.windowHeight - pad,
				direction: [0, mag]
			},
			{
				x: pad,
				y: Space.windowHeight/2,
				direction: [-mag, 0]
			},
		]

		for (let i = 0; i < arrows.length; i++) {
			const arrow = arrows[i]

			let icon = new Icons.Arrow(this, arrow.x, arrow.y, i)
			.setDepth(10)
			.setNoScroll()
			.setOnClick(() => {
				that.panDirection = arrow.direction
			})
		}
	}

	// Create a popup for the card specified in params
	private createCardPopup(params): void {
		const width = 1000
		const height = 250
		let menu = new Menu(
			this,
			width,
			height)

		let txt = this.add.text(0, 0, params.txt, Style.flavor).setOrigin(0)
		let icon = this.add.image(0, 0, params.card.name) //new CardImage(params.card, menu.container).image//
		let textBox = this.rexUI.add.textBox({
			x: 0,
			y: 0,
			width: width,
			height: height,
			icon: icon,
			space: {
				left: Space.pad,
				right: Space.pad,
				top: Space.pad,
				bottom: Space.pad,
				icon: Space.pad
			},
			text: txt
		}).setOrigin(0.5)

		textBox.start(params.txt, Time.vignetteSpeed())

		menu.add([txt, icon, textBox])

		// Reposition the menu to be visible to the camera
		if (params.scrollX !== undefined && params.scrollY !== undefined) {
			menu.container.setPosition(
				params.scrollX + Space.windowWidth / 2,
				params.scrollY + Space.windowHeight / 2)
		}

		params.txt = ''
		params.card = undefined
	}

	// Create a stillframe animation specified in params
	private createStillframe(params): void {
		// TODO Make dry with the searching tutorial class implementation

		let container = this.add.container().setDepth(11)

		let img = this.add.image(Space.windowWidth/2, 0, `bg-Story 4`)
		.setOrigin(0.5, 0)
		.setInteractive()

		// Ensure that image fits perfectly in window
		const scale = Space.windowWidth / img.displayWidth
		img.setScale(scale)

		// Add text
		let txt = this.add.text(0, 0, '', Style.stillframe)

		const s = "Impressive, all that life, all that wonder. You are welcomed in of course. But if I might share one thing that I've learned in my time here... It's that someday, everything blows away."

		let background = this.rexUI.add.roundRectangle(0, 0, 100, 100, 10, 0x000000, 0.5)

		let textbox = this.rexUI.add.textBox({
			text: txt,
			x: Space.pad,
			y: Space.pad,
			space: {
				left: Space.pad,
				right: Space.pad,
				top: Space.pad,
				bottom: Space.pad,
			},
			// width: Space.stillframeTextWidth,
			background: background,
		})
		.start(s, 50)
		.setOrigin(0)

		container.add([img, background, txt, textbox])

		// Add an okay button
		let btn = new Buttons.Basic(
			container,
			Space.windowWidth - Space.pad - Space.largeButtonWidth/2,
			Space.windowHeight - Space.pad - Space.largeButtonHeight/2,
			'Continue',
			() => {
				container.setVisible(false)

				// Allow scrolling once the stillframe is gone
				this.enableScrolling()
			})
		.disable()

		// Scroll the image going down
		this.add.tween({
			targets: img,
			duration: 6000,
			ease: Ease.stillframe,
			y: Space.windowHeight - img.displayHeight,
			onStart: () => {
				img.y = 0
			},
			onComplete: () => {
				btn.enable()
			}
		})

		// Set the param to undefined so it doesn't persist
		params.stillframe = undefined
	}

	// Add all of the missions to the panel
	private addAdventureData(): void {
		let that = this
		let completed = UserSettings._get('completedMissions')

		let unlockedMissions = adventureData.filter(function(mission) {
			// Return whether any of the necessary conditions have been met
			// Prereqs are in CNF (Or of sets of Ands)
			return mission.prereq.some(function(prereqs, _) {
				return prereqs.every(function(id, _) {
					return completed[id]
				})
			})
		})

		// Add each of the adventures as its own line
		unlockedMissions.forEach(mission => {
			// Get the string for this adventure
			let id = mission.id

			// If it has been completed, filled in star, otherwise empty star
			let name = completed[id] ? '★' : '☆'
			name += mission.type === 'card' ? '🂡' : ''
			name += mission.name

			let btn = new Buttons.Basic(that,
				mission.x,
				mission.y,
				`${name}`,
				that.missionOnClick(mission))
		})
	}

	// Return the function for what happens when the given mission node is clicked on
	private missionOnClick(mission): () => void {
		let that = this

		if (mission.type === 'tutorial') {
			return function() {
				that.params.scrollX = that.cameras.main.scrollX
				that.params.scrollY = that.cameras.main.scrollY
    			that.scene.start("TutorialGameScene", {isTutorial: false, deck: undefined, mmCode: `ai:t${mission.id}`, missionID: mission.id})
			}
		}
		else if (mission.type === 'mission') {
			return function() {
				that.params.scrollX = that.cameras.main.scrollX
				that.params.scrollY = that.cameras.main.scrollY
				that.scene.start("AdventureBuilderScene", mission)
			}
		}
		else if (mission.type === 'card') {
			return function() {
				UserSettings._setIndex('inventory', mission.card, true)

				// Complete this mission
				UserSettings._setIndex(
					'completedMissions',
					mission.id,
					true)

				// TODO Clean this impl
				let params = {
					scrollX: that.cameras.main.scrollX,
					scrollY: that.cameras.main.scrollY,
					txt: '',
					card: undefined
				}

				let card = getCard(mission.card)
				if (card !== undefined) {
					params.txt = card.story
					params.card = card
				}

				that.scene.start("AdventureScene", params)
			}
		}
		// else if (mission.type === 'tutorial') {
		// 	return function() {
		// 		that.scene.start("AdventureBuilderScene", mission)
		// 	}
		// }
	}

	private enableScrolling(): void {
		let camera = this.cameras.main

		this.input.on('gameobjectwheel', function(pointer, gameObject, dx, dy, dz, event) {
			AdventureScene.moveCamera(camera, dx, dy)
		})
	}

	private static moveCamera(camera, dx, dy): void {
		camera.scrollX = Math.min(
			MAP_WIDTH - Space.windowWidth,
			Math.max(0, camera.scrollX + dx)
			)
		camera.scrollY = Math.min(
			MAP_HEIGHT - Space.windowHeight,
			Math.max(0, camera.scrollY + dy)
			)
	}
}
