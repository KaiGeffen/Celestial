import 'phaser'
import BaseScene from './baseScene'
import Loader from '../loader/loader'
import Buttons from '../lib/buttons/buttons'
import { Space, Style } from '../settings/settings'
import { UserSettings } from '../settings/userSettings'
import { TUTORIAL_LENGTH } from '../../../shared/settings'

const TYPEWRITER_DELAY_MS = 30
const TWEEN_DURATION = 5000
// Space reserved at the bottom for the body text (also its anchor offset)
const BODY_TEXT_HEIGHT = 240
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
    texts: [
      `Aurora: The penumbra of my realm are struggling to find peace.`,
      `Aurora: I can't let them all turn into umbra—even if your kind is adorable.`,
    ],
  },
  {
    imageKey: 'tutorial-5',
    texts: [
      `Aurora: Your story should have been settled here, under my guidance. But now you’re bound to this realm, as a shadow of your former self.`,
      `Aurora: What am I doing wrong? What am I missing?`,
    ],
  },
  {
    imageKey: 'tutorial-6',
    texts: [`Aurora: You wish to help? Well… it wouldn't hurt to try.`],
  },
  {
    imageKey: 'tutorial-7',
    texts: [
      `Aurora: The penumbra Jules should be close to resolution, but they need a little nudge forward.`,
      `Aurora: Go see if you can lend a hand.`,
    ],
  },
  {
    imageKey: 'tutorial-8',
    texts: [
      'Jules: Oh, hello there. Do you want to join me?',
      `Jules: An umbra as my storytelling partner? That sounds like a welcome change.`,
    ],
  },
  {
    imageKey: 'tutorial-9',
    texts: [`Jules: Let’s untangle this together, little one.`],
  },
]

export default class OpeningScene extends BaseScene {
  private slideIndex: number
  private textIndex: number
  private slideImage: Phaser.GameObjects.Image
  // Constant window the slide is clipped to (geometry mask source)
  private slideMask: Phaser.GameObjects.Rectangle
  // Border image framing that window
  private slideBox: Phaser.GameObjects.Image
  private imageW: number
  private bodyText: Phaser.GameObjects.Text
  private typewriterEvent: Phaser.Time.TimerEvent | null = null
  private slideTween: Phaser.Tweens.Tween | null = null
  private fullText: string
  private charIndex: number

  constructor() {
    super({ key: 'OpeningScene' })
  }

  preload(): void {
    Loader.loadTutorialCutscenes(this)
  }

  create(): void {
    super.create()

    // Remove the events that might linger from last run of this scene
    const oldEvent = this.typewriterEvent
    this.typewriterEvent = null
    oldEvent?.remove()
    const oldTween = this.slideTween
    this.slideTween = null
    oldTween?.stop()

    // Refresh the fields
    this.slideIndex = 0
    this.textIndex = 0
    this.fullText = ''
    this.charIndex = 0

    // Create the components
    this.createBackground()
    this.createSlideImage()
    this.createChrome()
    this.createText()
    this.createSkipButton()

    // Start with the first slide
    this.showSlide(0)
  }

  private createSkipButton(): void {
    new Buttons.Basic({
      within: this,
      text: 'Skip',
      x: Space.pad + Space.buttonWidth / 2,
      y: Space.padSmall + Space.buttonHeight / 2,
      f: () => {
        this.scene.launch('MenuScene', {
          menu: 'confirm',
          text: 'Are you sure you want to skip the opening cutscene?',
          callback: () => this.finish(),
        })
      },
      muteClick: true,
    })
  }

  // Create the background that appears behind everything else (Not the chrome)
  private createBackground(): void {
    const background = this.add
      .image(0, 0, 'background-intro')
      .setOrigin(0)
      .setInteractive()
      .on('pointerdown', () => this.onAdvance())
    this.plugins.get('rexAnchor')['add'](background, {
      width: '100%',
      height: '100%',
    })
  }

  // The images that are shown one after another
  private createSlideImage(): void {
    this.imageW = Space.windowWidth

    this.slideImage = this.add.image(0, 0, 'tutorial-1').setOrigin(0.5, 0)

    // Border framing the window, drawn over the slide.
    this.slideBox = this.add.image(0, 0, 'chrome-introBox').setOrigin(0.5, 0)

    // Clip the slide to a fixed "window" (the framed area). A geometry mask means
    // a zoomed/panned slide only shows the part inside the frame instead of
    // spilling over the background and chrome. The rectangle is the mask source,
    // so it isn't drawn itself.
    this.slideMask = this.add
      .rectangle(0, 0, 10, 10, 0xffffff)
      .setOrigin(0.5, 0)
      .setVisible(false)
    this.slideImage.setMask(this.slideMask.createGeometryMask())
    this.updateSlideMask(Space.windowWidth, Space.windowHeight)

    this.plugins.get('rexAnchor')['add'](this.slideImage, {
      onUpdateViewportCallback: (viewport) => {
        this.updateSlideMask(viewport.width, viewport.height)
        this.fitSlideToWindow(viewport.width, viewport.height)
      },
    })
  }

