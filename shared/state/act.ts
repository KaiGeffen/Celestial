import Card from '../../shared/state/card'

export default class Act {
  constructor(
    public card: Card,
    public owner: number,
    public revealed = false,
  ) {}
}
