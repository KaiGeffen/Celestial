import "phaser"
import BaseScene from './baseScene'
import { Style, Space, Color, UserSettings } from '../settings/settings'
import Button from "../lib/button"
import Menu from "../lib/menu"

import { getCard } from "../catalog/catalog"
import adventureData from "../adventure.json"
adventureData.reverse()


export default class AdventureScene extends BaseScene {
	// The scrollable panel that adventures are listed on
	panel: any

	constructor() {
		super({
			key: "AdventureScene"
		})
	}

	create(params): void {
		super.create()

		// Create the panel that displays all of the available adventures
		this.createPanel()

		// Make up pop-up for the card you just received, if there is one
		if (params.txt) {
			let menu = new Menu(
		      this,
		      1000,
		      240)

			let txt = this.add.text(0, 0, params.txt, Style.basic).setOrigin(0.5)

			menu.add(txt)

			params.txt = ''
		}
		if (params.scroll) {
			this.panel.childOY = params.scroll
		}
	}

	// Create the panel containing the missions
	private createPanel(): void {
		let that = this

		let x = Space.pad
		let y = Space.pad
		let width = Space.windowWidth - Space.pad*2
		let height = Space.windowHeight - Space.pad*2

		let fullPanel = this['rexUI'].add.scrollablePanel({
			x: x,
			y: y,
			width: width,
			height: height,

			scrollMode: 0,

			background: this['rexUI'].add.roundRectangle(x, 0, width, height, 16, Color.menuBackground, 0.7).setOrigin(0),

			panel: {
				child: this['rexUI'].add.fixWidthSizer({
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
				track: this['rexUI'].add.roundRectangle(0, 0, 20, 10, 10, 0xffffff),
				thumb: this['rexUI'].add.roundRectangle(0, 0, 0, 0, 16, Color.sliderThumb),
			},

			mouseWheelScroller: {
				  focus: false,
				  speed: 1
				},

				header: this['rexUI'].add.fixWidthSizer({
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
				this['rexUI'].add.roundRectangle(0, 0, 0, 0,
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

		this.addAdventureData(panel)

		fullPanel.layout()

		this.panel = fullPanel
	}

	// Add all of the missions to the panel
	private addAdventureData(panel): void {
		let that = this
		let completed = UserSettings._get('completedMissions')

		let unlockedMissions = adventureData.filter(function(mission) {
			// Return whether any of the necessary conditions have been met
			// Prereqs are in CNF (Or of sets of ands)
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

			let btn = new Button(that, 0, 0, `${name}`, that.missionOnClick(mission))
			panel.add(btn)
			panel.addNewLine()
		})
	}

	// Return the function for what happens when the given mission node is clicked on
	private missionOnClick(mission): () => void {
		let that = this

		if (mission.type === 'mission') {
			return function() {
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
					scroll: that.panel.childOY,
					txt: ''
				}

				let card = getCard(mission.card)
				if (card !== undefined) {
					params.txt = card.story
				}

				that.scene.start("AdventureScene", params)
			}
		}
	}
}
