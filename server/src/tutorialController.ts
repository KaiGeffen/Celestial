import { ServerController } from './gameController'
import { dove } from '../../shared/state/catalog/birds'
import { mercy } from '../../shared/state/catalog/water'
import { dash } from '../../shared/state/catalog/ashes'
import { stars, cosmos } from '../../shared/state/catalog/stars'
import { fruit } from '../../shared/state/catalog/pet'
import { uprising } from '../../shared/state/catalog/birth'

class TutorialController extends ServerController {
  constructor(num?: number) {
    const p_decks = [
      [
        dove,
        dove,
        dove,
        dove,
        dove,
        mercy,
        dash,
        mercy,
        dove,
        dash,
        dove,
        dash,
        dove,
        dove,
      ],
      [
        uprising,
        dove,
        mercy,
        dash,
        stars,
        stars,
        dove,
        stars,
        stars,
        uprising,
        stars,
        mercy,
        dove,
        stars,
      ],
      [
        uprising,
        dove,
        dove,
        fruit,
        dash,
        dove,
        dove,
        stars,
        cosmos,
        fruit,
        uprising,
        dove,
        stars,
        fruit,
        dove,
      ],
    ]
    const o_decks = [
      [
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
      ],
      [
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
      ],
      [
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dove,
        dash,
        dash,
        dash,
        dove,
        dash,
        dash,
        stars,
      ],
    ]

    let player_deck = [
      mercy,
      mercy,
      dove,
      dash,
      mercy,
      dove,
      dove,
      dash,
      dove,
      dove,
      dash,
      dove,
      dash,
      dove,
      dove,
    ]
    let ai_deck = [
      dove,
      mercy,
      dove,
      dove,
      mercy,
      dove,
      dove,
      dove,
      mercy,
      dove,
      dove,
      dove,
      dove,
      dove,
      dove,
    ]

    if (num !== undefined) {
      player_deck = p_decks[num]
      ai_deck = o_decks[num]
    }

    super(
      player_deck,
      ai_deck,
      { avatar: 0, border: 0 },
      { avatar: 0, border: 0 },
      false,
    )

    this.model.priority = 0
    this.model.wins[0] = 2
    this.model.mulligansComplete = [true, true]
  }

  protected doUpkeep() {
    super.doUpkeep()
    this.model.priority = 0
  }
}

export { TutorialController }
