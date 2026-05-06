const HOME_TIPS: string[] = [
  `Right-click a card's cutout to add another copy when building a deck.`,
  `Press 1-6 to play cards from hand when hotkeys are enabled.`,
  `Use Q/W to quickly see your deck and discard pile (A/S for opponent).`,
  `You can export deck codes from the deck editor to share them with friends.`,
  `Morning abilities trigger before you draw your cards for the round.`,
  `Check Match History to review recent games. You can even copy your opponent's deck!`,
  `The last player to play a card has priority, meaning they act first in the next round.`,
  `From the social menu in the top right, you can spectate and see what other players are up to.`,
  `Nourish applies before a card's effects, meaning that Fruit + Hurricane is no good :(`,
  `Click the moon to skip to the end of the night if you want to go fast.`,
  `Cards resolving first earn points, then trigger their effects, then move to the discard pile.`,
]

function dayIndexUTC(date: Date): number {
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  return Math.floor(utcMidnight / (24 * 60 * 60 * 1000))
}

export function getDailyHomeTip(date: Date = new Date()): string {
  const index = dayIndexUTC(date) % HOME_TIPS.length
  return HOME_TIPS[index]
}
