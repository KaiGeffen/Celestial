import 'phaser'

import { Color } from "../../settings/settings"
import Card from '../../lib/card'
import { CardImage } from '../../lib/cardImage'
import { Style, UserSettings, Space, Mechanics, Mobile } from "../../settings/settings"
import Buttons from '../../lib/buttons/buttons'
import Icons from '../../lib/buttons/icons'
import UButton from '../../lib/buttons/underlined'

import { BuilderBase } from '../builderScene'


const maxCostFilter: number = 7

// Filter region of the deck builder scene
export default class FilterRegion {  
	scene: BuilderBase

	// Full list of all cards in the catalog (Even those invisible)
	cardCatalog: CardImage[]

	// The costs and string that cards in the catalog are filtered for
	filterCostAry: boolean[] = []
	searchText: string = ""
	filterUnowned: boolean

	// Create this region, offset by the given width
	create(scene: BuilderBase, filterUnowned: boolean) {
		this.scene = scene
		this.filterUnowned = filterUnowned

		let that = this
		let container = scene.add.container().setDepth(2)

		this.createBackground(container)

		new Buttons.Text(container, Space.pad, 40, '<   Back', () => {scene.doBack()}).setOrigin(0, 0.5)

		this.createFilterButtons(container)

		this.createTextSearch(container)

		return this
	}

	private createBackground(container: Phaser.GameObjects.Container) {
		let background = this.scene.add.image(0, 0, 'icon-Search')
		.setOrigin(0)
		.setInteractive(new Phaser.Geom.Rectangle(0, 0, Space.windowWidth, Space.filterBarHeight), Phaser.Geom.Rectangle.Contains)

		container.add(background)
	}

	private createFilterButtons(container: Phaser.GameObjects.Container) {
		// Cost filters
		container.add(this.scene.add.text(645, 40, 'Cost:', Style.builder).setOrigin(1, 0.5))

		let btns = []
		for (let i = 0; i <= 7; i++) {
			let s = i === 7 ? '7+' : i.toString()
			let btn = new UButton(container, 670 + i * 41, 40, s)
			btn.setOnClick(this.onClickFilterButton(i, btns))

			btns.push(btn)
		}
		let btnX = new Icons.X(container, 1000, 40, this.onClearFilters(btns))
	}

	private createTextSearch(container: Phaser.GameObjects.Container) {
		// TODO Have an icon instead of full search bar on mobile
		if (Mobile) {
			return
		}

		let textboxSearch = this.scene.add['rexInputText'](
			215, 40, 308, 40, {
				type: 'text',
				text: this.searchText,
				placeholder: 'Search',
				tooltip: 'Search for cards by text.',
				fontFamily: 'Mulish',
				fontSize: '20px',
				color: Color.textboxText,
				maxLength: 40,
				selectAll: true,
				id: 'search-field'
			})
		.on('textchange', function(inputText) {
			// Filter the visible cards based on the text
			this.searchText = inputText.text
			this.scene.filter()
		}, this)
		.setOrigin(0, 0.5)

		textboxSearch.removeInteractive()

		container.add(textboxSearch)
	}

	private onClickFilterButton(thisI: number, btns: UButton[]): () => void {
      let that = this

      return function() {
        // Clear out all buttons
        for (let i = 0; i < btns.length; i++) {
          // Toggle this one, clear all others
          if (i === thisI) {
            btns[i].toggle()
            that.filterCostAry[i] = !that.filterCostAry[i]
          }
          else {
            btns[i].toggleOff()
            that.filterCostAry[i] = false
          }
        }

        that.scene.filter()
      }
    }

    private onClearFilters(btns: UButton[]): () => void {
      let that = this

      return function() {
        for (let i = 0; i < btns.length; i++) {
          btns[i].toggleOff()
          that.filterCostAry[i] = false
        }

        that.scene.filter()
      }
    }

	// Returns a function which filters cards to see which are selectable
	getFilterFunction(): (card: Card) => boolean {
		let that = this

		// Filter cards based on their cost
		let costFilter = function(card: Card): boolean {
			// If no number are selected, all cards are fine
			if (!that.filterCostAry.includes(true)) {
				return true
			}
			else {
				// The last filtered cost includes everything more than it
				return that.filterCostAry[Math.min(card.cost, maxCostFilter)]
			}
		}

		// Filter cards based on if they contain the string being searched
		let searchTextFilter = function(card: Card): boolean {
			// If searching for 'common', return false to uncommon cards
			if (that.searchText.toLowerCase() === 'common' && card.getCardText().toLowerCase().includes('uncommon')) {
				return false
			}
			return (card.getCardText()).toLowerCase().includes(that.searchText.toLowerCase())
		}

		// Filter cards based on whether you have unlocked them
		let ownershipFilter = function(card: Card): boolean {
			return !that.filterUnowned || UserSettings._get('inventory')[card.id]
		}

		// Filter based on the overlap of all above filters
		let andFilter = function(card: Card): boolean {
			return costFilter(card) && searchTextFilter(card) && ownershipFilter(card)
		}

		return andFilter
	}
}