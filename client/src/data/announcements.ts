import { Color } from '../settings/settings'

// Announcement blocks shown on the home screen; edit per release.
// [area=_link_*] areas open external pages; [area=_CardName] shows that card.
const ANNOUNCEMENT_PAIRS: { subheader: string; body: string }[] = [
  // {
  //   subheader: 'Steam',
  //   body: `Our [area=_link_steam][stroke=${Color.goldS}]Steam page[/stroke][/area] is up! We'd love if you could wishlist, and look forward to the demo release at [area=_link_nextfest][stroke=${Color.goldS}]Steam Next Fest[/stroke][/area] in October.`,
  // },
  {
    subheader: 'Ranked',
    body: `This 3rd ranked season will be a bit different.

The player who wins the most PvP games throughout the season will get to design the next cardback.

Each player who wins 10 PvP games throughout the season will receive that cardback once it's ready.

Competing for the top spot on the leaderboard is still encouraged, but the prizes for those placements will just be [img=gem] rewards.

In addition, this month's tournament is coming up on August 22nd at 1PM ET, features a 250$ prize pool, as well as a new cardback for all participants.
[area=_link_tournament][stroke=${Color.goldS}]Register here![/stroke][/area]`,
  },
  // {
  //   subheader: 'Currencies & Cosmetics',
  //   body: `Gems have arrived in the Celestial realm!

  //   Earn 1[img=gem] for each PvP match played, plus a small chance to get 3-5[img=gem] from each plant in your garden. These shiny rewards can be traded for new cosmetic items in the Store under the Cosmetics tab.`,
  // },
  //   {
  //     subheader: 'Ranked',
  //     body: `Our second ranked season is nearly finished!

  // Secure your spot in the top 10 by midnight EST on July 31st for the next cardback, and for the #1 player, the chance to help design that cardback!`,
  //   },
  {
    subheader: 'Cards',
    body: `New cards: [area=_Voices][stroke=${Color.goldS}]Voices[/stroke][/area], [area=_Moloch][stroke=${Color.goldS}]Moloch[/stroke][/area], [area=_Sudden Insight][stroke=${Color.goldS}]Sudden Insight[/stroke][/area], and [area=_Iceberg][stroke=${Color.goldS}]Iceberg[/stroke][/area]

[area=_Siren][stroke=${Color.goldS}]Siren[/stroke][/area] New art + name
[area=_Boa][stroke=${Color.goldS}]Boa[/stroke][/area] points 6 → 7
[area=_The Future][stroke=${Color.goldS}]The Future[/stroke][/area] cost 8 → 9
[area=_Sun][stroke=${Color.goldS}]Sun[/stroke][/area] Inspire 1 → 0, Inspired 2 → 3`,
  },
]

export default ANNOUNCEMENT_PAIRS
