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
    {
      selectText: 'Blank Canvas',
      missionText: `I remember from pretty early on coming home from school and feeling so empty. Like nothing I had done throughout the day, and nothing I was going to do that night, really mattered to me. That was a hard time in my life - preserving this blank canvas because all the colors around me were so repulsive. All that I had back then was a little voice, telling me to get through this.`,
      uponRoundWinText: [
        `The blank canvas remains...`,
        `Maybe there's something worth painting.`,
        `I can see a faint outline forming.`,
        `The colors aren't so repulsive anymore.`,
        `I think I'm ready to start.`,
        `The canvas is calling to me.`,
      ],
      deck: {
        required: [0, 0, 4, 4, 4, 4, 9, 6, 7, 7, 12, 12, 13, 18, 18],
        optional: [],
      },
      opponentDeck: [3, 3, 3, 3, 3, 3, 6, 6, 6, 6, 11, 11, 14, 14, 17],
      winText: 'The little voice was right. I got through this.',
      loseText: 'The blank canvas is still there, waiting.',
    },
    {
      selectText: 'Rebirth',
      missionText: `When I turned 16, I remember my routine of keeping my head down and shutting up, was starting to break apart. I didn't know why, but I couldn't help but cry, or yell at my teachers. Seeing myself so out of control was a new kind of scary, and it didn't go away until I moved out from my parents. In every way you could see things were worse: I was a high-school dropout, living on people's couches, I ate much less, but inside I felt reborn. Light for the first time in years. That was the first time I started going by 'Jules'.`,
      uponRoundWinText: [
        `The old routine is breaking apart.`,
        `I can't keep my head down anymore.`,
        `The tears are coming, and that's okay.`,
        `I'm not out of control - I'm breaking free.`,
        `The light is getting brighter.`,
        `I am Jules, and I am reborn.`,
      ],
      deck: {
        required: [0, 0, 4, 4, 4, 4, 9, 7, 7, 51, 51, 18],
        optional: [],
      },
      opponentDeck: [3, 3, 3, 3, 3, 3, 6, 6, 6, 6, 11, 11, 14, 14, 17],
      winText: 'I am Jules, and I am light.',
      loseText: 'The rebirth is still happening, even in loss.',
    },
    {
      selectText: 'Finding Peace',
      missionText: `When I finally left the city I had grown up in, I traveled around for a couple years, not spending more than a couple months in any one spot. There was so much to see, so many different colors for me to try on. Each place I would land, I would introduce myself with no reservations, 'I am Jules'. This was either accepted or not, but not once did I hold onto the response. After everything, I was free.`,
      uponRoundWinText: [
        `I am Jules, no reservations.`,
        `Each place teaches me something new.`,
        `The colors are beautiful everywhere.`,
        `I don't need to hold onto anything.`,
        `Freedom feels like this.`,
        `I am Jules, and I am free.`,
      ],
      deck: {
        required: [65, 65, 7, 7, 7, 4, 4, 4, 4, 4],
        optional: [],
      },
      opponentDeck: [21, 51, 51, 14, 14, 11, 11, 6, 7, 7, 3, 3, 4, 4, 5],
      winText: 'I am Jules, and I have found peace.',
      loseText: "The journey continues, and that's okay.",
    },
    {
      selectText: 'Bonus: Sun',
      missionText: `Sometimes the light is so bright it hurts. But that's how you know it's real.`,
      uponRoundWinText: [
        `The sun is rising.`,
        `I can feel its warmth.`,
        `The light is almost too bright.`,
        `But I won't look away.`,
        `I am becoming the light.`,
        `I am the sun.`,
      ],
      deck: {
        required: [56, 65, 12],
        optional: [],
      },
      opponentDeck: [21, 20, 20, 17, 14, 14, 14, 6, 3, 3, 3, 3, 0, 0, 0],
      winText: 'I am the sun, and I shine.',
      loseText: 'Even the sun sets, but it always rises again.',
    },
    {
      selectText: 'Bonus: Morning Dew',
      missionText: `The morning dew catches the light in ways that make everything new again.`,
      uponRoundWinText: [
        `Fresh as morning dew.`,
        `Each drop reflects the light.`,
        `Everything feels renewed.`,
        `The world is sparkling.`,
        `I am refreshed.`,
        `I am the morning dew.`,
      ],
      deck: {
        required: [21, 20, 51, 63, 63],
        optional: [],
      },
      opponentDeck: [12, 12, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      winText: 'I am the morning dew, pure and fresh.',
      loseText: 'The dew will return with the next morning.',
    },
    {
      selectText: 'Bonus: Gamecock',
      missionText: `Sometimes you have to fight for what you believe in, even when the odds are against you.`,
      uponRoundWinText: [
        `I will not back down.`,
        `The fight is worth it.`,
        `I am stronger than I look.`,
        `My spirit cannot be broken.`,
        `I am ready for anything.`,
        `I am the gamecock.`,
      ],
      deck: {
        required: [51, 40, 40, 32, 63, 1, 3],
        optional: [],
      },
      opponentDeck: [12, 12, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      winText: 'I am the gamecock, and I have won.',
      loseText: 'The gamecock never gives up, even in defeat.',
    },
    {
      selectText: 'Bonus: Ecology',
      missionText: `Everything is connected. Every choice affects the whole. I am part of something bigger than myself.`,
      uponRoundWinText: [
        `I am connected to everything.`,
        `My choices matter.`,
        `I am part of the whole.`,
        `The web of life supports me.`,
        `I am in harmony.`,
        `I am ecology.`,
      ],
      deck: {
        required: [56, 71, 71, 69, 69],
        optional: [],
      },
      opponentDeck: [12, 12, 12, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      winText: 'I am ecology, and I am in balance.',
      loseText: 'The ecosystem continues, with or without me.',
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
