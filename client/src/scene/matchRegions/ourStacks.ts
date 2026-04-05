import 'phaser'
import CardLocation from './cardLocation'
import PlayerStacksRegion from './playerStacksRegion'

/**
 * Our deck (cardbacks) and discard pile — see {@link PlayerStacksRegion}.
 */
export default class OurStacksRegion extends PlayerStacksRegion {
  protected ownerIndex(): 0 | 1 {
    return 0
  }

  protected deckRotationRad(): number {
    return -Math.PI / 32
  }

  protected discardRotationRad(): number {
    return Math.PI / 32
  }

  protected deckLocation(
    parent: Phaser.GameObjects.Container,
    i: number,
  ): [number, number] {
    return CardLocation.ourDeck(parent, i)
  }

  protected discardLocation(
    parent: Phaser.GameObjects.Container,
    i: number,
  ): [number, number] {
    return CardLocation.ourDiscard(parent, i)
  }
}
