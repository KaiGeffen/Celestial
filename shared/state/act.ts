import Card from '../../shared/state/card'

export default class Act {
  // Used for the animator client side
  public pointsFromStartingPoints: number = 0
  public pointsFromNourish: number = 0
  public pointsFromEffects: number = 0

  constructor(
    public card: Card,
    public owner: number,
    public revealed = false,
  ) {}
}
