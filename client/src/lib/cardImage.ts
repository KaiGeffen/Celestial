import 'phaser'
import Catalog from '../../../shared/state/catalog'
import { Color, Style, BBStyle, Space, Flags } from '../settings/settings'
import Card from '../../../shared/state/card'
import { KeywordPosition } from '../../../shared/state/card'
import { KeywordLabel, ReferenceLabel } from '../lib/keywordLabel'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'
import BaseScene from '../scene/baseScene'
import BBCodeText from 'phaser3-rex-plugins/plugins/bbcodetext'
import { Keywords } from '../../../shared/state/keyword'

// The offset of cost / points
const statOffset1 = 26
const statOffset2 = 77

export class CardImage {
  scene: BaseScene

  card: Card
  image: Phaser.GameObjects.Image
  visible = true

  // Visual elements that appear on the cardImage
  txtCost: BBCodeText
  txtPoints: BBCodeText
  txtText: BBCodeText

  // A container just for this cardImage and elements within it
  container: ContainerLite | Phaser.GameObjects.Container

  // Whether or not this object is hovered currently
  hovered = false

  // The card's cost, if it has been changed
  cost: number

  hoverCallback = () => {}
  exitCallback = () => {}
  clickCallback = () => {}

  // The index of this container within its parent container before it was brought to top
  renderIndex: number = undefined

  // In focus menu, the string describing what action to take with this card
  private focusString = ''
  private focusCloseOnClick = () => {
    return true
  }
  private getCount: () => number

  constructor(card: Card, container: any, interactive: Boolean = true) {
    card = card || Catalog.cardback
    this.init(card, container, interactive)
  }

  private init(card: Card, outerContainer: any, interactive: Boolean) {
    this.card = card
    this.scene = outerContainer.scene
    this.createContainer(outerContainer)

    // Card image
    this.image = this.scene.add.image(0, 0, card.name)
    this.image.setDisplaySize(Space.cardWidth, Space.cardHeight)
    this.container.add(this.image)

    // Stat text
    this.createStats()
    this.createText()

    if (!Flags.mobile) {
      this.image
        .on('pointerover', this.onHover())
        .on('pointerout', this.onHoverExit())
        .on('pointerdown', () => this.clickCallback())
    } else {
      this.image.on('pointerdown', () => {
        this.scene.scene.launch('MenuScene', {
          menu: 'focus',
          card: this.card,
          cost: this.cost,
          btnString: this.focusString,
          closeOnClick: this.focusCloseOnClick,
          getCount: this.getCount,
          callback: () => this.clickCallback(),
        })
      })
    }

    // NOTE Just for beta cards
    if (this.card.beta) {
      const name = this.scene.add
        .text(
          0,
          -Space.cardHeight / 2 + Space.pad,
          this.card.name,
          Style.todoBetaCardName,
        )
        .setOrigin(0.5, 0)

      this.container.add(name)
    }

    if (interactive) {
      this.image.setInteractive()
    }
  }

  destroy(): void {
    ;[this.image, this.txtCost, this.txtPoints, this.container].forEach(
      (obj) => {
        obj.destroy()
      },
    )
  }

  show(): CardImage {
    this.container.setVisible(true)
    this.visible = true

    return this
  }

  hide(): CardImage {
    this.container.setVisible(false)
    this.visible = false

    return this
  }

  // Set the callback to fire when this card's image is clicked
  setOnClick(f: () => void, removeListeners = false): CardImage {
    // let callback
    // if (removeListeners || this.clickCallback === undefined) {
    //   callback = f
    // }
    // else {
    //   callback = () => {
    //     this.clickCallback()
    //     f()
    //   }
    // }

    this.clickCallback = f

    return this
  }

