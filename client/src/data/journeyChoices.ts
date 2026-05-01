export interface JourneyChoiceOption {
  text: string
  result: string
}

export interface JourneyChoiceData {
  intro: string
  options: [JourneyChoiceOption, JourneyChoiceOption]
}

const JOURNEY_CHOICES: JourneyChoiceData[] = [
  // 0 — Jules
  {
    intro: 'Jules pauses at the edge of the sky, wings trembling.\n\n"I think I\'m finally ready," they say. "But I don\'t know which way to go."',
    options: [
      {
        text: 'Fly toward the warm light on the horizon.',
        result: 'Jules chooses the light.\n\nThey disappear into the glow, feathers catching fire — not from pain, but from release.\n\nSomewhere, a story resolves.',
      },
      {
        text: 'Turn back to the ones still waiting below.',
        result: 'Jules descends, landing gently among the others still waiting.\n\n"A little longer," they say. "I can help."\n\nSometimes resolution means staying.',
      },
    ],
  },
  // 1 — Adonis
  {
    intro: 'Adonis stands before the flame he\'s tended his whole story.\n\n"It was never about the burning," he says quietly. "Was it?"',
    options: [
      {
        text: 'Let the fire go out on its own.',
        result: 'Adonis watches the last ember fade.\n\nHe breathes in the cool air — for the first time, without fear.\n\nThe ashes settle. The story ends clean.',
      },
      {
        text: 'Scatter the ashes yourself, and walk away.',
        result: 'Adonis scatters the ashes with both hands.\n\nHe does not look back as he walks into the quiet.\n\nTo choose the ending is also a kind of freedom.',
      },
    ],
  },
  // 2 — Mia
  {
    intro: 'Mia faces her shadow for the last time.\n\n"I used to run from you," she says. "I don\'t need to anymore."',
    options: [
      {
        text: 'Embrace the shadow.',
        result: 'Mia steps forward and holds her shadow close.\n\nFor a moment they are one thing — then two — then neither.\n\nPeace is not the absence of darkness.',
      },
      {
        text: 'Name the shadow, and let it go.',
        result: 'Mia gives her shadow a name it has always deserved.\n\nIt nods. It dissolves.\n\nShe stands in clear light, surprised to find she isn\'t smaller for it.',
      },
    ],
  },
  // 3 — Kitz
  {
    intro: 'Kitz holds the thing he\'s been searching for.\n\nIt\'s exactly what he thought it would be. And also completely different.\n\n"Now what?" he wonders.',
    options: [
      {
        text: 'Share it with everyone you\'ve met along the way.',
        result: 'Kitz gives pieces of it away — to each one who helped, who hurt, who passed by.\n\nHe arrives at the end with empty hands and a full story.',
      },
      {
        text: 'Keep it. It was always yours.',
        result: 'Kitz holds it tightly, then loosely, then just holds it.\n\n"Mine," he says — not possessively, but as recognition.\n\nSome things you carry to the end.',
      },
    ],
  },
  // 4 — Renata
  {
    intro: 'Renata looks at what she has made — and what it has made of her.\n\n"I didn\'t know it would cost so much," she says. "Would you do it again?"',
    options: [
      {
        text: 'Yes. Every time.',
        result: 'Renata smiles — not with certainty, but with conviction.\n\n"Every time."\n\nThe cost and the gift were always the same thing.',
      },
      {
        text: 'No. But I would make something else.',
        result: 'Renata sets down what she built.\n\n"Not this. But something."\n\nEnding one story is how another begins.',
      },
    ],
  },
  // 5 — Mitra
  {
    intro: 'Mitra has seen the truth — or something that looks exactly like it.\n\n"It\'s smaller than I expected," she says. "And stranger."',
    options: [
      {
        text: 'Accept it, even though it doesn\'t explain everything.',
        result: 'Mitra holds the truth gently, like a bird she\'s afraid to crush.\n\n"This is enough," she decides.\n\nSometimes it is.',
      },
      {
        text: 'Keep searching. There must be more.',
        result: 'Mitra puts the truth in her pocket and walks further.\n\n"This is not the end of the question."\n\nSome seekers find resolution in the seeking itself.',
      },
    ],
  },
]

export default JOURNEY_CHOICES