  // The central content area between the variable-width side chrome. The slide
  // window, its border box, and the body text all fill this width. Side widths
  // come from the chrome textures' aspect ratio (they're scaled to full height).
  private getContentLayout(width: number, height: number) {
    const chromeWidth = (key: string): number => {
      const src = this.textures.get(key).getSourceImage() as HTMLImageElement
      return src && src.height > 0 ? height * (src.width / src.height) : 0
    }
    const leftWidth = chromeWidth('chrome-introLeft')
    const rightWidth = chromeWidth('chrome-introRight')
    const availableWidth = Math.max(
      1,
      width - leftWidth - rightWidth - Space.pad * 2,
    )
    const left = leftWidth + Space.pad
    const centerX = left + availableWidth / 2
    const top = Space.pad * 2

    // The slide window keeps the SLIDE_WIDTH:SLIDE_HEIGHT ratio, scaled as large
    // as fits within the available width and the height left above the text.
    const availableHeight = Math.max(1, height - BODY_TEXT_HEIGHT - top)
    const slideRatio = SLIDE_WIDTH / SLIDE_HEIGHT
    let windowWidth = availableWidth
    let windowHeight = windowWidth / slideRatio
    if (windowHeight > availableHeight) {
      windowHeight = availableHeight
      windowWidth = windowHeight * slideRatio
    }

    return { availableWidth, left, centerX, top, windowWidth, windowHeight }
  }

  // Size the mask window (and its border box) to the content area.
  private updateSlideMask(width: number, height: number): void {
    const { windowWidth, centerX, top, windowHeight } = this.getContentLayout(
      width,
      height,
    )

    this.slideMask.setPosition(centerX, top)
    this.slideMask.setSize(windowWidth, windowHeight)

    // Frame the window with the border image, sitting a bit beyond it on every side.
    const boxPad = 13
    this.slideBox.setPosition(centerX, top - boxPad)
    this.slideBox.setDisplaySize(
      windowWidth + boxPad * 2,
      windowHeight + boxPad * 2,
    )
  }

  // Cover the content window with the slide, centered (used on resize).
  private fitSlideToWindow(width: number, height: number): void {
    const { windowWidth, centerX, top, windowHeight } = this.getContentLayout(
      width,
      height,
    )
    const scale = Math.max(
      windowWidth / this.slideImage.width,
      windowHeight / this.slideImage.height,
    )
    this.slideImage.setDisplaySize(
      this.slideImage.width * scale,
      this.slideImage.height * scale,
    )
    this.slideImage.setPosition(centerX, top)
  }

  private createChrome(): void {
    // Dedicated, pre-oriented side images (no rotation needed).
    const leftChrome = this.add.image(0, 0, 'chrome-introLeft').setOrigin(0, 0)
    const rightChrome = this.add
      .image(0, 0, 'chrome-introRight')
      .setOrigin(1, 0)

    const layoutSides = (viewport: Phaser.Geom.Rectangle) => {
      // Ensure right chrome flush with right side of screen
      rightChrome.setPosition(viewport.width, 0)

      // Scale both side images to full height, preserving their ratio
      const height = viewport.height
      if (height <= 0) return
      const ratio = leftChrome.width / leftChrome.height
      leftChrome.setDisplaySize(height * ratio, height)
      rightChrome.setDisplaySize(height * ratio, height)
    }

    // Side positions live at x = dx and x = W − dx; callback keeps both in sync on resize.
    this.plugins.get('rexAnchor')['add'](leftChrome, {
      onUpdateViewportCallback: layoutSides,
    })

    layoutSides(
      new Phaser.Geom.Rectangle(0, 0, this.scale.width, this.scale.height),
    )
  }

  private createText(): void {
    // Body text fills the same content area as the slide window
    this.bodyText = this.add.text(0, 0, '', Style.openingScene)
    const layoutText = (width: number, height: number) => {
      const { left, availableWidth } = this.getContentLayout(width, height)
      this.bodyText.setX(left)
      this.bodyText.setWordWrapWidth(availableWidth)
    }
    layoutText(Space.windowWidth, Space.windowHeight)
    this.plugins.get('rexAnchor')['add'](this.bodyText, {
      y: `100%-${BODY_TEXT_HEIGHT - Space.pad * 2}`,
      onUpdateViewportCallback: (viewport) =>
        layoutText(viewport.width, viewport.height),
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

    // Set appropriate slide image
    this.slideImage.setTexture(imageKey)

    // Fill the content area between the (variable-width) side chrome
    const { windowWidth, centerX, top, windowHeight } = this.getContentLayout(
      Space.windowWidth,
      Space.windowHeight,
    )

    // If this slide has been started, clicking should complete/stop it
    if (this.slideTween) {
      this.slideTween.stop()
      this.slideTween = null
    }

    // First slide pans left to right
    if (i === 0) {
      const fixedScale = Math.max(
        windowWidth / this.slideImage.width,
        windowHeight / this.slideImage.height,
      )
      this.slideImage.setScale(fixedScale)

      const visibleWidth = this.slideImage.width * fixedScale
      const panRange = Math.max(0, (visibleWidth - windowWidth) / 2)
      this.slideImage.setPosition(centerX + panRange, top)

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
      // Other slides scale down to cover the content area
      const endScale = Math.max(
        windowWidth / this.slideImage.width,
        windowHeight / this.slideImage.height,
      )
      const startScale = Math.max(
        Space.windowWidth / this.slideImage.width,
        endScale,
      )
      this.slideImage.setPosition(centerX, top).setScale(startScale)

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
          const ev = this.typewriterEvent
          this.typewriterEvent = null
          ev?.remove()
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
    this.playSound('click')

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
