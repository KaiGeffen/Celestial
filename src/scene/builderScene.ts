import "phaser"
import { collectibleCards, starterCards,  Card } from "../catalog/catalog"
import { CardImage, addCardInfoToScene } from "../lib/cardImage"
import { StyleSettings, ColorSettings, UserSettings, Space } from "../settings"
import { decodeCard, encodeCard } from "../lib/codec"
import BaseScene from "./baseScene"


const DECK_PARAM = 'deck'

// The card hover text for this scene, which is referenced in the regions
var cardInfo: Phaser.GameObjects.Text

// The last deck of cards the player had, which get repopulated each time they enter the deck builder
var tutorialDeck: Card[] = []
var standardDeck: Card[] = []


export default class BuilderScene extends BaseScene {
  isTutorial: Boolean

  catalogRegion
  deckRegion
  filterRegion
  menuRegion
  tutorialRegion

  constructor() {
    super({
      key: "BuilderScene"
    })
  }
  
  init(params: any): void {
    this.isTutorial = params['isTutorial']

    this.sound.pauseOnBlur = false

    if (this.isTutorial) {
      this.tutorialRegion = new TutorialRegion(this)
    }

    this.deckRegion = new DeckRegion(this)
    this.catalogRegion = new CatalogRegion(this, this.deckRegion)
    this.filterRegion = new FilterRegion(this, this.catalogRegion)
    this.menuRegion = new MenuRegion(this, this.deckRegion)
    
    cardInfo = addCardInfoToScene(this)
  }

  create(): void {
    this.catalogRegion.create(this.isTutorial)
    this.deckRegion.create(this.isTutorial)

    if (this.isTutorial) {
      this.tutorialRegion.create()
    }
    else {
      this.filterRegion.create()
      this.menuRegion.create()
    }

    super.create()
  }

  beforeExit(): void {
    this.deckRegion.beforeExit()
  }
}


class CatalogRegion {
  scene: Phaser.Scene
  container: Phaser.GameObjects.Container
  cardContainer: Phaser.GameObjects.Container
  deckRegion
  cardImages: CardImage[] = []
  currentPage: number = 0

  constructor(scene: Phaser.Scene, deckRegion) {
    this.init(scene, deckRegion)
  }

  init(scene, deckRegion): void {
    this.scene = scene
    this.container = this.scene.add.container(0, 0)
    this.cardContainer = this.scene.add.container(0, 0)
    this.deckRegion = deckRegion
  }

  create(isTutorial): void {
    let catalog = isTutorial ? starterCards : collectibleCards
    for (var i = catalog.length - 1; i >= 0; i--) {
      this.addCard(catalog[i], i)
    }
    if (catalog.length > Space.cardsPerPage) {
      let x = Space.cardsPerRow * (Space.cardSize + Space.pad) + Space.pad
      let y = 2 * (Space.cardSize + Space.pad) + Space.pad/2

      let btnNext = this.scene.add.text(x, y, '>', StyleSettings.button).setOrigin(0, 0)
      btnNext.setInteractive()
      btnNext.on('pointerdown', this.goNextPage())
      this.container.add(btnNext)

      let btnPrev = this.scene.add.text(x, y, '<', StyleSettings.button).setOrigin(0, 1)
      btnPrev.setInteractive()
      btnPrev.on('pointerdown', this.goPrevPage())
      this.container.add(btnPrev)
    }
  }

  // Filter which cards are visible
  // Only cards for which filterFunction is true are visible
  filter(filterFunction): void {
    let cardsRemoved = false
    let visibleIndex = 0

    // TODO Explain this
    for (var i = this.cardImages.length - 1; i >= 0; i--) {
      let cardImage = this.cardImages[i]

      // This card is present
      if (filterFunction(cardImage.card)) {
        cardImage.image.setVisible(true)

        // If cards are being removed, shift into position, otherwise snap
        let newPosition = this.getCardPosition(visibleIndex)
        if (cardsRemoved) {
          // TODO move over time (moveTo)
          cardImage.image.setPosition(...newPosition)
        } else {
          cardImage.image.setPosition(...newPosition)
        }

        visibleIndex++
      }
      else
      {
        // If this card was visible but now isn't, this filter is removing more cards
        if (cardImage.image.visible) cardsRemoved = true

          cardImage.image.setVisible(false)
      }
    }

    this.goToPage(0)
  }

