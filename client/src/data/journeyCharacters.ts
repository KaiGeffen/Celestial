export type JourneyMission = {
  selectText: string
  missionText: string
  uponRoundWinText: [string, string, string, string, string, string]
  deck: number[]
  opponentDeck: number[]
  winText: string
  loseText: string
}

export type JourneyMissionTracks = JourneyMission[][]

const JOURNEY_MISSIONS: JourneyMissionTracks = [
  // Jules
  [
    {
      selectText: 'Help me find my truth!',
      missionText: `Don't hold back. The only thing you owe anyone is your truth.`,
      uponRoundWinText: [
        `I won't stop until I know the truth.`,
        '1',
        '2 Oh, maybe that is the truth.',
        '3 Nope, not that...',
        '4 Hrmmmm :/',
        '5 Wait, I got it!',
      ],
      deck: [56, 65, 65, 12, 12, 7, 7, 7, 7, 4, 4, 4, 4, 4, 4],
      opponentDeck: [],
      winText: 'You are a true friend.',
      loseText: 'You are a true friend, but I did lose :/',
    },
    // More levels
  ],
  // Adonis
  [
    {
      selectText: `Let's do this!`,
      missionText: `You can only run for so long before the shadows catch up.`,
      uponRoundWinText: [
        `Fire begins`,
        ``,
        `22222`,
        `33`,
        `4`,
        `5 let's go bay-beeeee`,
      ],
      deck: [21, 20, 20, 17, 17, 14, 14, 6, 3, 3, 3, 3, 3, 0, 0],
      opponentDeck: [1, 1, 1],
      winText: 'Fire stuff idk...',
      loseText: 'I have burned too bright!',
    },
    // More levels
  ],
]

export default JOURNEY_MISSIONS
