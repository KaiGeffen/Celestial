import 'phaser'

import DeckEditorScene from './deckEditorScene'
import { UserSettings } from '../settings/settings'
import type { MissionDetails } from '../../../shared/journey/journey'
import { Deck } from '../../../shared/types/deck'

/**
 * Deck editor opened from the journey map: Save / Back return to `JourneyScene`;
 * Play starts `JourneyMatchScene` for the selected mission.
 */
export default class JourneyEditorScene extends DeckEditorScene {
  private mission!: MissionDetails

  constructor() {
    super('JourneyEditorScene', 'JourneyScene')
  }

  create(params: { deckIndex: number; mission: MissionDetails }) {
    this.mission = params.mission
    super.create({ deckIndex: params.deckIndex })
  }

  protected getInitialCardIds(deck: Deck): number[] {
    if (this.mission?.deck?.length) {
      return [...this.mission.deck]
    }
    return super.getInitialCardIds(deck)
  }

  protected editorReturnScene(): string {
    return 'JourneyScene'
  }

  protected getDiscardBackMessage(): string {
    return 'Discard your changes and return to the journey map?'
  }

  protected handlePlayClick(): void {
    this.saveCurrentDeck()
    UserSettings._set('equippedDeckIndex', this.deckIndex)

    const opponent = this.mission.opponent
    if (!opponent?.length) {
      this.showMessage('This mission is missing opponent data.')
      return
    }

    const cosmeticSet =
      this.cosmeticSet ?? { avatar: 0, border: 0, cardback: 0 }

    const playerDeck: Deck = {
      name: this.deckName,
      cards: this.getDeckCode(),
      cosmeticSet,
    }

    const aiDeck: Deck = {
      name: 'AI Deck',
      cards: opponent,
      cosmeticSet: {
        avatar: 0,
        border: 0,
        cardback: 0,
        relic: 0,
      },
    }

    this.scene.start('JourneyMatchScene', {
      deck: playerDeck,
      aiDeck,
      missionID: this.mission.id,
      missionCards: this.mission.cards ?? [],
    })
  }
}
