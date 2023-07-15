import 'phaser';
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js';
import ScrollablePanel from 'phaser3-rex-plugins/templates/ui/scrollablepanel/ScrollablePanel'

import premadeDecklists from '../../catalog/premadeDecklists';
import avatarNames from '../../lib/avatarNames';
import Button from '../../lib/buttons/button';
import Buttons from '../../lib/buttons/buttons';
import Cutout from '../../lib/buttons/cutout';
import Icons from '../../lib/buttons/icons';
import Card from '../../lib/card';
import { decodeCard, encodeShareableDeckCode } from '../../lib/codec';
import { Color, Mechanics, Space, Style, BBStyle, Time, Scroll, Ease, Flags } from '../../settings/settings';
import { BuilderScene } from '../builderScene'
import newScrollablePanel from '../../lib/scrollablePanel'


const width = Space.deckPanelWidth// + Space.pad * 2

// Where the panel starts
const X_START = Flags.mobile ? -Space.deckPanelWidth - Space.pad - Space.sliderWidth : Space.decklistPanelWidth - Space.deckPanelWidth - Space.pad

export default class DeckRegion {
	private scene: BuilderScene

	// Callback for when the deck's avatar or name is edited
	editCallback: (name: string, avatar: number, deckCode: string) => void

	// The panel within which all of the cards are
	private scrollablePanel: ScrollablePanel
	private panel

	// Button allowing user to Start, or showing the count of cards in their deck
	private btnStart: Button

	// Deck of cards in user's current deck
	private deck: Cutout[] = []

	// The avatar button
	avatarNumber: number
	private avatar: Button
	private txtDeckName: RexUIPlugin.BBCodeText

	// Buttons
	private btnEdit: Button
	private btnShare: Button

	create(scene: BuilderScene,
		startCallback: () => void,
		editCallback?: (name: string, avatar: number, deckCode: string) => void
		) {
		this.scene = scene

		this.editCallback = editCallback

		this.createScrollable(startCallback)

		return this
	}

	private createScrollable(startCallback: () => void) {
		let background = this.scene.add.rectangle(0, 0, 1, 1, Color.backgroundLight)

		this.scrollablePanel = newScrollablePanel(this.scene, {
			x: X_START,
			y: 0,
			width: width,
			height: Space.windowHeight,

			panel: {
				child: this.createPanel(startCallback)
			},
			
			header: this.createHeader(startCallback),
			background: background,

			space: {
				top: Space.filterBarHeight,
			},
			})

		// If on mobile, must be over the decklist region
		if (Flags.mobile) {
			this.scrollablePanel.setDepth(3)
		}

		return this.scrollablePanel
	}

	private createPanel(startCallback: () => void): Phaser.GameObjects.GameObject {
		this.panel = this.scene['rexUI'].add.fixWidthSizer({
			width: width,
			space: {
				top: Space.padSmall
			}
		})

		return this.panel
	}

	private createHeader(startCallback: () => void): Phaser.GameObjects.GameObject {
		let background = this.scene.add.rectangle(0, 0, 420, 420, Color.backgroundDark)
		.setInteractive()

		const pad = Space.padSmall + (Flags.mobile ? Space.pad : 0)
		let sizer = this.scene['rexUI'].add.fixWidthSizer({
			space: {top: pad, bottom: pad},
		}).addBackground(background)

		sizer.add(this.createTitle())

		sizer.add(this.createButtons(startCallback))

		// Add this deck's avatar
		let containerAvatar = new ContainerLite(this.scene, 0, 0, Space.avatarSize + Space.pad, Space.avatarSize)
		this.avatar = new Buttons.Avatar(containerAvatar, 0, 0, 'Jules')
		if (Flags.mobile) {
			containerAvatar.setVisible(false)
		}
		else {
			sizer.add(containerAvatar)			
		}

		// Give the background a drop shadow
		this.scene.plugins.get('rexDropShadowPipeline')['add'](background, {
			distance: 3,
			angle: -90,
			shadowColor: 0x000000,
		})

		return sizer
	}

	// Create title text, return a sizer with all of them
	private createTitle() {
		// Sizer for the top of the header
		let sizerTop = this.scene['rexUI'].add.fixWidthSizer({
			width: width,
			align: Flags.mobile ? 'left' : 'center',
		})

		// Add the deck's name
		this.txtDeckName = this.scene.rexUI.add.BBCodeText()
		.setStyle({...BBStyle.deckName, 
			fixedWidth: width,
			// NOTE This handles the padding, and prevents text cropping
			fixedHeight: 50 + Space.padSmall,
		})
		.setOrigin(0.5)

		if (Flags.mobile) {
			this.txtDeckName.setVisible(false)
		} else {
			sizerTop.add(this.txtDeckName)			
		}

		return sizerTop
	}