  private onClick(card: Card): () => void {
    let that = this
    return function() {
      if (that.deckRegion.addCard(card)) {
        that.scene.sound.play('click')
      }
      else {
        that.scene.sound.play('failure') 

        that.scene.cameras.main.flash(300, 0, 0, 0.1)
      }
      
    }
  }

  private addCard(card: Card, index: number): void {
    var image: Phaser.GameObjects.Image
    var [x, y] = this.getCardPosition(index)
    
    image = this.scene.add.image(x, y, card.name)
    image.setDisplaySize(Space.cardSize, Space.cardSize)

    image.setInteractive()
    image.on('pointerdown', this.onClick(card), this)

    this.cardContainer.add(image)

    this.cardImages.push(new CardImage(card, image))
  }

  private getCardPosition(index: number): [number, number] {
    let pageNumber = Math.floor(index / Space.cardsPerPage)
    index = index % Space.cardsPerPage

    let col = index % Space.cardsPerRow
    let xPad = (1 + col) * Space.pad
    let x = col * Space.cardSize + xPad + Space.cardSize / 2
    x += pageNumber * Space.pageOffset

    let row = Math.floor(index / Space.cardsPerRow)
    let yPad = (1 + row) * Space.pad
    let y = row * Space.cardSize + yPad + Space.cardSize / 2

    return [x, y]
  }

  private goNextPage(): () => void {
    let that = this
    return function() {
      let numVisibleCards = that.cardImages.filter(function(cardImage) {
        return cardImage.image.visible
      }).length

      if (numVisibleCards > (that.currentPage + 1) * Space.cardsPerPage) {
        that.scene.sound.play('click')

        that.goToPage(that.currentPage + 1)
      }
      else {
        that.scene.sound.play('failure')
      }
    }
  }

  private goPrevPage(): () => void {
    let that = this
    return function() {
      if (that.currentPage > 0) {
        that.scene.sound.play('click')

        that.goToPage(that.currentPage - 1)
      }
      else {
        that.scene.sound.play('failure')
      }
    }
  }

  private goToPage(pageNum: number): void {
    this.cardContainer.x = -(pageNum * Space.pageOffset)
    this.currentPage = pageNum
  }
}


class DeckRegion {
  scene: Phaser.Scene
  container: Phaser.GameObjects.Container
  deck: CardImage[] = []
  isTutorial: Boolean

