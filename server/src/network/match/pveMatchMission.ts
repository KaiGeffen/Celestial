import PveMatch from './pveMatch'
import { ServerWS } from '../../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../../shared/types/deck'
import {
  recordMissionOutcome,
  updateJourneyProgress,
} from '../../db/updateMatchResult'
import {
  getMissionById,
  missionToAiDeck,
} from '../../../../shared/journey/journey'
import { ServerController } from '../../gameController'
import Catalog from '../../../../shared/state/catalog'

class PveMatchMission extends PveMatch {
  private missionID: number
  private missionCards: number[]

  constructor(ws: ServerWS, uuid: string, deck: Deck, missionID: number) {
    const mission = getMissionById(missionID)
    if (!mission) {
      throw new Error(`Mission not found: ${missionID}`)
    }

    // Get opponent's deck
    const aiDeck = missionToAiDeck(mission)

    super(ws, uuid, deck, aiDeck)

    // Set important mission details for use later
    this.missionID = missionID
    this.missionCards = mission.cards ?? []
  }

  async startMatch() {
    const user1 = await this.getUsernameElo(this.uuid1)

    // Make a new game
    this.game = new ServerController()
    this.game.startGame(
      this.deck1.cards.map((cardId) => Catalog.getCardById(cardId)),
      this.deck2.cards.map((cardId) => Catalog.getCardById(cardId)),
      this.deck1.cosmeticSet,
      this.deck2.cosmeticSet,
      user1.username,
      'Umbra',
      'My Friend',
      'Curious Spirit',
    )
  }

  protected async updateDatabases() {
    await super.updateDatabases()

    const playerWon = this.game.model.winner === 0
    await recordMissionOutcome(this.missionID, playerWon).catch((error) => {
      console.error('Error recording mission stats:', error)
    })

    if (playerWon) {
      await updateJourneyProgress(
        this.uuid1,
        this.missionID,
        this.missionCards,
      ).catch((error) => {
        console.error('Error updating journey progress:', error)
      })
    }
  }
}

export default PveMatchMission
