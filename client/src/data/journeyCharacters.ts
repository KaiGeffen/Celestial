export type JourneyMission = {
  selectText: string
  missionText: string
  uponRoundWinText: [string, string, string, string, string, string]
  deck: {
    required: number[]
    optional: number[]
  }
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
      deck: {
        required: [56, 65, 65, 12, 12],
        optional: [7, 7, 7, 7, 4, 4, 4, 4, 4, 4],
      },
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
      deck: {
        required: [21, 20, 20, 17, 17],
        optional: [14, 14, 6, 3, 3, 3, 3, 3, 0, 0],
      },
      opponentDeck: [1, 1, 1],
      winText: 'Fire stuff idk...',
      loseText: 'I have burned too bright!',
    },
    // More levels
  ],
  // Mia
  [
    {
      selectText: 'Shadows uwu',
      missionText: `gotta go shadow or something`,
      uponRoundWinText: [
        `0 I am afraid of the dark`,
        `1 I am not afraid of the dark`,
        `2 I am not afraid of the dark`,
        `3 I am not afraid of the dark`,
        `4 I am not afraid of the dark`,
        `5 I am not afraid of the dark`,
      ],
      deck: {
        required: [1, 1, 1, 1, 1, 1],
        optional: [35, 35, 13, 20, 19, 19, 19, 19, 23],
      },
      opponentDeck: [],
      winText: 'You are a true shadow.',
      loseText: 'I lost oh nooooo',
    },
    // More levels
  ],
  // Kitz
  [
    {
      selectText: 'I am a cat',
      missionText: `I am a cat and this is my mission`,
      uponRoundWinText: [
        `0 I am afraid of the cat`,
        `1 I am not afraid of the cat`,
        `2 I am not afraid of the cat`,
        `3 I am not afraid of the cat`,
        `4 I am not afraid of the cat`,
        `5 I am not afraid of the cat`,
      ],
      deck: {
        required: [0, 0, 4, 4, 28],
        optional: [33, 33, 33, 33, 34, 34, 11, 11, 11, 71],
      },
      opponentDeck: [],
      winText: 'I have won.',
      loseText: 'I lost :/',
    },
    // More levels
  ],
  // Imani
  [
    {
      selectText: 'I am a doula',
      missionText: `I am a doula and this is my mission`,
      uponRoundWinText: [
        `0 I am afraid of the doula`,
        `1 I am not afraid of the doula`,
        `2 I am not afraid of the doula`,
        `3 I am not afraid of the doula`,
        `4 I am not afraid of the doula`,
        `5 I am not afraid of the doula`,
      ],
      deck: {
        required: [22, 22, 66, 60, 10],
        optional: [11, 8, 8, 8, 4, 4, 2, 2, 2, 2],
      },
      opponentDeck: [],
      winText: 'I have won and I am a doula.',
      loseText: 'I lost and I am a doula.',
    },
    // More levels
  ],
  // Mitra
  [
    {
      selectText: 'I am a seeker',
      missionText: `I am a seeker and this is my mission`,
      uponRoundWinText: [
        `0 I am afraid of the seeker`,
        `1 I am not afraid of the seeker`,
        `2 I am not afraid of the seeker`,
        `3 I am not afraid of the seeker`,
        `4 I am not afraid of the seeker`,
        `5 I am not afraid of the seeker`,
      ],
      deck: {
        required: [50, 27, 27, 27, 27],
        optional: [25, 88, 88, 31, 39, 11, 13, 91, 45, 45],
      },
      opponentDeck: [],
      winText: 'I have won and I am a seeker.',
      loseText: 'I lost and I am a seeker.',
    },
    // More levels
  ],
]

export default JOURNEY_MISSIONS
