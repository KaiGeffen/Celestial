export class Statuses {
  public inspire = 0
  public inspired = 0
  public nourish = 0
  public vision = 0
  public possibility = 0
  public retain = 0

  public getDeepCopy(): Statuses {
    const copy = new Statuses()
    copy.inspire = this.inspire
    copy.inspired = this.inspired
    copy.nourish = this.nourish
    copy.vision = this.vision
    copy.retain = this.retain
    copy.possibility = this.possibility
    return copy
  }
}
