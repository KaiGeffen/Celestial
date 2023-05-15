import "phaser"
import BaseScene from './baseScene'
import { Style, Space, Color, UserSettings, Time, BBStyle, Ease } from '../settings/settings'
import Buttons from "../lib/buttons/buttons"
import Button from "../lib/buttons/button"
import Icons from "../lib/buttons/icons"
import { CardImage } from "../lib/cardImage"

import { getCard } from "../catalog/catalog"
// import adventureData from "../adventure.json"
// adventureData.reverse()
import { adventureData } from "../adventures/adventure"


// TODO Remove the arrow images because drag is now default

// TODO Make consistent with Journey (Change adventure to journey or vice verca)
export default class AdventureScene extends BaseScene {
	panDirection

	map: Phaser.GameObjects.Image

	animatedBtns: Button[]

	incompleteIndicators: Button[] = []

	isDragging = false

	constructor() {
		super({
			key: "AdventureScene"
		})
	}

	create(params): void {
		super.create()

		// Create the background
		this.map = this.add.image(0, 0, 'story-Map')
			.setOrigin(0)
			.setInteractive()
		this.enableDrag()
		
		// Bound camera on this map
		this.cameras.main.setBounds(0, 0, this.map.width, this.map.height)

		// Add navigation arrows + zoom
		this.createNavigation()

		// Add button for help menu
		this.createHelpButton()

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
		const coords = UserSettings._get('adventureCoordinates')
		this.cameras.main.scrollX = coords.x
		this.cameras.main.scrollY = coords.y

		// Create indicators for where incomplete missions are
		this.createIncompleteIndicators()
	}

	update(time, delta): void {
		// If pointer is released, stop panning
		if (!this.input.activePointer.isDown) {
			this.panDirection = undefined
		}

		if (this.panDirection !== undefined) {
			AdventureScene.moveCamera(this.cameras.main, this.panDirection[0], this.panDirection[1])	
		}

		// Dragging
		if (this.isDragging && this.panDirection === undefined) {
			const camera = this.cameras.main
			const pointer = this.input.activePointer

			const dx = (pointer.x - pointer.downX) * delta / 100
			const dy = (pointer.y - pointer.downY) * delta / 100

			AdventureScene.moveCamera(camera, dx, dy)
		}
		
		// Switch the frame of the animated elements every frame
		// Go back and forth from frame 0 to 1
		[...this.animatedBtns, ...this.incompleteIndicators].forEach(btn => {
			// Switch every half second, roughly
			let frame = Math.floor(2 * time / 1000) % 2 === 0 ? 0 : 1
			btn.setFrame(frame)
		})

		// Adjust alpha/location of each indicator
		this.adjustIndicators()
	}

