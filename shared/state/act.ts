import Card from '../../shared/state/card'

export default class Act {
  constructor(
    public card: Card,
    public owner: number,
    public revealed = false,
    // Used for the animator client side
    public pointsFromEffects: number = 0,
    public pointsFromNourish: number = 0,
  ) {}
}