  txtHint: Phaser.GameObjects.Text
  btnStart: Phaser.GameObjects.Text
  btnMenu: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene) {
    this.init(scene)
  }

  init(scene): void {
    this.scene = scene
    this.container = this.scene.add.container(988, 650)
  }

  create(isTutorial: boolean): void {
    let that = this

    this.isTutorial = isTutorial

    // Hint text - tell user to click cards to add
    this.txtHint = this.scene.add.text(-500, -120, "Click a card to add it to your deck",
      StyleSettings.announcement).setOrigin(0.5, 0)

    // Sort button
    let btnSort = this.scene.add.text(0, -100, 'Sort', StyleSettings.button)

    btnSort.setInteractive()
    btnSort.on('pointerdown', function (event) {
      that.scene.sound.play('click')

      that.sort()
    })

    // Start button
    this.btnStart = this.scene.add.text(0, -50, '', StyleSettings.button)

    this.btnStart.setInteractive()
    this.btnStart.on('pointerdown', this.onStart())

    // Menu button, the callback is set by menu region during its init
    this.btnMenu = this.scene.add.text(0, -150, 'Menu', StyleSettings.button)
    if (isTutorial) {
      this.btnMenu.setVisible(false)
    }

    // If this is the tutorial, use that deck, otherwise use the other deck
    if (isTutorial) {
      this.setDeck(tutorialDeck)
    } else {
      this.setDeck(standardDeck)
    }

    // Add all of these objects to this container
    this.container.add([this.txtHint, btnSort, this.btnStart, this.btnMenu])
  }

  addCard(card: Card): boolean {
    if (this.deck.length >= 15) {
      return false
    }

    let index = this.deck.length
    let [x, y] = this.getCardPosition(index)
    let image: Phaser.GameObjects.Image = this.scene.add.image(x, y, card.name)
    image.setDisplaySize(100, 100)

    image.setInteractive()
    image.on('pointerdown', this.removeCard(index), this)

    this.container.add(image)

    this.deck.push(new CardImage(card, image))

    // Update start button to reflect new amount of cards in deck
    this.updateText()

    // Card was added successfully
    return true
  }

  // Set the current deck, returns true if deck was valid
  setDeck(deckCode: string | Card[]): boolean {
    let deck: Card[]
    if (typeof deckCode === "string") {
      // Get the deck from this code
      let cardCodes: string[] = deckCode.split(':')

      deck = cardCodes.map( (cardCode) => decodeCard(cardCode))
    }
    else {
      console.log('deck is a list of cards')
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
      this.deck.forEach( (cardImage) => cardImage.destroy())
      this.deck = []
      cardInfo.setVisible(false)
      this.updateText()
      
      // Add the new deck
      deck.forEach( (card) => this.addCard(card))

      return true
    }
  }

  // Set the callback for showing the menu
  setShowMenu(callback: () => void): void {
    this.btnMenu.setInteractive()
    this.btnMenu.on('pointerdown', callback)
  }

  // Before exiting, remember the deck player has
  beforeExit(): void {
    if (this.isTutorial) {
      tutorialDeck = this.deck.map( (cardImage) => cardImage.card)
    }
    else {
      standardDeck = this.deck.map( (cardImage) => cardImage.card)
    }
  }

  private onStart(): () => void {
    let that = this

    return function () {
      that.scene.sound.play('click')

      that.beforeExit()
      
      // Start the right scene / deck pair
      if (that.isTutorial) {
        this.scene.scene.start("TutorialScene", {deck: tutorialDeck})
      }
      else {
        this.scene.scene.start("GameScene", {deck: standardDeck})
      }
    }
  }

  private updateText(): void {
    if (this.deck.length === 15) {
      this.btnStart.text = 'Start'
      this.btnStart.input.enabled = true
    }
    else
    {
      this.btnStart.text = `${this.deck.length}/15`
      this.btnStart.input.enabled = true // TODO false
    }

    this.txtHint.setVisible(this.deck.length === 0)
  }

  private getCardPosition(index: number): [number, number] {
    let xPad = Space.pad
    let x = index * (Space.cardSize - Space.stackOverlap) + xPad + Space.cardSize/2

    let y = Space.pad + Space.cardSize/2 + (index%2) * Space.stackOffset

    return [-x, -y]
  }

  private removeCard(index: number): () => void {
    let that = this
    return function() {
      // Play a sound
      that.scene.sound.play('click')

      // The text for the removed card would otherwise linger
      cardInfo.setVisible(false)

      // Remove the image
      that.deck[index].destroy()

      // Remove from the deck array
      that.deck.splice(index, 1)

      that.correctDeckIndices()

      that.updateText()

      if (that.deck.length === 0) {
        that.txtHint.setVisible(true)
      }
    }
  }

  // Set each card in deck to have the right position and onClick events for its index
  private correctDeckIndices(): void {
    for (var i = 0; i < this.deck.length; i++) {
      let image = this.deck[i].image

      image.setPosition(...this.getCardPosition(i))

      this.container.bringToTop(image)

      // Remove the previous onclick event and add one with the updated index
      image.removeAllListeners('pointerdown')
      image.on('pointerdown', this.removeCard(i), this)
    }
  }

  private sort(): void {
    this.deck.sort(function (card1, card2): number {
      if (card1.card.cost < card2.card.cost)
      {
        return 1
      }
      else if (card1.card.cost > card2.card.cost)
      {
        return -1
      }
      else
      {
        return card1.card.name.localeCompare(card2.card.name)
      }
    })

    this.correctDeckIndices()
  }
}


class FilterRegion {
  scene: Phaser.Scene
  container: Phaser.GameObjects.Container
  catalogRegion
  filterCostAry: boolean[] = []

  constructor(scene: Phaser.Scene, catalogRegion) {
    this.init(scene, catalogRegion)
  }

  init(scene, catalogRegion): void {
    this.scene = scene
    this.catalogRegion = catalogRegion
    this.container = this.scene.add.container(1000, 0)
  }

