import Card from './state/card'
import { Zone } from './state/zone'

export enum Visibility {
  // Know that a card has been drawn but don't know the card
  KnowItOccurred = 0,
  // Know that a card has been drawn and know the card
  KnowAllDetails = 1,
  // Don't know the action occurred
  FullyUnknown = 2,
}

export class Animation {
  public from?: Zone
  public to?: Zone
  public card?: Card
  public index?: number
  public index2?: number
  // How visible this action is to the opponent
  public visibility?: Visibility

  constructor(init?: Partial<Animation>) {
    Object.assign(this, init)
  }
}
