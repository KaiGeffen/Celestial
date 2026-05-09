import 'phaser'
import BaseScene from './baseScene'
import Loader from '../loader/loader'
import { Space, Style } from '../settings/settings'
import { UserSettings } from '../settings/userSettings'
import { TUTORIAL_LENGTH } from '../../../shared/settings'

const IMAGE_HEIGHT_RATIO = 0.72
const TYPEWRITER_DELAY_MS = 30
const TWEEN_DURATION = 5000
const BOTTOM_CHROME_HEIGHT = 330
const SLIDE_WIDTH = 1428
const SLIDE_HEIGHT = 936

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
  // TODO Remove
  private imageW: number
  private imageH: number
  private bodyText: Phaser.GameObjects.Text
  private typewriterEvent: Phaser.Time.TimerEvent | null = null
  private slideTween: Phaser.Tweens.Tween | null = null
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

    this.createBackground()
    this.createSlideImage()
    this.createChrome()
    this.createText()

    this.showSlide(0)
  }

  private createBackground(): void {
    const background = this.add.image(0, 0, 'background-Light').setOrigin(0)
    this.plugins.get('rexAnchor')['add'](background, {
      width: '100%',
      height: '100%',
    })
  }

  private createSlideImage(): void {
    this.imageW = Space.windowWidth
    this.imageH = Math.round(Space.windowHeight * IMAGE_HEIGHT_RATIO)

    // Slide image — cover-fit, centered; overflow goes off-screen
    this.slideImage = this.add.image(0, 0, 'tutorial-1').setOrigin(0.5, 0)

    this.plugins.get('rexAnchor')['add'](this.slideImage, {
      x: '50%',
      onUpdateViewportCallback: (viewport) => {
        const minWidth = Math.max(1, viewport.width - 360)
        const minHeight = Math.max(1, viewport.height - 320)
        const scale = Math.max(
          minWidth / this.slideImage.width,
          minHeight / this.slideImage.height,
        )
        this.slideImage.setDisplaySize(
          this.slideImage.width * scale,
          this.slideImage.height * scale,
        )
      },
    })
  }

  /**
   * Side chrome is placed in the horizontal band [0, dx] / [W-dx, W]. If its
   * axis-aligned bounds width is smaller than dx, scale up uniformly so it spans.
   */
  private stretchSideChromeToDx(img: Phaser.GameObjects.Image, dx: number): void {
    if (dx <= 0) return
    img.setScale(1)
    const b = img.getBounds()
    if (b.width > 0 && b.width < dx) {
      const f = dx / b.width
      img.setScale(f, f)
    }
  }

  private createChrome(): void {
    const chromeKey = 'chrome-builderHeader'

    const leftChrome = this.add
      .image(0, 0, chromeKey)
      .setOrigin(1, 1)
      .setAngle(-90)

    const rightChrome = this.add
      .image(0, 0, chromeKey)
      .setOrigin(0, 1)
      .setAngle(90)

    const layoutSides = (viewport: Phaser.Geom.Rectangle) => {
      const slideRatio = SLIDE_WIDTH / SLIDE_HEIGHT
      const frameHeight = Math.max(1, viewport.height - BOTTOM_CHROME_HEIGHT)
      const frameWidth = Math.min(viewport.width, frameHeight * slideRatio)
      const dx = Math.max(0, (viewport.width - frameWidth) / 2)

      leftChrome.x = dx
      rightChrome.x = viewport.width - dx

      this.stretchSideChromeToDx(leftChrome, dx)
      this.stretchSideChromeToDx(rightChrome, dx)
    }

    // Side positions live at x = dx and x = W − dx; callback keeps both in sync on resize.
    this.plugins.get('rexAnchor')['add'](leftChrome, {
      onUpdateViewportCallback: layoutSides,
    })

    layoutSides(
      new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height),
    )

    // Bottom panel (Behind text)
    const bottomChrome = this.add
      .image(0, 0, chromeKey)
      .setOrigin(0.5, 1)
      .setAngle(180)
      .setInteractive()
      .on('pointerdown', () => this.onAdvance())
    this.plugins.get('rexAnchor')['add'](bottomChrome, {
      x: '50%',
      y: `100%-${BOTTOM_CHROME_HEIGHT}`,
    })
  }

  private createText(): void {
    // Body text on top of chrome
    this.bodyText = this.add
      .text(Space.pad * 2, 0, '', Style.openingScene)
      .setWordWrapWidth(Space.windowWidth - Space.pad * 4)
    this.plugins.get('rexAnchor')['add'](this.bodyText, {
      y: '100%-220',
      onUpdateViewportCallback: (viewport) => {
        this.bodyText.setWordWrapWidth(viewport.width - Space.pad * 4)
      },
    })

    // Reminder text
    const reminderText = this.add
      .text(0, 0, 'Click to continue', Style.openingReminder)
      .setOrigin(1, 1)
    this.plugins.get('rexAnchor')['add'](reminderText, {
      x: `100%-${Space.padSmall}`,
      y: `100%-${Space.padSmall}`,
    })
  }

  private showSlide(i: number): void {
    const { imageKey, texts } = SLIDES[i]
    this.textIndex = 0

    if (this.textures.exists(imageKey)) {
      this.slideImage.setTexture(imageKey)

      // Compute the same framed area used by the chrome layout.
      const slideRatio = SLIDE_WIDTH / SLIDE_HEIGHT
      const frameHeight = Math.max(1, Space.windowHeight - BOTTOM_CHROME_HEIGHT)
      const frameWidth = Math.min(Space.windowWidth, frameHeight * slideRatio)

      if (this.slideTween) {
        this.slideTween.stop()
        this.slideTween = null
      }

      this.slideImage.setOrigin(0.5, 0).setVisible(true)

      if (i === 0) {
        // First slide: pan left -> right at fixed framed scale.
        const fixedScale = Math.max(
          frameWidth / this.slideImage.width,
          frameHeight / this.slideImage.height,
        )
        this.slideImage.setScale(fixedScale)

        const visibleWidth = this.slideImage.width * fixedScale
        const panRange = Math.max(0, (visibleWidth - frameWidth) / 2)
        const centerX = this.imageW / 2
        this.slideImage.setPosition(centerX + panRange, 0)

        this.slideTween = this.tweens.add({
          targets: this.slideImage,
          x: centerX - panRange,
          duration: TWEEN_DURATION * 2,
          ease: 'Sine.InOut',
          onComplete: () => {
            this.slideTween = null
          },
        })
      } else {
        // Other slides: width-driven zoom to framed width.
        const startScale = Space.windowWidth / this.slideImage.width
        const endScale = Math.max(1, frameWidth) / this.slideImage.width
        this.slideImage.setPosition(this.imageW / 2, 0).setScale(startScale)

        this.slideTween = this.tweens.add({
          targets: this.slideImage,
          scaleX: endScale,
          scaleY: endScale,
          duration: TWEEN_DURATION,
          ease: 'Sine.Out',
          onComplete: () => {
            this.slideTween = null
          },
        })
      }
    } else {
      if (this.slideTween) {
        this.slideTween.stop()
        this.slideTween = null
      }
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

  /**
   * Phaser `Tween.complete()` ends playback but does not advance properties to their
   * final values — seek to the end of the timeline, then remove the tween.
   */
  private skipSlideTweenToEnd(): void {
    const tw = this.slideTween
    if (!tw) return
    const endMs = tw.totalDuration
    if (endMs > 0) {
      tw.seek(endMs, 50, false)
    }
    tw.stop()
    this.slideTween = null
  }

  private onAdvance(): void {
    const texts = SLIDES[this.slideIndex].texts

    if (this.typewriterEvent) {
      this.typewriterEvent.remove()
      this.typewriterEvent = null
      this.bodyText.setText(this.fullText)
      return
    }

    if (this.textIndex + 1 < texts.length) {
      this.textIndex++
      this.startTypewriter(texts[this.textIndex])
      return
    }

    // Last line is visible: jump slide motion to its final frame; next click advances.
    if (this.slideTween) {
      this.skipSlideTweenToEnd()
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