	private createNavigation(): void {
		const mag = 25
		const pad = 60

		// Create zoom in button
		// const camera = this.cameras.main
		// new Buttons.Basic(this,
		// 	Space.windowWidth - Space.buttonWidth/2 - Space.iconSize - Space.pad * 2,
		// 	Space.buttonHeight/2 + Space.pad,
		// 	'Zoom',
		// 	() => {
		// 		if (this.map.scale === 1) {
		// 			this.map.setScale(1/2)
		// 			camera.scrollX = camera.scrollX / 2
		// 			camera.scrollY = camera.scrollY / 2
		// 		}
		// 		else {
		// 			this.map.setScale(1)
		// 			camera.scrollX = camera.scrollX * 2
		// 			camera.scrollY = camera.scrollY * 2
		// 		}
		// 	}
		// )
		// .setNoScroll()
		// .setDepth(10)

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
				this.panDirection = arrow.direction
			})
			.setAlpha(0)
		}
	}

	private createHelpButton(): void {
		const x = Space.windowWidth - Space.buttonWidth/2 - (Space.iconSize + Space.pad * 2)
		const y = Space.buttonHeight/2 + Space.pad
		new Buttons.Basic(this, x, y, 'Help', () => {
			this.scene.launch('MenuScene', {
				menu: 'help',
				callback: () => {this.scene.start("TutorialGameScene", {isTutorial: false, deck: undefined, mmCode: `ai:t0`, missionID: 0})},
			})
		})
		.setDepth(10)
		.setNoScroll()	
	}

	// Create a popup for the card specified in params
	private createCardPopup(params): void {
		this.scene.launch('MenuScene', {
			menu: 'message',
			title: 'Card Unlocked!',
			s: params.txt,
			card: params.card,
		})

		// Clear params
		params.txt = ''
		params.card = undefined
	}

	// Create indicators for any incomplete nodes on the map out of the camera's view
	private createIncompleteIndicators(): void {
		this.incompleteIndicators = []
		this.animatedBtns.forEach(btn => {
			const indicator = new Buttons.Mission(this,
				0,
				0,
				() => {
					const camera = this.cameras.main
					camera.centerOn(btn.icon.x, btn.icon.y)
					AdventureScene.rememberCoordinates(camera)
				},
				'mission',
				true)
			.setNoScroll()

			this.incompleteIndicators.push(indicator)
		})
	}

	// Create a stillframe animation specified in params
	private createStillframe(params): void {
		// TODO Make dry with the searching tutorial class implementation

		// Height of the tutorial text
		const TEXT_HEIGHT = 225

		let container = this.add.container().setDepth(11)

		let img = this.add.image(Space.windowWidth/2, 0, `story-Story 4`)
		.setOrigin(0.5, 0)
		.setInteractive()

		// Ensure that image fits perfectly in window
		const scale = Space.windowWidth / img.displayWidth
		img.setScale(scale)

		// Text background
		let background = this.add.rectangle(0, Space.windowHeight - TEXT_HEIGHT, Space.windowWidth, TEXT_HEIGHT, Color.backgroundLight)
		.setOrigin(0)
		.setAlpha(0.8)
		this.plugins.get('rexDropShadowPipeline')['add'](background, {
			distance: 3,
			shadowColor: 0x000000,
		})

		// Add text
		let txt = this.add.text(0, 0, '', Style.stillframe)

		const s = "Impressive, all that life, all that wonder. You are welcomed in of course."//" But if I might share one thing that I've learned in my time here... It's that someday, everything blows away."

		let textbox = this.rexUI.add.textBox({
			text: txt,
			x: Space.pad,
			y: background.y,
			space: {
				left: Space.pad,
				right: Space.pad,
				top: Space.pad,
				bottom: Space.pad,
			},
		})
		.start(s, 50)
		.setOrigin(0)

		container.add([img, background, txt, textbox])

		// Add an okay button
		let btn = new Buttons.Basic(
			container,
			Space.windowWidth - Space.pad - Space.buttonWidth/2,
			Space.windowHeight - Space.pad - Space.buttonHeight/2,
			'Continue',
			() => {
				// If typing isn't complete, complete it
				if (textbox.isTyping) {
					textbox.stop(true)
				}
				// Otherwise move on to the next frame
				else {
					this.tweens.add({
						targets: container,
						alpha: 0,
						duration: Time.stillframeFade,
						onComplete: () => {
							container.setVisible(false)
							container.alpha = 1
						}
					})

					// Allow scrolling once the stillframe is gone
					this.enableScrolling()

					// Open a pop-up window explaining adventure / normal modes
					this.scene.launch('MenuScene', {
						menu: 'confirm',
						callback: () => {
							this.scene.start('HomeScene')
						},
						text: "Having completed the tutorial, you'll now return to the title screen where you can either continue this adventure or build and play a deck with all of the cards unlocked.\n\nThis adventure slowly introduces you to the cards and characters over 4-10 hours of gameplay.\n\nPress 'esc' or click the gear icon in the upper-right at any time to exit or adjust settings, and please let us know any of your thoughts in the Discord.\n\nThanks so much for playing!",
					})
				}
			})

		// Scroll the image going down
		this.add.tween({
			targets: img,
			duration: 6000,
			ease: Ease.stillframe,
			y: Space.windowHeight - img.displayHeight,
			onStart: () => {
				img.y = 0
			},
		})

		// Set the param to undefined so it doesn't persist
		params.stillframe = undefined

		// Reposition the stillframe to be visible to the camera
		const coords = UserSettings._get('adventureCoordinates')
		container.setPosition(
			coords.x,
			coords.y)
	}

	// Add all of the missions to the panel
	private addAdventureData(): void {
		let that = this
		let completed: boolean[] = UserSettings._get('completedMissions')

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
		this.animatedBtns = []
		unlockedMissions.filter(mission => {
			if (mission.type === 'tutorial') {
				return false
			}

			return true
		}).forEach(mission => {
			// Get the string for this adventure
			let id = mission.id			

			// For now, it's all either the waving figure or ? icon
			const nodeType = mission.type === 'mission' ? 'Mission' : 'QuestionMark'
			let btn = new Buttons.Mission(that,
				mission.x,
				mission.y,
				that.missionOnClick(mission),
				nodeType)

			// If user hasn't completed this mission, animate it
			if (!completed[mission.id]) {
				this.animatedBtns.push(btn)
			}
			else {
				btn.setAlpha(0.5)
			}
		})
	}

	// Return the function for what happens when the given mission node is clicked on
	private missionOnClick(mission): () => void {
		// if (mission.type === 'tutorial') {
		// 	return this.doTutorial(mission)
		// }
		// else 
		if (mission.type === 'mission') {
			return () => {
				this.scene.start("AdventureBuilderScene", mission)
			}
		}
		else if (mission.type === 'card') {
			return () => {
				UserSettings._setIndex('inventory', mission.card, true)

				// Complete this mission
				UserSettings._setIndex(
					'completedMissions',
					mission.id,
					true)

				// TODO Clean this impl
				let params = {
					txt: '',
					card: undefined
				}

				let card = getCard(mission.card)
				if (card !== undefined) {
					params.txt = card.story
					params.card = card
				}

				this.scene.start("AdventureScene", params)
			}
		}
	}

	private enableScrolling(): void {
		let camera = this.cameras.main

		this.input.on('gameobjectwheel', (pointer, gameObject, dx, dy, dz, event) => {
			AdventureScene.moveCamera(camera, dx, dy)
		})
	}

	private enableDrag(): void {
		// Map can be dragged
		this.input.setDraggable(this.map)
		.on('dragstart', () => {
			this.isDragging = true
		})
		.on('dragend', () => {
			this.isDragging = false
		})
	}

	private adjustIndicators(): void {
		// Find the intersection between a line from the btn to camer's center
		const camera = this.cameras.main
		const rect = camera.worldView

		// Adjust each indicator
		for (let i = 0; i < this.animatedBtns.length; i++) {
			const btn = this.animatedBtns[i]

			// TODO Use set bounds of camera to lock it to the map image instead of math
			const line = new Phaser.Geom.Line(btn.icon.x, btn.icon.y, camera.scrollX + camera.centerX, camera.scrollY + camera.centerY)

			const intersects = Phaser.Geom.Intersects.GetLineToRectangle(line, rect)

			// If btn is on screen, hide this button's indicator indicator
			if (intersects.length === 0) {
				this.incompleteIndicators[i].setAlpha(0)
			}
			// Otherwise, place the indicator at the intersection of worldview and line to camera's center
			else {
				const intersect = intersects[0]

				this.incompleteIndicators[i].setAlpha(1)
				.setPosition(
					intersect.x - camera.scrollX,
					intersect.y - camera.scrollY)
			}
		}
	}

	private static moveCamera(camera, dx, dy): void {
		camera.scrollX = Math.max(0, camera.scrollX + dx)
		camera.scrollY = Math.max(0, camera.scrollY + dy)

		// Remember the camera position
		AdventureScene.rememberCoordinates(camera)
	}

	// Remember the position of the camera so the next time this scene launches it's in the same place
	private static rememberCoordinates(camera): void {
		UserSettings._set('adventureCoordinates',
		{
			x: camera.scrollX,
			y: camera.scrollY,
		})
	}
}
