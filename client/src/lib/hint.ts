import 'phaser'
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js'

import { BBStyle, Time, Space } from '../settings/settings'
import Card from '../../../shared/state/card'
import { KeywordPosition } from '../../../shared/state/card'
import Catalog from '../../../shared/state/catalog'
import { Keywords } from '../../../shared/state/keyword'

export default class Hint {
  txt: RexUIPlugin.BBCodeText

  // The X position to position flush to, or undefined if no pin
  leftPin: number

  // Time in milliseconds that user has waited without moving cursor
  waitTime = 0
  skipWait = false

  constructor(scene: Phaser.Scene) {
    this.txt = scene['rexUI'].add
      .BBCodeText(
        Space.windowWidth / 2,
        Space.windowHeight / 2,
        'Hello world',
        BBStyle.hint,
      )
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setVisible(false)
      .setAlign('center')

    // Copy mouse position and show a hint when over a hinted object
    scene.input.on('pointermove', () => {
      this.orientText()
      if (!this.skipWait) {
        this.txt.setAlpha(0)
        this.waitTime = 0
      }
    })
    scene.events.on('update', (time, delta) => {
      if (this.waitTime < Time.hint && !this.skipWait) {
        this.waitTime += delta
      } else {
        this.txt.setAlpha(1)
      }
    })
  }

  hide(): Hint {
    this.txt.setVisible(false)

    // Reset the pin, since the next hovered item might not pin
    this.leftPin = undefined

    return this
  }

  show(): Hint {
    this.orientText()
    this.txt.setVisible(true)

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
  }

  showCard(card: Card | string): Hint {
    this.show()

    // Get the card
    if (typeof card === 'string') {
      card = Catalog.getCard(card)
      // card = getCard(card)
    }

    // Get cards referenced by this card
    const refs: Card[] = card.references.map((ref) => ref.card)

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

    // FOR TESTING TODO Flag to include
    if (!this.txt.scene.textures.exists(card.name)) {
      const s = `${card.name}\n${card.cost}:${card.points}\n${card.text}`
      this.showText(s)
      return this
    }

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

      this.showText(keywordsText)

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

  // // Get the hint text for the card
  // let hintText = getHintText(card)
  // const referencedImages = card
  //   .getReferencedCards()
  //   .map((card) => {
  //     return ` [img=${card.name}]`
  //   })
  //   .join()
  // if (hintText !== '') {
  //   this.showText(hintText)

  //   // NOTE This is a hack because of a bug where card image renders with a single line's height
  //   this.txt
  //     .setText(`[img=${card.name}]`)
  //     .appendText(`[color=grey]${referencedImages}[/color]`)
  //     .appendText('\n\n\n\n\n\n\n\n\n\n\n\n')
  //     .appendText(`\n${hintText}`)
  //     .setFixedSize(0, 0)
  // } else {
  //   const width =
  //     card.getReferencedCards().length > 0
  //       ? Space.maxTextWidth + Space.pad
  //       : Space.cardWidth + Space.pad
  //   this.txt
  //     .setText(`[img=${card.name}]`)
  //     .appendText(`${referencedImages}`)
  //     .setFixedSize(width, Space.cardHeight + Space.pad)
  // }

  // return this

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
    if (this.leftPin === undefined) {
      this.txt
        .setX(pointer.position.x)
        .setOrigin(0.5, 1)
        .setY(pointer.position.y - Space.pad)
    }
    // If there is a pin, go just to the right of that
    else {
      this.txt
        .setX(this.leftPin + Space.pad)
        .setOrigin(0, 0.5)
        .setY(pointer.position.y)
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
