import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import BaseScene from './baseScene'
import Buttons from '../lib/buttons/buttons'
import Loader from '../loader/loader'
import { Color, Space, Style } from '../settings/settings'
import { UserSettings } from '../settings/userSettings'
import { TUTORIAL_LENGTH } from '../../../shared/settings'

const IMAGE_HEIGHT_RATIO = 0.72
const TYPEWRITER_DELAY_MS = 30

interface Slide {
  imageKey: string
  texts: string[]
}

const SLIDES: Slide[] = [
  {
    imageKey: 'tutorial-1',
    texts: [`[In this afterlife realm, overseen by the goddess Aurora…]`],
  },
  { imageKey: 'tutorial-2', texts: [`[souls seek to resolve their stories…]`] },
  {
    imageKey: 'tutorial-3',
    texts: [`[or succumb to transformation, losing their mortal identities.]`],
  },
  {
    imageKey: 'tutorial-4',
    texts: [`Aurora: "The penumbra of my realm are struggling to find peace."`],
  },
  {
    imageKey: 'tutorial-5',
    texts: [
      `Aurora: "I can't let them all turn into umbra—even if your kind is adorable."`,
      `Aurora: “Your story should have been settled here, under my guidance. But now you’re bound to this realm, as a shadow of your former self.”`,
      `Aurora: “What am I doing wrong? What am I missing?”`,
    ],
  },
  {
    imageKey: 'tutorial-6',
    texts: [`Aurora: "You wish to help? Well… it wouldn't hurt to try."`],
  },
  {
    imageKey: 'tutorial-7',
    texts: [
      `Aurora: “The penumbra Jules should be close to resolution, but they need a little nudge forward.”`,
      `Aurora: “Go see if you can lend a hand.”`,
    ],
  },
  {
    imageKey: 'tutorial-8',
    texts: [
      'Jules: “Oh, hello there. Do you want to join me?”',
      `Jules: “An umbra as my storytelling partner? That sounds like a welcome change.”`,
      `Jules: “Let’s untangle this together, little one.”`,
    ],
  },
  { imageKey: 'tutorial-9', texts: [''] },
]

export default class OpeningScene extends BaseScene {
  private slideIndex = 0
  private textIndex = 0
  private slideImage: Phaser.GameObjects.Image
  private imageW: number
  private imageH: number
  private bodyText: Phaser.GameObjects.Text
  private typewriterEvent: Phaser.Time.TimerEvent | null = null
  private fullText = ''
  private charIndex = 0

  constructor() {
    super({ key: 'OpeningScene' })
  }

  preload(): void {
    Loader.loadTutorialCutscenes(this)
  }

  create(): void {
    super.create()

    this.imageW = Space.windowWidth
    this.imageH = Math.round(Space.windowHeight * IMAGE_HEIGHT_RATIO)
    const panelH = Space.windowHeight - this.imageH

    // Dark backing behind slide image
    this.add.rectangle(0, 0, this.imageW, this.imageH, 0x0d0d1a).setOrigin(0)

    // Slide image — cover-fit, centered; overflow goes off-screen
    this.slideImage = this.add
      .image(this.imageW / 2, this.imageH / 2, '__DEFAULT')
      .setVisible(false)

    // Text panel — click anywhere to advance
    this.add
      .rectangle(
        0,
        this.imageH,
        Space.windowWidth,
        panelH,
        Color.backgroundDark,
      )
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.onAdvance())

    // Body text
    this.bodyText = this.add.text(Space.pad * 2, this.imageH + Space.pad, '', {
      ...Style.announcementOverBlack,
      wordWrap: { width: Space.windowWidth - Space.pad * 4 },
    })

    // Next button anchored to bottom-right
    const nextContainer = new ContainerLite(
      this,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: nextContainer,
      text: 'Next',
      f: () => this.onAdvance(),
    })
    ;(this.plugins.get('rexAnchor') as any).add(nextContainer, {
      right: `right-${Space.pad}`,
      bottom: `bottom-${Space.pad}`,
    })

    this.showSlide(0)
  }

  private showSlide(i: number): void {
    const { imageKey, texts } = SLIDES[i]
    this.textIndex = 0

    if (this.textures.exists(imageKey)) {
      this.slideImage.setTexture(imageKey)
      const scale = Math.max(
        this.imageW / this.slideImage.width,
        this.imageH / this.slideImage.height,
      )
      this.slideImage
        .setDisplaySize(
          this.slideImage.width * scale,
          this.slideImage.height * scale,
        )
        .setVisible(true)
    } else {
      this.slideImage.setVisible(false)
    }

    this.startTypewriter(texts[0])
  }

  private startTypewriter(text: string): void {
    if (this.typewriterEvent) {
      this.typewriterEvent.remove()
      this.typewriterEvent = null
    }
    this.fullText = text
    this.charIndex = 0
    this.bodyText.setText('')
    if (text.length === 0) return

    this.typewriterEvent = this.time.addEvent({
      delay: TYPEWRITER_DELAY_MS,
      loop: true,
      callback: () => {
        this.charIndex++
        this.bodyText.setText(this.fullText.substring(0, this.charIndex))
        if (this.charIndex >= this.fullText.length) {
          this.typewriterEvent!.remove()
          this.typewriterEvent = null
        }
      },
    })
  }

  private onAdvance(): void {
    if (this.typewriterEvent) {
      this.typewriterEvent.remove()
      this.typewriterEvent = null
      this.bodyText.setText(this.fullText)
      return
    }

    const texts = SLIDES[this.slideIndex].texts
    if (this.textIndex + 1 < texts.length) {
      this.textIndex++
      this.startTypewriter(texts[this.textIndex])
      return
    }

    this.slideIndex++
    if (this.slideIndex < SLIDES.length) {
      this.showSlide(this.slideIndex)
    } else {
      this.finish()
    }
  }

  private finish(): void {
    UserSettings._set('hasSeenOpening', true)
    const missions: boolean[] = UserSettings._get('completedMissions') || []
    for (let i = 0; i < TUTORIAL_LENGTH; i++) {
      if (!missions[i]) {
        this.scene.start('TutorialMatchScene', {
          isTutorial: false,
          deck: undefined,
          mmCode: `ai:t${i}`,
          missionID: i,
        })
        return
      }
    }
    this.scene.start('HomeScene')
  }
}