  // Set the callback to fire when this card's image is hovered, and one for when exited
  setOnHover(fHover: () => void, fExit: () => void): CardImage {
    var oldHover = this.hoverCallback
    this.hoverCallback = () => {
      oldHover()
      fHover()
    }

    var oldExit = this.exitCallback
    this.exitCallback = () => {
      // Don't do the callback if this isn't currently hovered
      if (!this.hovered) {
        return
      }

      oldExit()
      fExit()
    }

    return this
  }

  removeOnHover(): CardImage {
    this.hoverCallback = () => {}
    this.exitCallback = () => {}

    return this
  }

  // Set whether this card is playable
  setPlayable(isPlayable: Boolean): void {
    if (isPlayable) {
      this.clearTint()
    } else {
      this.setTint(Color.cardGreyed)
    }
  }

  // Set that a card has resolved (In the story)
  setResolved(): CardImage {
    this.setTint(Color.cardGreyed)

    return this
  }

  setPosition(position: [number, number]): CardImage {
    this.container.setPosition(position[0], position[1])

    return this
  }

  // Set the displayed cost of this card, don't change the cost if cost is null
  setCost(cost: number): CardImage {
    if (cost !== null) {
      this.cost = cost

      this.txtCost.setText(
        `[b][stroke=${Color.cardStatChanged}]${cost}[/stroke][/b]`,
      )
    }

    return this
  }

  // Set this to be the given card, if it isn't already
  setCard(card: Card): CardImage {
    if (this.card.id !== card.id) {
      this.card = card

      // Destroy each of the existing elements
      ;[this.txtCost, this.txtPoints, this.txtText].forEach((obj) => {
        obj.destroy()
      })

      this.image.setTexture(card.name)
      this.createStats()
      this.createText()
    }

    return this
  }
  // Set the displayed point value of the card, or hide it if it's equal to the default value
  setPoints(amt: number): CardImage {
    // TODO Generalize once it's not just pet and child that have dynamic version
    if (this.card.points !== this.card.basePoints || this.card.beta) {
      this.txtPoints.setText(
        `[b][stroke=${Color.cardStatChanged}]${amt}[/stroke][/b]`,
      )
    }

    return this
  }

  setFocusOptions(
    s: string,
    closeOnClick?: () => boolean,
    getCount?: () => number,
  ): CardImage {
    this.focusString = s
    if (closeOnClick) {
      this.focusCloseOnClick = closeOnClick
    }
    if (getCount) {
      this.getCount = getCount
    }

    return this
  }

  private createContainer(outerContainer): void {
    // Depending on the type of the outer container, need to do different things
    if (outerContainer instanceof Phaser.GameObjects.Container) {
      this.container = this.scene.add.container()
      outerContainer.add(this.container)
    } else if (outerContainer instanceof ContainerLite) {
      this.container = new ContainerLite(
        this.scene,
        0,
        0,
        Space.cardWidth,
        Space.cardHeight,
      )
      outerContainer.add(this.container)
    } else {
      throw 'CardImage was given a container that isnt of a correct type'
    }
  }

  private createStats(): void {
    let hint = this.scene.hint

    // Cost
    this.txtCost = this.scene.add['rexBBCodeText'](
      -Space.cardWidth / 2 + statOffset1,
      -Space.cardHeight / 2 + statOffset1,
      `[b]${this.card.cost}[/b]`,
      BBStyle.cardStats,
    )
      .setVisible(this.card.id !== Catalog.cardback.id)
      .setOrigin(0.5)
      .on('pointerover', () =>
        hint.showText(`This card costs ${this.txtCost.text} breath to play.`),
      )
      .on('pointerout', () => {
        this.onHoverExit()()
        hint.hide()
      })
      .on('pointerdown', () => this.clickCallback())

    // Points
    this.txtPoints = this.scene.add['rexBBCodeText'](
      -Space.cardWidth / 2 + statOffset1,
      -Space.cardHeight / 2 + statOffset2,
      `[b]${this.card.points}[/b]`,
      BBStyle.cardStats,
    )
      .setVisible(this.card.id !== Catalog.cardback.id)
      .setOrigin(0.5)
      .on('pointerover', () =>
        hint.showText(
          `This card is worth ${this.txtPoints.text} point${this.card.points === 1 ? '' : 's'}.`,
        ),
      )
      .on('pointerout', () => {
        this.onHoverExit()()
        hint.hide()
      })
      .on('pointerdown', () => this.clickCallback())
    this.setPoints(this.card.points)

    if (!Flags.mobile) {
      // Make cost and points interactive
      this.txtCost.setInteractive()
      this.txtPoints.setInteractive()
    }

    this.container.add([this.txtCost, this.txtPoints])
  }

