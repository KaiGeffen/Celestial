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
    intro: `I never knew what to make of my work in therapy. Maybe it helped, I did a lot more in life than I thought I’d be capable of. To be honest there are things I know I haven’t gotten over… things I don’t want to relive and unpack, even if I managed to mention them in my story, or to Dr. Stacy. Why should I? Why is it on me to resolve the things that I went through—the things that were done to me? You could give me a whole lifetime to heal, and I’d still rather punish and protect.`,
    options: [
      {
        text: `You have a voice worth sharing and appreciating. Don’t let past wounds scare you into silence.`,
        result: `Scared? I’m not scared. I’ve been brave every day of my life. I’ve been smart, not scared, to recognize risk everywhere and make a life for myself despite it. Yes, vigilance has a cost. There are some things I had to give up on. Some things I had to keep to myself. Or, who knows. Maybe I didn’t have to. 
I think I see what you mean now. Then, if you’re here to listen, I’ll finally voice it all.
My blog, I haven’t checked on it in years, but I hope it goes viral. I hope it gets published everywhere. I hope they find her name. I hope they find me, too: my pain, my drive, my effort. And I want to say that I’m sorry. I’m sorry to the people I’ve loved and pushed away. I’m sorry to myself, for getting hurt. For not pressing charges, for quitting too soon, and for hating myself over that. And I want to say… that I forgive you. I mean, myself. I forgive her.`,
      },
      {
        text: `I hear and believe you. You can rest now, you’re safe.`,
        result: `Safe? Well, that depends on how you define “safe.” Plenty of times I’ve been told I’m safe when that couldn’t be further from the truth…Not that you would do that. I know this place is different. You’re different from anyone I’ve met on Earth, too. You’ve actually listened, for one. I guess I wouldn’t have gotten this far in telling my story without feeling safe, somewhere deep down. I…I want to trust this feeling; your words. Is that okay? I think so. I wish I realized I could relax much sooner, it feels so freeing—like the relief I’ve been waiting for my whole life. Maybe—now that I’m thinking about it—maybe I could’ve reached this feeling long before even entering this realm.
At least now I’m ready to stop looking over my shoulder, it’s tiring. Will healing let me rest? If so, I’m willing to try. `,
      },
    ],
  },
  // 3 — Kitz
  {
    intro: `I never endeavored to live a merely satisfactory life; to pursue contentment, achievement, or the greater good. No, I had an appetite that I lived to sate, and sate it I did. I’ve had my fill of all the pleasure and drama I could ask for. Call it selfish, if you must. I know that being true to myself makes me stick out amongst my friends, parents, and past lovers. Do they seem more fulfilled? I don’t believe so. More… purposeful, perhaps. At the very least, they’d be better equipped for the afterlife.
Tasting the colors of life, plunging into thrill, making it overflow—I don’t mourn it. Yet, now I’m forced to wonder: am I complete? Have I missed out on something more important by prioritizing the wrong things?`,
    options: [
      {
        text: `I don’t think you’ve lived self-centeredly. If anything, you’re always looking outwards. Try looking inwards for once—what have you done and felt for the people you’re comparing yourself to?`,
        result: `I thought I couldn’t find a lover, or even a cause to stay devoted to because I wasn’t needed enough. Eventually, my usefulness would run out and there’d be nothing left to keep a lover tethered to my side. But my friends, family, community — they stayed. Why? What did they see in me? Yes, I helped out here and there, but that could hardly compare to how much I nurtured the women I—Oh, I’m still looking outwards, aren’t I?
The inward version is…what did I see in them, the ones who stayed? Companionship and care, both ways. Sometimes I felt pelted by the criticisms thrown my way; pressured by expectations and doubts. But I could always trust them to show up with security and support when I needed it the most. Needed. So that’s the answer. I needed them as much as they needed me. That’s true love.`,
      },
      {
        text: `Your connections and experiences were not futile. Even if your path looks different from others’, it was always meant to be your path.`,
        result: `I know, now, I was wrong about Noor. Maybe at one point we shared a path, but she turned onto her own while I stayed behind. Stubbornly, I couldn’t see it, I refused to see it until I was forced to.
For a period, I was prone to ruminating over what could have been if I’d adapted to her change. But seeing how her life ended up—steady and snug—I’ve accepted I wouldn’t belong, I wouldn’t appreciate it the way she did. 
And despite the pain of parting ways, you’re right, I wouldn’t erase anything we experienced. I’d say the same for everyone after her, as well. Each romance that came and went felt like a gain, not a loss. Time savored is not time wasted. It might not be the typical picture of a happy ending with neatly checked boxes, but it is my ending, and I am happy.`,
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
  const chosenLine = '"' + (choiceData?.options[choiceIndex]?.text ?? '') + '"'
  const outcome = choiceData?.options[choiceIndex]?.result ?? 'Coming soon.'
  const combined = [intro, chosenLine, outcome].filter(Boolean).join('\n\n')
  return '      ' + combined.replace(/\n/g, '\n      ').trim()
}

export default JOURNEY_CHOICES
