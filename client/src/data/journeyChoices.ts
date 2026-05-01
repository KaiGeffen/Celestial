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
    intro: `This is where my story ends. Right? I cannot recall what it is I have yet to resolve. I’ve long since discarded the muddled, confused versions of myself. I’ve detached from pain, from anger, from inauthenticity, from any physical place or form. I’m ready to do the same to the mortal world and my own story. By now, you must know my story better than any other. Show me, what is left? What do I need to return to?`,
    options: [
      {
        text: `Even if you’ve changed completely, your former selves don’t deserve to be tossed aside.`,
        result: `It’s true that without all versions of myself, I wouldn’t have become the person I am now. And because of that, maybe I’ve been too eager to erase what I should be appreciating. It’s hard to acknowledge those parts of me who never left, and to admit I still carry them with me. But saying it aloud feels oddly comforting, like giving each hurt version of myself a kiss on the forehead before saying goodbye. That’s all I really needed.`,
      },
      {
        text: `At one point, you did need to leave everything behind; but did that really have to become the default for the rest of your life?`,
        result: `I see it now. Taking flight used to be a difficult, but necessary solution. Then, in other cases, it became more like an easy alternative to the real solution. I discarded too much, too quickly—things, people, places that I didn’t want or even need to abandon. What if I had been able to let go of letting go? I never saw that as an option I could afford. Later in life, it would be; but I’m not particularly regretful over it. I’m still satisfied with the life I lived, but I think that in my next, I’ll let myself dance.`,
      },
    ],
  },
  // 1 — Adonis
  {
    intro: `I don’t know what to think after looking back at everything. I’m left with nothing but questions. What became of all my efforts? What is the future of my home, my community? And most of all: am I wrong in the choices I made? I wish I could have been like Gavin, with hands that heal. In the end I don’t know what my own family thinks of me. Even though this was all for them. Was it worth it?`,
    options: [
      {
        text: `How at peace would you feel now if you’d done nothing and made no impact?`,
        result: `I wouldn’t be at peace. How could I? If I just sat by while everybody around me struggled, I’d be worse than guilty. I’d be continuing a cycle of barely getting by—of letting our homes and streets erode and crumble beneath us while we all try to run. If I hadn’t made any hard decisions, those same choices wouldn’t have just gone away. They’d have fallen on the next in line: my brother, my friends, my neighbors... If someone had to shoulder it, I’m glad it was me. I can be proud of that much.`,
      },
      {
        text: `Your choices were drops in the ocean of forces.`,
        result: `That’s the kind of talk I’d expect in a realm like this. From up here things look smaller. Or maybe the whole just looks larger when you can see it all. You’re right: I never had the power to make waves. I wasn’t born into that, and I didn’t chase after it either. If my hands could provide something better, at least for the people I knew, that’s all the impact I could want. Waves keep crashing down, and my current has already merged with the tide.`,
      },
    ],
  },
  // 2 — Mia
  {
    intro: `I started my story with Simon because that was the last relationship where I tried to commit. It’s not like my life ended when we did. I continued on, found new friends, hobbies, and a lot more pets. I did a lot more than I thought I’d be capable of. To be honest there are things I know I haven’t gotten over… things I don’t want to relive and unpack, even if I managed to mention them in my story. Why should I? Why is it on me to resolve the things that I went through—the things that were done to me. You could give me a whole lifetime to heal, and I’d still rather punish and protect. `,
    options: [
      {
        text: `With your defenses constantly raised, you only limit yourself. Accepting risk is part of living bravely.`,
        result: `Hmm. I don’t like the implication that I’m not brave. I’ve been brave every day of my life. I recognized risk everywhere and yet I persisted, made a life for myself. But yes, my vigilance had a cost. That’s why I always come back to Simon, isn’t it? I pushed positive possibilities away to protect myself from the bad ones. Okay, that doesn’t sound brave. I see what you mean now. I don’t think I ever considered accepting danger and risk. But it sounds more doable than healing and forgiving. Maybe I could make a little room for acceptance. I’m tired of these walls.`,
      },
      {
        text: `You can rest now, you’re safe.`,
        result: `Safe? Well, that depends on  how you define “safe”. Plenty of times I’ve been told I’m safe when that couldn’t be further from the truth…Not that you would do that. I know this place is different. You’re different from anyone I’ve met on Earth, too. You’ve made me talk, for one. I guess I wouldn’t have gotten this far without feeling safe, somewhere deep down. I…I want to trust this feeling; your words. Is that okay? I think so. I think I’m ready to stop looking over my shoulder—It’s tiring. Will healing let me rest? If so, I’m willing to at least try.`,
      },
    ],
  },
  // 3 — Kitz
  {
    intro: `I only grasped half of what she said during that breakup. The grief struck me instantly, like she had already left and I was hearing her ghost. When she was gone for good, that very ghost attached itself to me, repeating throughout my life in whispers those words I still couldn’t quite understand. I’m always drawn back to that moment, to those words. What did I fail to learn? Whatever it was, it eluded me to the end. That’s why I’m here mulling over it one last time. Tell me, what did I do wrong? I only ever tried to love with all my heart and give all I could give.`,
    options: [
      {
        text: `You should spare some of your focus and devotion for yourself.`,
        result: `Myself? Do I need that kind of attention? Well, if it’s you saying so, my friend, I should give it some thought. I admit I’ve poured a lot into the external. I thought that naturally I would receive enough in return; but I suppose my level of investment is hard to match. I always think of myself in the context of others: do they like me? Do I like them? Once I find myself alone I’m at a loss. That’s partly why I’m always seeking the company and approval of others. Instead of focusing on how to keep someone else by my side, it’s about time I learn how to be a better companion to myself.`,
      },
      {
        text: `Your love was too smothering, you didn’t treat your partner as your equal.`,
        result: `I know “partner” implies equals: a neat slice down the middle. But while I’ve always preferred to be relied on, I never considered that could place a burden on the reliant. I was careful not to use my power to exploit those I loved. I never tried to force anyone to stay or bend them to my will. Isn’t that enough?
No, my past relationships prove it wasn’t. Love like that can’t endure indefinitely. Maybe trusting my partner—relying as much as I am relied on—isn’t the flaw I feared it to be.
Maybe it could’ve been the opposite.`,
      },
    ],
  },
  // 4 — Renata
  {
    intro: `I feel warmed recounting my life to you. I can recall the beautiful faces of past connections and the fulfilling things I accomplished. Still, as you heard, I worry about my legacy—not biologically but professionally. Unlike my orderly mentor, I was content bobbing and floating down the river of time as if things would fall into place on their own. I saw myself in Nova and took that for granted, failing to consider how cycles change with each iteration. Fate is beyond prediction, I shouldn’t have been so complacent. What do you think? Is that what I’m meant to realize?`,
    options: [
      {
        text: `You were anything but complacent! You’ve done more than enough in your lifetime. Don’t burden yourself with other responsibilities.`,
        result: `Thank you for saying this, little one. I do feel fulfilled—even proud—while going through my story. I must value this before jumping to my anxieties. I did work hard. I shouldn't diminish the lives brought safely into this world or the appreciation expressed to me well into my final years. It is hard to set things up seamlessly for the next generations, but you’re right: doing so isn’t my responsibility alone; I can have faith in the community I know and love. I have already completed my true responsibility—the purpose that came to me in a dream—by putting my hands to good use.`,
      },
      {
        text: `The cycle hasn’t ended with you. It will continue to develop and adapt, incorporating your influence.`,
        result: `My, what a wise one you are! Indeed, why would I be at the center of the cycle? Nova is a different person than me, and I am a different person than my mentor. We can each complete our own missions, in our own ways. And how could I overlook the efforts I witnessed myself: the women showing up for each other without a designated doula. I am satisfied knowing my classes contributed to their preparation, and that knowledge will always live on and grow.`,
      },
    ],
  },
  // 5 — Mitra
  {
    intro: `Mitra's story is not yet written.`,
    options: [
      {
        text: `I want gold so much I click this anyways.`,
        result: `Welp you got the gold.`,
      },
      {
        text: `This button also leads to gold lol.`,
        result: `Ah what could have been...`,
      },
    ],
  },
]

/** Intro, chosen option line, then outcome — same indentation as other chapter scroll text. */
export function formatJourneyFinaleChapterBody(
  avatarIndex: number,
  choiceIndex: 0 | 1,
): string {
  const choiceData = JOURNEY_CHOICES[avatarIndex]
  const intro = choiceData?.intro ?? ''
  const chosenLine = '> ' + (choiceData?.options[choiceIndex]?.text ?? '')
  const outcome = choiceData?.options[choiceIndex]?.result ?? 'Coming soon.'
  const combined = [intro, chosenLine, outcome].filter(Boolean).join('\n\n')
  return '      ' + combined.replace(/\n/g, '\n      ').trim()
}

export default JOURNEY_CHOICES
