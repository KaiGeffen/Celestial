import 'phaser';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js';
import premadeDecklists from '../../catalog/premadeDecklists';
import avatarNames from '../../lib/avatarNames';
import Button from '../../lib/buttons/button';
import Buttons from '../../lib/buttons/buttons';
import Cutout from '../../lib/buttons/cutout';
import Icons from '../../lib/buttons/icons';
import Card from '../../lib/card';
import { decodeCard } from '../../lib/codec';
import { Color, Mechanics, Space, Style, Time, Mobile, Scroll } from '../../settings/settings';


const width = Space.deckPanelWidth// + Space.pad * 2

export default class DeckRegion {
	private scene

	// The panel within which all of the cards are
	private panel
	private scrollablePanel
	// Panel populated with cutouts of cards user has chosen
	private chosenPanel

	// Button allowing user to Start, or showing the count of cards in their deck
	private btnStart: Button

	// Deck of cards in user's current deck
	private deck: Cutout[] = []

	// The avatar button
	private avatar: Button

	private txtChoice: Phaser.GameObjects.Text

	create(scene: Phaser.Scene, startCallback: () => void) {
		this.scene = scene

		this.createScrollable(startCallback)

		return this
	}

	private createScrollable(startCallback: () => void) {
		let background = this.scene.add.image(0, 0, 'bg-Texture')

		this.scrollablePanel = this.scene['rexUI'].add.scrollablePanel({
			x: 0,
			y: 0,
			width: width,
			height: Space.windowHeight,

			background: background,

			panel: {
				child: this.createPanel(startCallback)
			},

			header: Mobile ? undefined : this.createHeader(startCallback),

			slider: Mobile ? Scroll(this.scene) : undefined,

			space: {
				top: Space.filterBarHeight,
			},
			}).setOrigin(0)

		this.updateOnScroll(this.panel, this.scrollablePanel)

		// If on mobile, header scrolls with the rest of content
		if (Mobile) {
			this.createHeader(startCallback, this.panel)
		}

		this.scrollablePanel.layout()

		this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
			distance: 3,
			shadowColor: 0x000000,
		})

		return this.scrollablePanel
	}

	private createPanel(startCallback: () => void): Phaser.GameObjects.GameObject {
		this.panel = this.scene['rexUI'].add.fixWidthSizer()

		return this.panel
	}

	private createHeader(startCallback: () => void, sizer?): Phaser.GameObjects.GameObject {
		if (sizer === undefined) {
			let background = this.scene.add.rectangle(0, 0, 1, 1, Color.background2)

			sizer = this.scene['rexUI'].add.fixWidthSizer({
				space: {
					top: Space.pad,
					bottom: Space.pad,
				}
			})
			.addBackground(background)

			// Add a drop shadow going down from the background
			this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
				distance: 3,
				angle: -90,
				shadowColor: 0x000000,
			})
		}

		// Start button - Show how many cards are in deck, and enable user to start if deck is full
		let containerStart = new ContainerLite(this.scene, 0, 0, width/2, Space.avatarSize)
		this.btnStart = new Buttons.Basic(containerStart, 0, 0, '0/15', startCallback)
		sizer.add(containerStart)
		
		// Add this deck's avatar
		let containerAvatar = new ContainerLite(this.scene, 0, 0, width/2, Space.avatarSize)
		this.avatar = new Buttons.Avatar(containerAvatar, 0, 0, 'Jules') // TODO
		this.avatar['setEmotive']()
		sizer.add(containerAvatar)

		return sizer
	}

	// Add the given card and return the created cardImage
	addCardToDeck(card: Card, panel = this.chosenPanel): boolean {
		let totalCount = 0
		this.deck.forEach(cutout => {
			totalCount += cutout.count
		})

		if (totalCount  >= Mechanics.deckSize) {
			return false
		}

		// If this card exists in the deck already, increment it
		let alreadyInDeck = false
		this.deck.forEach(cutout => {
			if (cutout.name === card.name && !cutout.required) {
				cutout.increment()
				alreadyInDeck = true
			}
		})

		if (!alreadyInDeck) {
			// If it doesn't, create a new cutout
			let container = new ContainerLite(this.scene, 0, 0, Space.deckPanelWidth, Space.cutoutHeight) // TODO
			let cutout = new Cutout(container, card)
			cutout.setOnClick(this.removeCardFromDeck(cutout))

			// Add the container in the right position in the panel
			let index = this.addToPanelSorted(container, card, panel)

			this.scrollablePanel.layout()

			this.deck.splice(index, 0, cutout)
		}
		
		// Update start button to reflect new amount of cards in deck
		this.updateText()

		return true
	}

	// Set the current deck, and return whether the given deck was valid
	setDeck(deckCode: string | Card[], panel = this.panel): boolean {
		let deck: Card[]
		if (typeof deckCode === "string") {
			// Get the deck from this code
			let cardCodes: string[] = deckCode.split(':')

			deck = cardCodes.map( (cardCode) => decodeCard(cardCode))

			if (deckCode === '') {
				deck = []
			}
		}
		else {
			deck = deckCode
		}

		// Check if the deck is valid, then create it if so
		if (deck.includes(undefined))
		{
			return false
		}
		else
		{
			// Remove the current deck
			this.deck.forEach( (cutout) => cutout.destroy())
			this.deck = []
			this.updateText()

			// Add the new deck
			for (let i = 0; i < deck.length; i++) {
				let card = deck[i]
				this.addCardToDeck(card, panel)
			}

			// Scroll to the top of the page
			this.scrollablePanel.t = 0

			return true
		}
	}

	// Get the deck code for player's current deck
	getDeckCode(): string {
		let txt = ''
		for (let i = 0; i < this.deck.length; i++) {
			let count = this.deck[i].count

			for (let j = 0; j < count; j++) {
				let s = this.deck[i].id
				txt += `${s}:`
			}
		}

		// Remove the last :
		txt = txt.slice(0, -1)

		return txt
	}

	// Add cards to the deck that must be in the deck
	addRequiredCards(cards: string): void {
		const amt = cards.match(/\:/g).length + 1

		// Hint for the cards user's can choose to complete the deck
		this.txtChoice = this.scene.add.text(0, 0, `Chosen Cards: 0/${Mechanics.deckSize - amt}`, Style.basic).setOrigin(0.5)
		let containerChoice = new ContainerLite(this.scene, 0, 0, width, this.txtChoice.height + Space.pad)
		this.panel.add(containerChoice.add(this.txtChoice))

		// Create a panel for cards user has chosen
		this.panel.add(this.createChosenCardList())

		// Add in a hint and list of cards
		let txtRequired = this.scene.add.text(0, 0, `Required Cards: ${amt}`, Style.basic).setOrigin(0.5)
		let containerRequired = new ContainerLite(this.scene, 0, 0, width, txtRequired.height + Space.pad)
		this.panel.add(containerRequired.add(txtRequired))

		// Add in a scrollable panel of the required cards
		this.panel.add(this.createRequiredCardList(cards))

		this.updateText()

		this.scrollablePanel.layout()
	}

	// Create a scrollable panel with all of the cards user has chosen
	private createChosenCardList() {
		this.chosenPanel = this.scene['rexUI'].add.fixWidthSizer()

		return this.chosenPanel
	}

	// Create a scrollable panel with all of the given required cards
	private createRequiredCardList(cards: string) {
		// Create the sizer that contains the cards
		let sizer = this.scene['rexUI'].add.fixWidthSizer()

		this.setDeck(cards, sizer)

		this.deck.forEach(cutout => {
			cutout.setRequired()
		})

		return sizer
	}

	// Remove the card from deck which has given index
	private removeCardFromDeck(cutout: Cutout): () => void {
		let that = this
		return function() {
			// Play a sound
			that.scene.sound.play('click')

			// Decrement, if fully gone, remove from deck list
			if (cutout.decrement().count === 0) {

				// Find the index of it within the deck list, remove that after
				let index

				for (let i = 0; i < that.deck.length && index === undefined; i++) {
					const cutoutI = that.deck[i]
					if (cutoutI.id === cutout.id && !cutoutI.required) {
						index = i
					}
				}

				if (index === undefined) {
					throw 'Given cutout does not exist in deck'
				}

				// Remove from the deck list
				that.deck.splice(index, 1)

				// Destroy the cutout and its container
				cutout.destroy()

				// Reformat the panel
				that.scrollablePanel.t = Math.min(0.999999, that.scrollablePanel.t)
				that.panel.layout()
			}

			that.updateText()
			that.scrollablePanel.layout()
		}
	}

	// Update the card count and deck button texts
	private updateText(): void {
		let totalCount = 0
		let choiceCount = 0
		this.deck.forEach(cutout => {
			totalCount += cutout.count

			// This is a chosen card if not required
			if (!cutout.required) {
				choiceCount += cutout.count
			}
		})

		// Display amount of chosen cards
		if (this.txtChoice !== undefined) {
			this.txtChoice.setText(`Chosen Cards: ${choiceCount}/${Mechanics.deckSize - totalCount + choiceCount}`)
		}

		if (totalCount === Mechanics.deckSize) {
			this.btnStart.setText('Start')
			this.btnStart.enable()
		}
		else
		{
			this.btnStart.setText(`${totalCount}/${Mechanics.deckSize}`)

			// TODO Grey out the button, have a disable method for button class
			// For debugging, allow sub-15 card decks locally
			if (location.port !== '4949') {
				this.btnStart.disable()
			}
		}
	}

	// TODO Make dry with other scenes
	// Update the panel when user scrolls with their mouse wheel
	private updateOnScroll(panel, scrollablePanel) {
		let that = this

		this.scene.input.on('wheel', function(pointer: Phaser.Input.Pointer, gameObject, dx, dy, dz, event) {
			// Return if the pointer is outside of the panel
			if (!panel.getBounds().contains(pointer.x, pointer.y)) {
				return
			}

			// Scroll panel down by amount wheel moved
			scrollablePanel.childOY -= dy

			// Ensure that panel isn't out bounds (Below 0% or above 100% scroll)
			scrollablePanel.t = Math.max(0, scrollablePanel.t)
			scrollablePanel.t = Math.min(0.999999, scrollablePanel.t)
		})
	}

	private addToPanelSorted(child: ContainerLite, card: Card, panel): number {
		// If adding to the chosen cards, don't consider required cards
		let cards = panel === this.chosenPanel ? this.deck.filter((cutout) => !cutout.required) : this.deck

		for (let i = 0; i < cards.length; i++) {
			const cutout = cards[i]

			if ((cutout.card.cost > card.cost) ||
				((cutout.card.cost === card.cost) &&
					(cutout.card.name > card.name))
				)
			{
				let index = i
				panel.insert(index, child)
				return index
			}
		}

		// Default insertion is at the end, if it's not before any existing element
		let index = cards.length
		panel.insert(index, child)
		return index
	}
}
