export class Statuses {
  public inspire = 0
  public inspired = 0
  public nourish = 0
  public vision = 0
  public unlocked = false

  public getDeepCopy(): Statuses {
    const copy = new Statuses()
    copy.inspire = this.inspire
    copy.inspired = this.inspired
    copy.nourish = this.nourish
    copy.vision = this.vision
    copy.unlocked = this.unlocked
    return copy
  }
}
