import Card from '../../shared/state/card'

export default class Act {
  // Used for the animator client side
  scoreAtResolution?: [number, number]
  nourishAtResolution?: [number, number]

  constructor(
    public card: Card,
    public owner: number,
    public revealed = false,
  ) {}
}
