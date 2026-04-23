const HOME_TIPS: string[] = [
  `Tip: Right-click a card's cutout to add another copy when building a deck.`,
  `Tip: Press 1-6 to play cards from hand when hotkeys are enabled.`,
  `Tip: Use Q/W to quickly see your deck and discard pile (A/S for opponent).`,
  `Tip: You can export deck codes from the deck editor to share them with friends.`,
  `Tip: Morning abilities trigger before you draw your cards for the round.`,
  `Tip: Check Match History to review recent games. You can even copy your opponent's deck!`,
  `Tip: The last player to play a card has priority, meaning they act first in the next round.`,
  `Tip: From the social menu in the top right, you can spectate and see what other players are up to.`,
  `Tip: Nourish applies before a card's effects, meaning that Fruit + Hurricane is no good :(`,
  `Tip: Click the moon to skip to the end of the night if you want to go fast.`,
  `Tip: Cards resolving first earn points, then trigger their effects, then move to the discard pile.`,
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
