// Locations for all of the cards on screen based on their region and index

import 'phaser'

import GameModel from '@shared/state/gameModel'
import { Space, Flags } from '../../settings/settings'

// TODO Remove this, deck and discard are no longer used
const todoTheirHandHeight = Space.todoHandOffset - 150

// This describes where on screen each card in each region should appear
// so that regions can move their cards to the appropriate locations for
// other regions
export default class CardLocation {
  static ourHand(
    state: GameModel,
    i: number,
    container?: Phaser.GameObjects.Container,
    /** When set (e.g. optimistic layout after a play), used instead of `state.hand[0].length` for dx / centering. */
    handCountForLayout?: number,
  ): [number, number] {
    let dx = Space.cardWidth - 1

    if (state !== undefined) {
      const totalCards = handCountForLayout ?? state.hand[0].length

      // If total width exceeds max, scale down spacing
      const maxWidth = Space.windowWidth - 1200
      const totalWidth = dx * (totalCards - 1)
      if (totalWidth > maxWidth) {
        dx *= maxWidth / totalWidth
      }

      // Center the whole hand horizontally: first/last card centers span
      // symmetrically around `Space.windowWidth / 2`.
      const firstCardCenterX =
        Space.windowWidth / 2 - (dx * (totalCards - 1)) / 2
      const x = firstCardCenterX + i * dx
      let y = Space.windowHeight + Space.cardHeight / 2 - Space.todoHandOffset

      if (container !== undefined) {
        return [x - container.x, y - container.y]
      }
      return [x, y]
    }

    return [0, 0]
  }

  static theirHand(
    state: GameModel,
    i: number,
    container: Phaser.GameObjects.Container,
  ): [number, number] {
    // Mirror `ourHand`: centered row along the top edge (opponent).
    let dx = Space.cardWidth

    if (state !== undefined) {
      const totalCards = state.hand[1].length

      const maxWidth = Space.windowWidth - 1200
      const totalWidth = dx * (totalCards - 1)
      if (totalWidth > maxWidth) {
        dx *= maxWidth / totalWidth
      }

      const firstCardCenterX =
        Space.windowWidth / 2 - (dx * (totalCards - 1)) / 2
      const x = firstCardCenterX + i * dx
      const y = -Space.cardHeight / 2 + Space.todoHandOffset

      return [x - container.x, y - container.y]
    }

    return [0, 0]
  }

  // Left edge of the first story card, and blank space kept to the right of the
  // last one so the story never runs under the sun.
  static readonly STORY_X0 = 230
  private static readonly STORY_RIGHT_PAD = 200

  // Horizontal gap between story cards, squished so `length` of them still fit
  // before the sun. Single source of truth for story spacing (see Animator).
  static storyDx(length: number): number {
    let dx = Space.cardWidth * 0.8 - Space.storyXOverlap
    if (length <= 1) {
      return dx
    }

    const maxOffset =
      Space.windowWidth -
      CardLocation.STORY_X0 -
      Space.cardWidth / 2 -
      CardLocation.STORY_RIGHT_PAD
    const lastCardOffset = dx * (length - 1)
    if (lastCardOffset > maxOffset) {
      dx *= maxOffset / lastCardOffset
    }
    return dx
  }

  static story(
    state: GameModel,
    i: number,
    container: Phaser.GameObjects.Container,
    owner: number,
    /** Card count to space for; overrides the state's story length so the row
     * can squish for a not-yet-committed card being staged. */
    lengthOverride?: number,
  ): [number, number] {
    // Length of cards displayed in the story
    let length = lengthOverride
    if (length === undefined && state !== undefined) {
      length = state.story.acts.length
      if (state.isRecap) {
        // TODO Greyed cards
        length += state.story.resolvedActs.length
      }
    }

    const dx = CardLocation.storyDx(length ?? 1)
    const x = CardLocation.STORY_X0 + dx * i

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
    const x = 320
    const y = Space.windowHeight - todoTheirHandHeight

    // Small stagger so multiple cardbacks are visible.
    const deckBackXOffsetPx = -3
    const deckBackYOffsetPx = -3
    const ox = deckBackXOffsetPx * i
    const oy = deckBackYOffsetPx * i

    return [x + ox - (container?.x || 0), y + oy - (container?.y || 0)]
  }

  static theirDeck(
    container?: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    // Mirror `ourDeck` along the top edge (same x / stagger pattern; y from top).
    const x = 320
    const y = todoTheirHandHeight

    const deckBackXOffsetPx = -3
    const deckBackYOffsetPx = 3
    const ox = deckBackXOffsetPx * i
    const oy = deckBackYOffsetPx * i

    return [x + ox - (container?.x || 0), y + oy - (container?.y || 0)]
  }

  static ourDiscard(
    container: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    const x = Space.windowWidth - 320
    const y = Space.windowHeight - todoTheirHandHeight

    // Small stagger so multiple cardbacks are visible.
    const deckBackXOffsetPx = -3
    const deckBackYOffsetPx = -3
    const ox = -deckBackXOffsetPx * i
    const oy = deckBackYOffsetPx * i

    return [x + ox - (container?.x || 0), y + oy - (container?.y || 0)]
  }

  static theirDiscard(
    container: Phaser.GameObjects.Container,
    i = 0,
  ): [number, number] {
    // Mirror `ourDiscard` along the top edge (same x as bottom-right; y from top).
    const x = Space.windowWidth - 320
    const y = todoTheirHandHeight

    const deckBackXOffsetPx = -3
    const deckBackYOffsetPx = 3
    const ox = -deckBackXOffsetPx * i
    const oy = deckBackYOffsetPx * i

    return [x + ox - (container?.x || 0), y + oy - (container?.y || 0)]
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
