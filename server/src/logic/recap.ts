class Recap {
  story: Array<[string, number, string]>
  sums: [number, number]
  wins: [number, number]
  safety: [number, number]
  stateList: Array<[any, any]>

  constructor(
    story: Array<[string, number, string]> = [],
    sums: [number, number] = [0, 0],
    wins: [number, number] = [0, 0],
    safety: [number, number] = [0, 0],
    stateList: Array<[any, any]> = []
  ) {
    this.story = story
    this.sums = sums
    this.wins = wins
    this.safety = safety
    this.stateList = stateList
  }

  add(card: string, owner: number, text: string): void {
    this.story.push([card, owner, text])
  }

  addState(statePair: [any, any]): void {
    this.stateList.push(statePair)
  }

  addTotal(
    sums: [number, number],
    wins: [number, number],
    safety: [number, number]
  ): void {
    this.sums[0] += sums[0]
    this.sums[1] += sums[1]

    this.wins[0] += wins[0]
    this.wins[1] += wins[1]

    this.safety[0] += safety[0]
    this.safety[1] += safety[1]
  }

  reset(): void {
    this.story = []
    this.sums = [0, 0]
    this.wins = [0, 0]
    this.safety = [0, 0]
    this.stateList = []
  }

  getFlipped(): Recap {
    const story = this.story.map(([card, owner, text]) => [
      card,
      (owner + 1) % 2,
      text,
    ])
    const sums = [this.sums[1], this.sums[0]]
    const wins = [this.wins[1], this.wins[0]]
    const safety = [this.safety[1], this.safety[0]]
    const stateList = this.stateList.map((relativeStates) => [
      relativeStates[1],
      relativeStates[0],
    ])

    return new Recap(story, sums, wins, safety, stateList)
  }

  getStateList(player: number): Array<any> {
    return this.stateList.map((relativeStates) => relativeStates[player])
  }
}