  private createText(): void {
    let s = this.card.text

    // Replace each keyword with the appropriate image
    for (const keyword of Object.values(Keywords.getAll())) {
      // Create a regex that matches the keyword name followed by optional positive/negative number
      const regex = new RegExp(`\\b${keyword.name}[ ]*(-?\\d+)?\\b`, 'g')

      s = s.replace(regex, (match, value) => {
        // If there's a value (like "Nourish 3"), include it in the image name
        if (value) {
          return `[area=${keyword.name}_${value}][color=#FABD5D]${keyword.name} ${value}[/color][/area]`
        }
        // Otherwise just use the keyword name (like "Birth")
        return `[area=${keyword.name}][color=#FABD5D]${keyword.name} [/color][/area]`
      })
    }

    // Replace each reference to a card by changing its color, but ignore text inside specific BBCode tags
    Catalog.getReferencedCardNames(this.card).forEach((card) => {
      const regex = new RegExp(`\\b${card}\\b`, 'g')
      s = s.replace(
        regex,
        `[area=_${card}][color=#FABD5D]${card}[/color][/area]`,
      )
    })

    // Create the text
    this.txtText = this.scene.add
      .rexBBCodeText(-1, 148, s, BBStyle.cardText)
      .setOrigin(0.5, 1)
      .setWordWrapWidth(Space.cardWidth)
      .setVisible(s !== '')

    // Enable hovering to get hint
    let hint = this.scene.hint
    this.txtText
      .on('areaover', (key: string) => {
        if (key[0] === '_') {
          hint.showCard(key.slice(1))
        } else {
          // Keyword X values are stored after an underscore
          if (key.includes('_')) {
            const [name, x] = key.split('_')
            hint.showKeyword(name, x)
          } else {
            hint.showKeyword(key)
          }
        }
      })
      .on('areaout', () => {
        hint.hide()
      })
      .setInteractive()
      .on('pointerdown', () => this.clickCallback())

    this.container.add(this.txtText)
  }

  // Move this cardImage above everything else in its container when it's hovered
  moveToTopOnHover(): CardImage {
    let that = this
    let container = this.container
    let parentContainer = container.parentContainer

    // Reverse the order of everything from this objects index on
    // This makes this appear above everything, and things to the right to be in reverse order
    let fHover = () => {
      // If the render index has already been set, we are already reversed
      if (this.renderIndex !== undefined) {
        return
      }

      // Remember the index that this was at
      this.renderIndex = parentContainer.getIndex(container)

      // From the top of the list until this cardImage, reverse the order
      this.revertCenteringInHand()
    }

    let fExit = () => {
      // From INDEX to the top is reversed, flip it back
      this.revertCenteringInHand()

      // Reset the render index to show no longer reversed
      this.renderIndex = undefined
    }

    this.setOnHover(fHover, fExit)

    return this
  }

  // Reverse the depth ordering of cards in hand from this on
  revertCenteringInHand(): CardImage {
    const parentContainer = this.container.parentContainer

    // From INDEX to the top is reversed, flip it back
    for (let i = parentContainer.length - 1; i >= this.renderIndex; i--) {
      parentContainer.bringToTop(parentContainer.getAt(i))
    }

    return this
  }

