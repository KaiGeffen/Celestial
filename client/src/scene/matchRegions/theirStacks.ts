import 'phaser'
import CardLocation from './cardLocation'
import PlayerStacksRegion from './playerStacksRegion'

/**
 * Opponent deck (cardbacks) and discard pile — see {@link PlayerStacksRegion}.
 */
export default class TheirStacksRegion extends PlayerStacksRegion {
  protected ownerIndex(): 0 | 1 {
    return 1
  }

  protected deckRotationRad(): number {
    return Math.PI + Math.PI / 32
  }

  protected discardRotationRad(): number {
    return Math.PI - Math.PI / 32
  }

  protected deckLocation(
    parent: Phaser.GameObjects.Container,
    i: number,
  ): [number, number] {
    return CardLocation.theirDeck(parent, i)
  }

  protected discardLocation(
    parent: Phaser.GameObjects.Container,
    i: number,
  ): [number, number] {
    return CardLocation.theirDiscard(parent, i)
  }
}