  create(): void {
    // Add each of the number buttons
    let btnNumbers: Phaser.GameObjects.Text[] = []
    for (var i = 0; i <= 8; i++) {
      this.filterCostAry[i] = false

      let y = 50 * (i + 1)
      let btn = this.scene.add.text(30, y, i.toString(), StyleSettings.basic)
      
      btn.setInteractive()
      btn.on('pointerdown', this.onClick(i, btn))

      this.container.add(btn)

      btnNumbers.push(btn)
    }

    // Add the X (Clear) button
    let btnClear = this.scene.add.text(30, 0, 'x', StyleSettings.basic)
    btnClear.setInteractive()
    btnClear.on('pointerdown', this.onClear(btnNumbers))
    this.container.add(btnClear)
  }

  private onClick(i: number, btn): () => void {
    let that = this

    return function() {
      that.scene.sound.play('click')

      // Highlight the button, or remove its highlight
      if (btn.isTinted) {
        btn.clearTint()
      }
      else
      {
        btn.setTint(ColorSettings.filterSelected)
      }

      // Toggle filtering the chosen number
      that.filterCostAry[i] = !that.filterCostAry[i]

      // If nothing is filtered, all cards are shown
      let filterFunction
      if (that.filterCostAry.every(v => v === false)) {
        filterFunction = function (card: Card) {return true}
      }
      else
      {
        filterFunction = function (card: Card) {
          return that.filterCostAry[card.cost]
        }
      }

      that.catalogRegion.filter(filterFunction)
    }
  }

  private onClear(btns: Phaser.GameObjects.Text[]): () => void {
    let that = this
    return function() {
      that.scene.sound.play('click')

      btns.forEach( (btn) => btn.clearTint())

      for (var i = 0; i < that.filterCostAry.length; i++) {
        that.filterCostAry[i] = false
      }

      that.catalogRegion.filter(
        function (card: Card) {return true}
        )
    }
  }
}


class MenuRegion {
  scene: Phaser.Scene
  deckRegion
  container: Phaser.GameObjects.Container
  deck: Card[] = []
  
  constructor(scene: Phaser.Scene, deckRegion) {
    this.init(scene, deckRegion)
  }

  init(scene: Phaser.Scene, deckRegion): void {
    this.scene = scene
    this.deckRegion = deckRegion
    
    this.container = this.scene.add.container(Space.cardSize * 2 + Space.pad * 3, Space.pad)
    this.container.setVisible(false)
  }

  create(): void {
    // Visible and invisible background rectangles, stops other containers from being clicked
    let invisBackground = this.scene.add.rectangle(0, 0, 1100*2, 650*2, 0xffffff, 0)
    invisBackground.setInteractive()

    let that = this
    invisBackground.on('pointerdown', function() {
      that.scene.sound.play('close')
      that.container.setVisible(false)
    })
    this.container.add(invisBackground)

    // Set the callback for deckRegion menu button
    this.deckRegion.setShowMenu(function() {
      that.scene.sound.play('open')
      that.container.setVisible(true)
    })

    let width = Space.cardSize * 5 + Space.pad * 4
    let height = Space.cardSize * 4 + Space.pad * 3
    let backgroundRectangle = this.scene.add.rectangle(0, 0, width, height, ColorSettings.menuBackground, 0.95).setOrigin(0, 0)
    backgroundRectangle.setInteractive()
    this.container.add(backgroundRectangle)

    // Vs ai toggleable button
    let txt = 'Play versus Computer          '
    txt += UserSettings.vsAi ? '✓' : 'X'
    let btnVsAi = this.scene.add.text(Space.pad, Space.pad/2, txt, StyleSettings.button).setOrigin(0, 0)
    btnVsAi.setInteractive()
    btnVsAi.on('pointerdown', this.onToggleUserSetting(btnVsAi, 'vsAi'))
    this.container.add(btnVsAi)

    // Show recap toggleable button
    txt = 'Explain keywords                 '
    txt += UserSettings.explainKeywords ? '✓' : 'X'
    let btnExplainKeywords = this.scene.add.text(Space.pad, Space.pad/2 + Space.cardSize, txt, StyleSettings.button).setOrigin(0, 0)
    btnExplainKeywords.setInteractive()
    btnExplainKeywords.on('pointerdown', this.onToggleUserSetting(btnExplainKeywords, 'explainKeywords'))
    this.container.add(btnExplainKeywords)

    // Prompt for matchmaking code
    txt = 'Use matchmaking code...' + '\n      > ' + UserSettings.mmCode
    let btnMatchmaking = this.scene.add.text(Space.pad, Space.pad/2 + Space.cardSize * 2, txt, StyleSettings.button).setOrigin(0, 0)
    btnMatchmaking.setInteractive()
    btnMatchmaking.on('pointerdown', this.onSetMatchmaking(btnMatchmaking))
    this.container.add(btnMatchmaking)

    // Button to save deck code
    txt = 'Copy deck code to clipboard'
    let btnCopy = this.scene.add.text(Space.pad, Space.pad/2 + Space.cardSize * 3, txt, StyleSettings.button).setOrigin(0, 0)
    btnCopy.setInteractive()
    btnCopy.on('pointerdown', this.onCopy(btnCopy))
    this.container.add(btnCopy)

    // Button to load deck code
    txt = 'Load deck from a code'
    let btnLoad = this.scene.add.text(Space.pad, Space.pad/2 + Space.cardSize * 4, txt, StyleSettings.button).setOrigin(0, 0)
    btnLoad.setInteractive()
    btnLoad.on('pointerdown', this.onLoadDeck(btnLoad))
    this.container.add(btnLoad)
  }