  // Toggle whether this card appears as being set to mulligan or not
  icon: Phaser.GameObjects.Image
  toggleSelectedForMulligan(): CardImage {
    if (this.icon !== undefined) {
      this.icon.destroy()
      this.icon = undefined
    } else {
      this.icon = this.container.scene.add.image(0, 0, 'icon-XOut')
      this.container.add(this.icon)
    }

    return this
  }

  // Copy the location of another cardImage
  copyLocation(card: CardImage): CardImage {
    const x = card.container.x + card.container.parentContainer.x
    const y = card.container.y + card.container.parentContainer.y

    this.container.setPosition(x, y)

    return this
  }

  private onHover(): () => void {
    let that = this

    function doHighlight() {
      var postFxPlugin = that.scene.plugins.get('rexOutlinePipeline')

      postFxPlugin['remove'](that.image)
      postFxPlugin['add'](that.image, {
        thickness: Space.highlightWidth,
        outlineColor: Color.outline,
        quality: 0.3,
      })
    }

    return () => {
      // If already hovered, exit
      if (this.hovered) {
        return
      }
      this.hovered = true

      // Apply the highlight effect
      doHighlight()

      // Do the callback
      this.hoverCallback()
    }
  }

  private onHoverExit(ignoreOverInternal = false): () => void {
    return () => {
      if (!this.hovered) {
        return
      }

      // If still over the internal elements, exit
      const pointer = this.scene.input.activePointer

      // Check if any of the internal elements are highlighted (Keywords, references, etc)
      let overInternal = false
      ;[this.txtCost, this.txtPoints, this.txtText].forEach((obj) => {
        if (obj.getBounds().contains(pointer.x, pointer.y)) {
          overInternal = true
        }
      })

      if (!ignoreOverInternal && overInternal) {
        return
      }

      // Remove the highlight effect
      this.scene.plugins.get('rexOutlinePipeline')['remove'](this.image)

      // Do the callback
      this.exitCallback()

      // Set the parameter to no longer hovered
      this.hovered = false
    }
  }

  private setTint(color: number): void {
    this.image.setTint(color)
    this.txtCost.setTint(color)
    this.txtPoints.setTint(color)
  }

  private clearTint(): void {
    this.image.clearTint()
    this.txtCost.clearTint()
    this.txtPoints.clearTint()
  }

  /**
   * @deprecated The method should not be used
   */
  // Show which player controls the card while it's in the story
  showController(player: number): CardImage {
    return this

    let color, angle
    if (player === 0) {
      color = 0x0000ff
      angle = -90
    } else {
      color = 0xff0000
      angle = 90
    }

    this.scene.plugins.get('rexDropShadowPipeline')['add'](this.image, {
      distance: 10,
      angle: angle,
      shadowColor: color,
    })

    return this
  }
}

// For mobile, the larger, full-sized CardImage
export class FullSizeCardImage extends CardImage {
  constructor(card: Card, container: any, interactive: Boolean = true) {
    super(card, container, interactive)

    // Move cost and points back to their normal location
    this.revertStatsLocation()

    // Load the full sized image and use it once loaded
    const s = `fullCard-${card.name}`
    if (this.scene.textures.exists(s)) {
      this.image
        .setTexture(s)
        .setDisplaySize(Space.fullCardWidth, Space.fullCardHeight)
    } else {
      this.scene.load.image(s, `assets/cards/${card.name}.webp`).start()

      // When image loads, set image texture
      this.scene.load.once('complete', () => {
        if (this.image) {
          this.image
            .setTexture(s)
            .setDisplaySize(Space.fullCardWidth, Space.fullCardHeight)
        }
      })
    }
  }

  // TODO Lots of constants pulled from different places
  revertStatsLocation(): void {
    this.txtCost
      .setPosition(-((336 * 7) / 10) / 2 + 27, -336 / 2 + 25)
      .setFontSize(36)

    this.txtPoints
      .setPosition(-((336 * 7) / 10) / 2 + 27, -336 / 2 + 75)
      .setFontSize(36)
  }
}
