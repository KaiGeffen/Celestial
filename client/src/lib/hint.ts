import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { BBStyle, Time, Space } from '../settings/settings'
import Card from '../../../shared/state/card'
import { KeywordPosition } from '../../../shared/state/card'
import Catalog from '../../../shared/state/catalog'
import { Keywords } from '../../../shared/state/keyword'
import { CardImage } from './cardImage'

export default class Hint {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container

  // The textual part
  private txt: RexUIPlugin.BBCodeText

  // The X position to position flush to, or undefined if no pin
  private leftPin: number

  // Time in milliseconds that user has waited without moving cursor
  private waitTime = 0
  private skipWait = false

  // The card images shown in the hint
  private mainCard: CardImage
  private referencedCard: CardImage

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.container = scene.add.container().setDepth(40).setVisible(false)

    // Textual part of hint
    this.txt = scene['rexUI'].add
      .BBCodeText(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        'Hello world',
        BBStyle.hint,
      )
      .setOrigin(0.5, 1)
      .setAlign('center')
    this.container.add(this.txt)

    // Cards
    this.mainCard = new CardImage(null, this.container, false).hide()
    this.referencedCard = new CardImage(null, this.container, false).hide()

    // Copy mouse position and show a hint when over a hinted object
    scene.input.on('pointermove', () => {
      this.orientText()
      if (!this.skipWait) {
        this.container.setVisible(false)
        this.waitTime = 0
      }
    })
    scene.events.on('update', (time, delta) => {
      if (this.waitTime < Time.hint && !this.skipWait) {
        this.waitTime += delta
      } else {
        this.container.setVisible(true)
      }
    })
  }

  hide(): Hint {
    this.container.setVisible(false)

    // Reset the pin, since the next hovered item might not pin
    this.leftPin = undefined

    return this
  }

  show(): Hint {
    this.orientText()
    this.container.setVisible(true)

    return this
  }

  enableWaitTime(): void {
    this.skipWait = false
  }

  disableWaitTime(): void {
    this.skipWait = true
  }

  // Show the given hint text, or hide if empty
  showText(s: string): void {
    if (s !== '') {
      this.show()
    }

    this.txt.setText(s).setFixedSize(0, 0)
    this.mainCard.hide()
    this.referencedCard.hide()
  }

  showCard(card: Card | string): Hint {
    this.show()

    // Get the card
    if (typeof card === 'string') {
      card = Catalog.getCard(card)
    }

    // Set the main card
    this.mainCard.setCard(card).show()

    // Get card referenced by this card, if any
    const refs: Card[] = card
      .getReferencedCardNames()
      .map((name) => Catalog.getCard(name))

    // Set the referenced card, or hide if none
    if (refs.length > 0) {
      this.referencedCard.setCard(refs[0]).show()
    } else {
      this.referencedCard.hide()
    }

    // TODO Update, this is off
    // Get all keywords present in this or any referenced card
    const keywordPosition: KeywordPosition[] = []
    ;[card, ...refs].forEach((card) => {
      card.keywords.forEach((kt) => {
        // If this keyword hasn't been seen before, add this tuple (Including X value)
        if (!keywordPosition.some((k) => k.name === kt.name)) {
          keywordPosition.push(kt)
        }
      })
    })

    // String for all referenced cards
    const referencedImages = refs.map((card) => ` [img=${card.name}]`).join()
    if (keywordPosition.length === 0) {
      const width =
        referencedImages.length > 0
          ? Space.maxTextWidth + Space.pad
          : Space.cardWidth + Space.pad
      this.txt
        .setText(`[img=${card.name}]${referencedImages}`)
        .setFixedSize(width, Space.cardHeight + Space.pad)
    } else {
      // The hint relating to keywords
      const keywordsText = getKeywordsText(keywordPosition)

      // NOTE This is a hack because of a bug where card image renders with a single line's height
      this.txt
        .setText(
          `[img=${card.name}][color=grey]${referencedImages}[/color]
          \n\n\n\n\n\n\n\n\n\n
          ${keywordsText}`,
        )
        .setFixedSize(0, 0)
    }

    return this
  }

  // TODO Use in more places, instead of forming a string then passing to showText
  showKeyword(name: string, x: string = 'X'): void {
    const keyword = Keywords.get(name)
    if (keyword) {
      let s = keyword.text

      s = s.replace(/X/g, x)

      // NOTE Special case for occurences of +X, where X could be -N, so you want -N instead of +-N
      s = s.split(/\+\-/).join('-')

      this.showText(s)
    }
  }

  // Orient the text to be in the right position relative to the mouse
  private orientText(): void {
    const pointer = this.txt.scene.game.input.activePointer

    // Unless there is a left pin, center and hover above the mouse position
    let x: number
    let y: number
    if (this.leftPin === undefined) {
      x = pointer.position.x
      y = pointer.position.y - Space.pad
      this.txt.setX(x).setOrigin(0.5, 1).setY(y)

      // Adjust y for cards
      y = y - this.txt.height + Space.cardHeight / 2 + Space.padSmall
    }
    // If there is a pin, go just to the right of that
    else {
      x = this.leftPin + Space.pad
      y = pointer.position.y
      this.txt.setX(x).setOrigin(0, 0.5).setY(y)

      // Adjust x,y for the cards
      x += this.txt.width / 2
      y = y - this.txt.height / 2 + Space.padSmall + Space.cardHeight / 2
    }

    // Position main and referenced card images above text
    if (this.referencedCard.visible) {
      // Position referenced card to the right
      this.referencedCard.setPosition([
        x + Space.cardWidth / 2 + Space.padSmall / 2,
        y,
      ])

      // Adjust x of main card to be to the left
      x -= Space.cardWidth / 2 + Space.padSmall / 2
    }
    if (this.mainCard) {
      this.mainCard.setPosition([x, y])
    }

    this.ensureOnScreen()
  }

  // Ensure that the hint is within the screen bounds, if possible
  private ensureOnScreen(): void {
    let txt = this.txt

    let bounds = txt.getBounds()

    let dx = 0
    if (bounds.left < 0) {
      dx = -bounds.left
    } else if (bounds.right > Space.windowWidth) {
      dx = Space.windowWidth - bounds.right
    }

    let dy = 0
    if (bounds.top < 0) {
      dy = -bounds.top
    } else if (bounds.bottom > Space.windowHeight) {
      dy = Space.windowHeight - bounds.bottom
    }

    txt.setPosition(txt.x + dx, txt.y + dy)
    this.mainCard?.setPosition([
      this.mainCard.container.x + dx,
      this.mainCard.container.y + dy,
    ])
    this.referencedCard?.setPosition([
      this.referencedCard.container.x + dx,
      this.referencedCard.container.y + dy,
    ])
  }
}

// For a list of keyword tuples (Which expresses a keyword and its value)
// Get the hint text that should display
function getKeywordsText(keywordPositions: KeywordPosition[]) {
  let result = ''

  for (const keywordPosition of keywordPositions) {
    const keyword = keywordPosition.name
    let txt = keyword.text

    if (keyword.hasX) {
      // NOTE This is replaceAll, but supported on all architectures
      txt = txt.split(/\bX\b/).join(`${keywordPosition.value}`)

      // NOTE Special case for occurences of +X, where X could be -N, so you want -N instead of +-N
      txt = txt.split(/\+\-/).join('-')
    }

    result += `\n${txt}`
  }

  return result
}