	// Create buttons, return a sizer with all of them
	private createButtons(startCallback: () => void) {
		// TODO Abstract each of these to make it more clear what mobile looks like
		// TODO Add a back button for mobile
		let containerBack = new ContainerLite(this.scene, 0, 0, Space.buttonWidth/3, Space.avatarSize/2)
		new Icons.Recap(containerBack, 0, 0, this.backCallback())

		// Add an edit button that allows user to change details about their deck
		let containerEdit = new ContainerLite(this.scene, 0, 0, Space.buttonWidth/3, Space.avatarSize/2)
		this.btnEdit = new Icons.Edit(containerEdit, 0, 0, this.openEditMenu())

		// Add a copy button that allows user to copy their deck code
		let containerShare = new ContainerLite(this.scene, 0, 0, Space.buttonWidth/3, Space.avatarSize/2)
		this.btnShare = new Icons.Share(containerShare, 0, 0, this.shareCallback())

		// Add a graph button for showing the distribution of costs in the deck
		let containerDistribution = new ContainerLite(this.scene, 0, 0, Space.buttonWidth/3, Space.avatarSize/2)
		new Icons.Distribution(containerDistribution, 0, 0, this.distributionCallback())

		// Start button - Show how many cards are in deck, and enable user to start if deck is full
		let containerStart = new ContainerLite(this.scene, 0, 0, Space.buttonWidth, Space.avatarSize/2)
		this.btnStart = new Buttons.Basic(containerStart, 0, 0, '0/15', startCallback, true)
		
		// Make a container for all of the buttons
		let sizerButtons = this.scene['rexUI'].add.fixWidthSizer({
			width: width - Space.pad - (Flags.mobile ? 0 : Space.avatarSize + Space.pad),
			align: 'center',
		})

		if (Flags.mobile) {
			sizerButtons.add(containerBack)
		}
		sizerButtons.add(containerEdit)
		sizerButtons.add(containerShare)
		if (!Flags.mobile) {
			sizerButtons.add(containerDistribution)
		}
		sizerButtons.add(containerStart, Flags.mobile ? {padding: {left: Space.pad}} : {})

		return sizerButtons
	}

	// Add the given card and return the created cardImage
	addCardToDeck(card: Card, panel = this.panel): string {
		let totalCount = 0
		this.deck.forEach(cutout => {
			totalCount += cutout.count
		})

		// NOTE Limit the max number of cards so that database doesn't get taxed
		if (totalCount  >= Mechanics.deckSize * 2) {
			return 'Deck is overfull.'
		}

		// If this card exists in the deck already, increment it
		let alreadyInDeck = false
		this.deck.forEach(cutout => {
			if (cutout.name === card.name) {
				cutout.increment()
				alreadyInDeck = true
			}
		})

		if (!alreadyInDeck) {
			// If it doesn't, create a new cutout
			let container = new ContainerLite(this.scene, 0, 0, Space.deckPanelWidth, Space.cutoutHeight)
			let cutout = new Cutout(container, card)
			cutout.setOnClick(this.onClickCutout(cutout))
			if (Flags.mobile) {
				cutout.setDepth(4)
			}

			// Add the container in the right position in the panel
			let index = this.addToPanelSorted(container, card, panel)

			this.scrollablePanel.layout()

			this.deck.splice(index, 0, cutout)
		}
		
		// Update start button to reflect new amount of cards in deck
		this.updateText()

		return
	}

