import PveMatch from './pveMatch'
import { SpecialController } from '../../gameControllerSpecial'
import { ServerWS } from '../../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../../shared/types/deck'
import { getCardWithVersion } from '../../../../shared/state/cardUpgrades'
import Catalog from '../../../../shared/state/catalog'
import Card from '../../../../shared/state/card'
import { ServerController } from '../../gameController'

class PveSpecialMatch extends PveMatch {
  constructor(
    ws: ServerWS,
    uuid: string,
    deck: Deck,
    aiDeck: Deck,
    enabledModes: number[],
  ) {
    super(ws, uuid, deck, aiDeck)

    // TODO Silly to do this, starts a game then starts another game

    // First convert cards to upgraded versions
    const deck1Cards: Card[] = this.deck1.cards
      .map((cardId, index) => {
        const version = this.deck1.cardUpgrades?.[index] || 0
        return getCardWithVersion(cardId, version, Catalog)
      })
      .filter(Boolean)
    const deck2Cards: Card[] = this.deck2.cards
      .map((cardId, index) => {
        const version = this.deck2.cardUpgrades?.[index] || 0
        return getCardWithVersion(cardId, version, Catalog)
      })
      .filter(Boolean)

    // Start the game
    this.game = new SpecialController(enabledModes)
    this.game.startGame(
      deck1Cards,
      deck2Cards,
      this.deck1.cosmeticSet,
      this.deck2.cosmeticSet,
    )
  }
}

export default PveSpecialMatch
