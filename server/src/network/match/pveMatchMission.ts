import PveMatch from './pveMatch'
import { ServerWS } from '../../../../shared/network/celestialTypedWebsocket'
import { Deck } from '../../../../shared/types/deck'
import { updateJourneyProgress } from '../../db/updateMatchResult'
import {
  getMissionById,
  missionToAiDeck,
} from '../../../../shared/journey/journey'

class PveMatchMission extends PveMatch {
  private missionID: number
  private missionCards: number[]

  constructor(
    ws: ServerWS,
    uuid: string,
    deck: Deck,
    missionID: number,
  ) {
    const mission = getMissionById(missionID)
    if (!mission) {
      throw new Error(`Mission not found: ${missionID}`)
    }
    const aiDeck = missionToAiDeck(mission)
    super(ws, uuid, deck, aiDeck)
    this.missionID = missionID
    this.missionCards = mission.cards ?? []
  }

  protected async updateDatabases() {
    await super.updateDatabases()

    if (this.game.model.winner === 0) {
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
