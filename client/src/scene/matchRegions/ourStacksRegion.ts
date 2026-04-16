import 'phaser'
import CardLocation from './cardLocation'
import StacksRegionBase from './stacksRegionBase'

/**
 * Our deck (cardbacks) and discard pile — see {@link StacksRegionBase}.
 */
export default class OurStacksRegion extends StacksRegionBase {
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

  protected deckHotkeyLetter(): string {
    return 'Q'
  }

  protected discardHotkeyLetter(): string {
    return 'W'
  }

  /** Used by tutorial flow to hide pile controls. */
  tutorialHide(): void {
    if (this.btnDeck) {
      this.btnDeck.setVisible(false)
    }
    if (this.btnDiscard) {
      this.btnDiscard.setVisible(false)
    }
  }
}