	// Set the current deck, and return whether the given deck was valid
	setDeck(deckCode: string | Card[], panel = this.panel): boolean {
		// Enable the edit and share icons
		this.btnEdit.enable()
		this.btnShare.enable()

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

			// TODO Decouple this from cutout
			// Stop cutouts from flashing
			this.deck.forEach( (cutout) => cutout.stopFlash())

			// Scroll to the top of the page
			this.scrollablePanel.t = 0

			return true
		}
	}

	setAvatar(id: number): DeckRegion {
		// TODO Require all decks to have an avatar
		id = id === undefined ? 0 : id

		this.avatarNumber = id

		this.avatar.setQuality({num: id, emotive: true})
		.enable()

		return this
	}

	setName(name: string): DeckRegion {
		this.txtDeckName.setText(name)

		return this
	}

	// Set the deck's to be the given premade deck
	setPremade(id: number): DeckRegion {
		this.txtDeckName.setText(`${avatarNames[id]} Premade`)
		this.setAvatar(id)
		this.setDeck(premadeDecklists[id])

		// Disable cards from being removed from the deck
		this.deck.forEach(cutout => {
			cutout.setPremade()
		})

		// Disable the edit button
		this.btnEdit.disable()

		return this
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

	// Remove the card from deck which has given index, or add another if right-click
	private onClickCutout(cutout: Cutout): () => void {
		return () => {
			let pointer: Phaser.Input.Pointer = this.scene.input.activePointer

			// If right clicking, add another copy
			if (pointer.rightButtonDown()) {
				this.scene.addCardToDeck(cutout.card)
			}
			// Decrement, if fully gone, remove from deck list
			else if (cutout.decrement().count === 0) {
				// Find the index of it within the deck list, remove that after
				let index

				for (let i = 0; i < this.deck.length && index === undefined; i++) {
					const cutoutI = this.deck[i]
					if (cutoutI.id === cutout.id) {
						index = i
					}
				}

				if (index === undefined) {
					throw 'Given cutout does not exist in deck'
				}

				// Remove from the deck list
				this.deck.splice(index, 1)

				// Destroy the cutout and its container
				cutout.destroy()

				// Reformat the panel
				this.scrollablePanel.layout()
				this.scrollablePanel.t = Math.min(0.999999, this.scrollablePanel.t)
			}

			this.updateText()

			this.scene['updateSavedDeck'](this.getDeckCode())
		}
	}

	// Update the card count and deck button texts
	private updateText(): void {
		let totalCount = 0
		this.deck.forEach(cutout => {
			totalCount += cutout.count
		})

		if (totalCount === Mechanics.deckSize) {
			this.btnStart.setText('Start')
			this.btnStart.enable()
		}
		else
		{
			this.btnStart.setText(`${totalCount}/${Mechanics.deckSize}`)

			// For debugging, allow sub-15 card decks locally
			if (!Flags.local) {
				this.btnStart.disable()
			}
		}
	}

	private addToPanelSorted(child: ContainerLite, card: Card, panel): number {
		for (let i = 0; i < this.deck.length; i++) {
			const cutout = this.deck[i]

			if ((cutout.card.cost > card.cost) ||
				((cutout.card.cost === card.cost) &&
					(cutout.card.name > card.name))
				)
			{
				panel.insert(i, child)
				return i
			}
		}

		// Default insertion is at the end, if it's not before any existing element
		let end = this.deck.length
		panel.insert(end, child)
		return end
	}

	private openEditMenu(): () => void {
		let that = this

		return function() {
			that.scene.scene.launch('MenuScene', {
					menu: 'editDeck',
					callback: that.editCallback,
					deckName: that.txtDeckName.text,
					selectedAvatar: that.avatarNumber,
				})
		}
	}

	private shareCallback(): () => void {
		return () => {
			// Copy the deck's code to clipboard
			const encodedDeck = encodeShareableDeckCode(this.scene.getDeckCode())
  			navigator.clipboard.writeText(encodedDeck)

  			// Inform user deck code was copied
  			this.scene.showMessage('Deck code copied to clipboard.')
		}
	}

	private distributionCallback(): () => void {
		let that = this

		return function() {
			that.scene.scene.launch('MenuScene', {
				menu: 'distribution',
				// Used to form the graph
				currentDeck: that.deck,
			})
		}
	}

	private backCallback(): () => void {
		return () => {
			this.scene.deselect()
		}
	}

	hidePanel(): void {
		// this.scrollablePanel.setX(X_START)
		this.scene.tweens.add({
			targets: this.scrollablePanel,
			x: X_START,
			duration: Time.builderSlide(),
			ease: Ease.slide,
		})
	}

	showPanel(): void {
		const x = Flags.mobile ? 0 : Space.decklistPanelWidth
		// this.scrollablePanel.x = x
		this.scene.tweens.add({
			targets: this.scrollablePanel,
			x: x,
			duration: Time.builderSlide(),
			ease: Ease.slide,
		})
	}

	isOverfull(): boolean {
		let totalCount = 0
		this.deck.forEach(cutout => {
			totalCount += cutout.count
		})
		
		return totalCount >= 30
	}

	// Return the amount of a card in this deck
	getCount(card: Card): number {
		let count = 0

		this.deck.forEach(cutout => {
			if (cutout.name === card.name) {
				count = cutout.count
			}
		})
		
		return count
	}
}

