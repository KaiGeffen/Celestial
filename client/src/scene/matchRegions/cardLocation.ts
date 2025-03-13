// Locations for all of the cards on screen based on their region and index

import 'phaser'

import GameModel from '../../../../shared/state/gameModel'
import { Space, Flags } from '../../settings/settings'

// Amount of room to leave to the right of the last card in either hand
const minRoom = (Flags.mobile ? 210 : 342) + Space.cardWidth / 2

// This describes where on screen each card in each region should appear
// so that regions can move their cards to the appropriate locations for
// other regions
export default class CardLocation {
  static ourHand(
    state: GameModel,
    i: number,
    container?: Phaser.GameObjects.Container,
  ): [number, number] {
    // X of the first card in their hand
    const x0 = 400 + Space.cardWidth / 2

    let dx = Space.cardWidth + Space.pad

    // If their hand has too many cards for the screen size, scale down
    // Amount of room to leave to the right of the last card
    const maxOffset = Space.windowWidth - x0 - minRoom

    if (state !== undefined) {
      // Find the amount that we must scale down by
      // offset of last card <= maxOffset
      // This may be multiplied by a constant to fit within the max
      const lastCardOffset = dx * (6 - 1)
      if (lastCardOffset > maxOffset) {
        dx *= maxOffset / lastCardOffset
      }
    }

    // Offset from the first card
    const xOffset = dx * i
    let x = x0 + xOffset

    let y = Space.windowHeight - Space.handHeight + Space.cardHeight / 2

    if (container !== undefined) {
      x -= container.x
      y -= container.y
    }

    return [x, y]
  }

  static theirHand(
    state: GameModel,
    i: number,
    container: Phaser.GameObjects.Container,
  ): [number, number] {
    // X of the first card in their hand
    const x0 = (Flags.mobile ? 100 : 220) + Space.cardWidth / 2

    let dx = Space.cardWidth + Space.pad

    // If their hand has too many cards for the screen size, scale down
    const maxOffset = Space.windowWidth - x0 - minRoom

    if (state !== undefined) {
      // Find the amount that we must scale down by
      // offset of last card <= maxOffset
      // This may be multiplied by a constant to fit within the max
      const lastCardOffset = dx * 5 //(state.opponentHandSize - 1)
      if (lastCardOffset > maxOffset) {
        dx *= maxOffset / lastCardOffset
      }
    }

    // Offset from the first card
    const xOffset = dx * i
    const x = x0 + xOffset
    let y = Space.handHeight - Space.cardHeight / 2

    return [x - container.x, y - container.y]
  }

  static story(
    state: GameModel,
    i: number,
    container: Phaser.GameObjects.Container,
    owner: number,
  ): [number, number] {
    const x0 = Flags.mobile
      ? Space.iconSize + Space.pad * 2 + Space.cardWidth / 2
      : 300
    let dx = Space.cardWidth - Space.storyXOverlap

    // Space to the right of the last card
    const rightPad = Flags.mobile ? 200 : 260
    const maxOffset = Space.windowWidth - x0 - Space.cardWidth / 2 - rightPad
    if (state !== undefined) {
      // Find the amount that we must scale down by
      // This may be multiplied by a constant to fit within the max
      // Length of cards displayed in the story
      let length = state.story.acts.length
      if (state.isRecap) {
        // TODO Greyed cards
        length += state.story.resolvedActs.length
      }

      const lastCardOffset = dx * (length - 1)
      if (lastCardOffset > maxOffset) {
        dx *= maxOffset / lastCardOffset
      }
    }

    const x = x0 + dx * i

    // Y
    let y
    switch (owner) {
      case undefined:
        y = Space.windowHeight / 2
        break
      case 0:
        y =
          Space.windowHeight / 2 + (Space.cardHeight / 2 - Space.storyYOverlap)
        break
      case 1:
        y =
          Space.windowHeight / 2 - (Space.cardHeight / 2 - Space.storyYOverlap)
        break
    }

    return [x - container.x, y - container.y]
  }

  static ourDeck(
    container?: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    const dx = 3 * i
    let x = 30 - dx
    let y = Space.windowHeight / 2 + Space.cardHeight / 2 + Space.pad

    if (container !== undefined) {
      x -= container.x
      y -= container.y
    }

    return [x, y]
  }

  static theirDeck(
    container?: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    const dx = 3 * i
    let x = 30 - dx
    let y = Space.windowHeight / 2 - Space.cardHeight / 2 - Space.pad

    if (container !== undefined) {
      x -= container.x
      y -= container.y
    }

    return [x, y]
  }

  static ourDiscard(
    container: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    const dx = 3 * i
    const x0 = Space.windowWidth - Space.cardWidth / 2 - Space.pad
    const x = x0 + dx
    const y = Space.windowHeight - 110
    return [x - container.x, y - container.y]
  }

  static theirDiscard(
    container: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    const dx = 3 * i
    const x0 = Space.windowWidth - Space.cardWidth / 2 - Space.pad
    const x = x0 + dx
    const y = 110
    return [x - container.x, y - container.y]
  }

  static overlay(
    container: Phaser.GameObjects.Container,
    i = 0,
    total: number,
    titleHeight = 0,
  ): [number, number] {
    const cardsPerRow = 15

    // TODO Center this horizontally, wrap vertically if we hit ~20 cards
    const iFromMiddle = Math.min(cardsPerRow, total)
    const x0 =
      Space.windowWidth / 2 - (Math.min(cardsPerRow - 1, total - 1) * 60) / 2
    const dx = 60 * (i % cardsPerRow)
    const x = x0 + dx

    const extraRows = Math.floor((total - 1) / cardsPerRow)
    const y0 =
      Space.windowHeight / 2 - (extraRows * (Space.cardHeight + Space.pad)) / 2
    const dy = (Space.cardHeight + Space.pad) * Math.floor(i / cardsPerRow)
    let y = y0 + dy
    // This is to reposition closer to the center when the title is visible
    if (extraRows === 0) {
      y -= titleHeight / 2
    }
    return [x - container.x, y - container.y]
  }

  static mulligan(
    container: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    const x0 = Space.windowWidth / 2 - Space.cardWidth - Space.pad
    const x = x0 + i * (Space.cardWidth + Space.pad)
    const y = Space.windowHeight / 2
    return [x - container.x, y - container.y]
  }

  // Removed from the game cards
  static gone(container: Phaser.GameObjects.Container): [number, number] {
    const x = Space.windowWidth / 2
    const y = Space.windowHeight / 2
    return [x - container.x, y - container.y]
  }
}
