export class Keyword {
  constructor(
    public name: string,
    public text: string,
    public hasX: Boolean,
  ) {}
}

export class Keywords {
  static get(key: string): Keyword {
    return Keywords.getAll().find((keyword) => keyword.name === key)
  }
  static getAll(): Keyword[] {
    return [
      Keywords.visible,
      Keywords.fleeting,
      Keywords.morning,
      Keywords.sight,
      Keywords.inspire,
      Keywords.inspired,
      Keywords.nourish,
      Keywords.birth,
      Keywords.exhale,
      Keywords.refresh,
    ]
  }

  // Qualities
  static visible = new Keyword(
    'Visible',
    "[color=#FABD5D]Visible[/color]: Both players can see this card while it's in the story.",
    false,
  )
  static fleeting = new Keyword(
    'Fleeting',
    '[color=#FABD5D]Fleeting[/color]: After resolving, this card is removed from the game.',
    false,
  )

  // On play
  static refresh = new Keyword(
    'Refresh',
    '[color=#FABD5D]Refresh[/color]: When played, put the leftmost card in your hand on the bottom of your deck, then draw a card if you did. Your opponent doesn’t see you do this.',
    false,
  )

  // Triggers
  static morning = new Keyword(
    'Morning',
    '[color=#FABD5D]Morning[/color]: At the start of each round, if this is the top card of your discard pile, trigger the following effect.',
    false,
  )

  // Abilities with X
  static sight = new Keyword(
    'Sight',
    '[color=#FABD5D]Sight X[/color]: Increase your Sight by X. Sight N makes the first N cards in the story visible to you, and is removed at end of round.',
    true,
  )
  static inspire = new Keyword(
    'Inspire',
    '[color=#FABD5D]Inspire X[/color]: Next round you have X extra breath.',
    true,
  )
  static inspired = new Keyword(
    'Inspired',
    '[color=#FABD5D]Inspire X[/color]: This round you have X extra breath.',
    true,
  )
  static nourish = new Keyword(
    'Nourish',
    '[color=#FABD5D]Nourish X[/color]: The next card you resolve is worth +X points.',
    true,
  )
  static birth = new Keyword(
    'Birth',
    '[color=#FABD5D]Birth X[/color]: If you have a Child in hand, increase its points by X. Otherwise create a 0:X [color=#FABD5D]Fleeting[/color] Child in hand.',
    true,
  )
  static exhale = new Keyword(
    'Exhale',
    '[color=#FABD5D]Exhale X[/color]: If you can, spend X breath to trigger the following effect.',
    true,
  )
}
