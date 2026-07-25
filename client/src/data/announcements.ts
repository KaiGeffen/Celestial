import { Color } from '../settings/settings'

// Announcement blocks shown on the home screen; edit per release.
// [area=_link_*] areas open external pages; [area=_CardName] shows that card.
const ANNOUNCEMENT_PAIRS: { subheader: string; body: string }[] = [
  // {
  //   subheader: 'Steam',
  //   body: `Our [area=_link_steam][stroke=${Color.goldS}]Steam page[/stroke][/area] is up! We'd love if you could wishlist, and look forward to the demo release at [area=_link_nextfest][stroke=${Color.goldS}]Steam Next Fest[/stroke][/area] in October.`,
  // },
  {
    subheader: 'Tournament',
    body: `Our 13th tournament has concluded!

Big thank you to the tournament organizers at Fate Leageu, and everyone who played (Check your inventory for the new cardback!)

Huge congrats to the top 4 players:
Rain, SubNova, ElineX, and Sespiny!`,
    //     body: `Our next tournament will kick off July 25th at 1 PM EST.
    // [area=_link_tournament][stroke=${Color.goldS}]Register here![/stroke][/area]

    // 250$ prize pool split as follows: $100 for 1st, $75 for 2nd, $50 for 3rd, and $25 consolation prize for a random non-placing participant. All attendees will receive an all-new cardback.`,
  },
  // {
  //   subheader: 'Currencies & Cosmetics',
  //   body: `Gems have arrived in the Celestial realm!

  //   Earn 1[img=gem] for each PvP match played, plus a small chance to get 3-5[img=gem] from each plant in your garden. These shiny rewards can be traded for new cosmetic items in the Store under the Cosmetics tab.`,
  // },
  {
    subheader: 'Ranked',
    body: `Our second ranked season is nearly finished!

Secure your spot in the top 10 by midnight EST on July 31st for the next cardback, and for the #1 player, the chance to help design that cardback!`,
  },
  {
    subheader: '???',
    body: `
Something.... approaches...?

I hear... [area=_Voices][stroke=${Color.goldS}]Voices[/stroke][/area]...

Outside the walls... Howling...

[area=_Abandoned][stroke=${Color.goldS}]Abandoned[/stroke][/area]...`,

    // [area=_Paramountcy][stroke=${Color.goldS}]Paramountcy[/stroke][/area] cards added 4 → 3
    // [area=_Heron][stroke=${Color.goldS}]Heron[/stroke][/area] cost 1 → 2
    // [area=_Clear View][stroke=${Color.goldS}]Clear View[/stroke][/area] the created [area=_Seen][stroke=${Color.goldS}]Seen[/stroke][/area] points 0 → 1
    // [area=_Moon][stroke=${Color.goldS}]Moon[/stroke][/area] points 5 → 4
    // [area=_Sensualist][stroke=${Color.goldS}]Sensualist[/stroke][/area] cost and points 5 → 4
    // [area=_Fates][stroke=${Color.goldS}]Fates[/stroke][/area] 2nd Exhale cost 3 → 2
    // [area=_The Future][stroke=${Color.goldS}]The Future[/stroke][/area] points 4 → 5,
  },
]

export default ANNOUNCEMENT_PAIRS