  private onToggleUserSetting(btn: Phaser.GameObjects.Text, property: string): () => void {
    let that = this
    return function() {
      that.scene.sound.play('click')

      UserSettings[property] = !UserSettings[property]

      that.setCheckOrX(btn, UserSettings[property])
    }
  }

  // Set the btn to end with a check or an X based on the conditional
  private setCheckOrX(btn: Phaser.GameObjects.Text, conditional: Boolean): void {
    let finalChar = conditional ? "✓":"X"
    let newText = btn.text.slice(0, -1) + finalChar
    btn.setText(newText)
  }

  private onSetMatchmaking(btn: Phaser.GameObjects.Text): () => void {
    let that = this
    return function() {
      var code = prompt("Enter matchmaking code:")
      if (code != null) {
        // This is necessary to not cut off part of the sound from prompt
        that.scene.time.delayedCall(100, () => that.scene.sound.play('click'))

        UserSettings['mmCode'] = code

        let newText = btn.text.split('>')[0] + '> ' + code
        btn.setText(newText)
      }
      
    }
  }

  private onCopy(btn: Phaser.GameObjects.Text): () => void {
    let that = this
    return function() {
      that.scene.sound.play('click')

      let txt = ''
      that.deckRegion.deck.forEach( (cardImage) => txt += `${encodeCard(cardImage.card)}:`)
      txt = txt.slice(0, -1)

      navigator.clipboard.writeText(txt)

      // Alert user that decklist was copied
      let previousText = btn.text
      btn.setText('Copied!')
      that.scene.time.delayedCall(600, () => btn.setText(previousText))
    }
  }

  private onLoadDeck(btn: Phaser.GameObjects.Text): () => void {
    let that = this
    return function() {
      let code = prompt("Enter deck code:")
      if (code != null) {

        let isValid = that.deckRegion.setDeck(code)
        if (isValid) {
          // This is necessary to not cut off part of the sound from prompt
          that.scene.time.delayedCall(100, () => that.scene.sound.play('click'))

          let previousText = btn.text
          btn.setText('Loaded!')
          that.scene.time.delayedCall(600, () => btn.setText(previousText))
        }
        else {
          // Alert user if deck code is invalid
          that.scene.time.delayedCall(100, () => that.scene.sound.play('failure'))

          let previousText = btn.text
          btn.setText('Invalid code!')
          that.scene.time.delayedCall(600, () => btn.setText(previousText))
        }
      }
    }
  }
}


class TutorialRegion {
  scene: Phaser.Scene
  container: Phaser.GameObjects.Container

  constructor(scene: Phaser.Scene) {
    this.init(scene)
  }

  init(scene): void {
    this.scene = scene
    this.container = this.scene.add.container(0, 0)
  }

  create(): void {
    let s = 
    `Each card has a cost (Left number) and point value (Right number).
    Some cards also have additional effects listed after that.

    Each round, you'll try to get more points than your opponent
    by spending mana to play cards.

    Try making a deck from 8 cards that cost 2 or less, 4 that cost 3-5,
    and 3 that cost 6 or more.` 
    let txt = this.scene.add.text(Space.pad, Space.cardSize + Space.pad * 2, s, StyleSettings.basic)

    this.container.add(txt)
  }
}




