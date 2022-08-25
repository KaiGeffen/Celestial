import "phaser"
import { Style, Color } from '../../settings/settings'
import MenuScene from '../menuScene'


export default class Menu {
	scene: MenuScene
	exitCallback: () => void

	constructor(scene: MenuScene, params?) {
		this.scene = scene

		if (params) {
			this.exitCallback = params.exitCallback
		}
	}

	close() {
		if (this.exitCallback) {
			this.exitCallback()
		}

		this.scene.endScene()()
	}

	createHeader(s: string, width: number): any {
		let background = this.scene.add.rectangle(0, 0, 1, 1, Color.background2)
		
		let sizer = this.scene['rexUI'].add.sizer({width: width})
		.addBackground(background)

		let txt = this.scene.add.text(0, 0, s, Style.announcement)
		sizer.addSpace()
		.add(txt)
		.addSpace()

		// Add a drop shadow going down from the background
		this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
			distance: 3,
			angle: -90,
			shadowColor: 0x000000,
		})

		return sizer
	}
}


import OptionsMenu from "./optionsMenu"
import ChoosePremade from "./choosePremade"
import CreditsMenu from "./credits"
import RulebookMenu from "./rulebook"
// TODO Rename since it includes both
import { NewDeckMenu, EditDeckMenu } from "./newDeck"
import ShareDeckMenu from "./shareDeck"
import PasteMenu from "./paste"
import ModeMenu from "./mode"
import DCMenu from './disconnect'
import ConfirmMenu from './confirm'
import SearchMenu from './search'
import DistributionMenu from './distribution'


const menus = {
	'options': OptionsMenu,
	'choosePremade': ChoosePremade,
	'credits': CreditsMenu,
	'rulebook': RulebookMenu,
	'newDeck': NewDeckMenu,
	'shareDeck': ShareDeckMenu,
	'paste': PasteMenu,
	'mode': ModeMenu,
	'editDeck': EditDeckMenu,
	'disconnect': DCMenu,
	'confirm': ConfirmMenu,
	'search': SearchMenu,
	'distribution': DistributionMenu,
}

// Allows for the creation and storing of custom menus not specified 
// in separate ts files
export function createMenu(scene: Phaser.Scene, title: string, params): Menu {
	// Check if the given menu exists, if not throw
	if (!(title in menus)) {
		throw `Given menu ${title} is not in list of implemented menus.`
	}

	return new menus[title](scene, params)
}


// export default class Menu {
// 	contents: Phaser.GameObjects.GameObject[]

// 	constructor(scene: Phaser.Scene) { }

// 	// Function for what happens when menu closes
// 	onClose(): void { }
// }

// import OptionsMenu from "./optionsMenu"
// import PremadeDecks from "./premadeDecks"


// const menus = {
// 	'options': OptionsMenu,
// 	'premadeDecks': PremadeDecks
// }

// // Allows for the creation and storing of custom menus not specified 
// // in separate ts files
// export function createMenu(scene: Phaser.Scene, title: string) {
// 	// Check if the given menu exists, if not throw
// 	if (!(title in menus)) {
// 		throw `Given menu ${title} is not in list of implemented menus.`
// 	}

// 	new menus[title](scene)
// }
