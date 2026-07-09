import 'phaser'
import GameModel from '@shared/state/gameModel'
import { Zone } from '@shared/state/zone'
import { CardImage } from '../../lib/cardImage'
import { Time, Depth, BBStyle } from '../../settings/settings'
import { MatchScene } from '../matchScene'

/** Resolve bubbles on settled story cards (chrome art + BBCode labels + tweens). */
export class StoryResolveBubbles {
  private static readonly STAT_STROKE = '#000000'

  // Names for each image
  private static readonly BUBBLE_TEXTURE_POINTS = 'chrome-bubble'
  private static readonly BUBBLE_TEXTURE_NOURISH = 'chrome-bubbleNourish'
  private static readonly BUBBLE_TEXTURE_EFFECT = 'chrome-bubbleEffect'

  // How much the components scale up by
  private static readonly DELTA_SCALE = 2.5

  // Size the bubbles start / end (Main bubble is large, others small)
  private static readonly RADIUS_START = 18
  private static readonly RADIUS_END_LARGE =
    StoryResolveBubbles.RADIUS_START * StoryResolveBubbles.DELTA_SCALE
  private static readonly RADIUS_END_SMALL =
    StoryResolveBubbles.RADIUS_END_LARGE / 2

  // Font start / end pixels
  private static readonly FONT_PX_START = 24
  private static readonly FONT_PX_END_LARGE = Math.round(
    StoryResolveBubbles.FONT_PX_START * StoryResolveBubbles.DELTA_SCALE,
  )
  private static readonly FONT_PX_END_SMALL = Math.round(
    StoryResolveBubbles.FONT_PX_END_LARGE / 2,
  )

  /** Local offset from card center for nourish (bottom-right) vs effect (bottom-left) bubbles. */
  private static secondaryBubbleRestAtMainCorner(
    corner: 'bottomRight' | 'bottomLeft',
  ): { x: number; y: number } {
    const R = StoryResolveBubbles.RADIUS_END_LARGE
    const d = R / Math.SQRT2
    return corner === 'bottomRight' ? { x: d, y: d } : { x: -d, y: d }
  }

  private readonly layer: Phaser.GameObjects.Container
  private staggerEvents: Phaser.Time.TimerEvent[] = []
  /** End of previous `animate`; used to detect a single new resolved act. */
  private snapshotResolvedActCount = 0
  /** Resolved act count at the time of the last reset; acts below this index skip bubble drawing. -1 = no reset. */
  private resetBeforeResolvedCount = -1
  /** When >= 0, any bubble added via makeBubbleRoot will be popped after this delay (ms). -1 = no pending pop. */
  private pendingPopDelay = -1

  constructor(private readonly scene: MatchScene) {
    this.layer = scene.add.container(0, 0).setDepth(Depth.aboveOtherCards)
  }

  saveSnapshotFromState(state: GameModel): void {
    this.snapshotResolvedActCount = state.story.resolvedActs.length
  }

  clear(): void {
    this.cancelStaggerEvents()
    this.layer.removeAll(true)
    this.pendingPopDelay = -1
  }

  popBubbles(slot: number, resolvedCountAtReset: number): void {
    this.resetBeforeResolvedCount = resolvedCountAtReset
    const delay =
      slot * (Time.match.recapTween + Time.match.recapPauseBetweenTweens)
    this.pendingPopDelay = delay
    const targets = [...this.layer.list] as Phaser.GameObjects.Container[]
    for (const bubble of targets) {
      this.scheduleBubblePop(bubble, delay)
    }
  }

  private scheduleBubblePop(
    bubble: Phaser.GameObjects.Container,
    delay: number,
  ): void {
    this.scene.tweens.add({
      targets: bubble,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      delay,
      duration: Time.match.recapTween / 2,
      ease: 'Back.easeIn',
      onComplete: () => bubble.destroy(),
    })
  }

  private cancelStaggerEvents(): void {
    this.staggerEvents.forEach((e) => {
      this.scene.time.removeEvent(e)
    })
    this.staggerEvents = []
  }

  /** Same cutoff as `popBubbles`: max `index` on `Zone.Reset` animations in this state's batch (often empty after recap skip). */
  private bubbleSkipBeforeResolvedIndexFromResetAnimations(
    state: GameModel,
  ): number {
    let max = 0
    for (const anims of state.animations) {
      for (const a of anims) {
        if (a.from === Zone.Reset && typeof a.index === 'number') {
          max = Math.max(max, a.index)
        }
      }
    }
    return max
  }

  /**
   * Draws resolve bubbles for each settled act (staggered when a single act just resolved).
   * Returns recap tween slots to align other recap animations with those bubble tweens.
   */
  playForResolvedActs(state: GameModel, resolvedCards: CardImage[]): number {
    const isResetState = state.animations.some((anims) =>
      anims.some((a) => a.from === Zone.Reset),
    )
    const resolvedCount = state.story.resolvedActs.length

    // If a new round started, clear the reset tracking
    if (resolvedCount === 0) {
      this.resetBeforeResolvedCount = -1
    }

    const fromStoryField = state.story.bubbleSkipBeforeResolvedIndex ?? 0
    const fromResetAnimations =
      this.bubbleSkipBeforeResolvedIndexFromResetAnimations(state)
    const animationBubbleSkipBefore =
      this.resetBeforeResolvedCount === -1 ? 0 : this.resetBeforeResolvedCount
    const bubbleSkipBeforeResolvedIndex = Math.max(
      fromStoryField,
      fromResetAnimations,
      animationBubbleSkipBefore,
    )

    // Same predicate as `StoryRegion` (lastStoryResolvedActCount vs snapshot): only the newest resolve gets stagger / settle tween.
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0
    const r = Time.match.recapTween

    for (let resolvedI = 0; resolvedI < resolvedCount; resolvedI++) {
      // Skip acts cleared by reset (sequential recap via popBubbles, or skipped recap via Story / Reset animation index)
      if (resolvedI < bubbleSkipBeforeResolvedIndex) {
        continue
      }
      const act = state.story.resolvedActs[resolvedI]
      const card = resolvedCards[resolvedI]
      if (!card) {
        continue
      }

      const tweenBubbleFromStat =
        oneNewResolvedAct && resolvedI === resolvedCount - 1

      const nourishAmt = act.pointsFromNourish
      const effectAmt = act.pointsFromEffects

      const mainBubblePts = act.pointsFromStartingPoints

      const tweenNourishFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && nourishAmt !== 0
      const tweenEffectsFromStatus =
        oneNewResolvedAct && resolvedI === resolvedCount - 1 && effectAmt !== 0

      const shouldStagger = oneNewResolvedAct && resolvedI === resolvedCount - 1

      const pushBubbleStep = (delay: number, fn: () => void) => {
        const ev = this.scene.time.delayedCall(delay, () => {
          if (!card.container.active) {
            return
          }
          fn()
        })
        this.staggerEvents.push(ev)
      }

      if (shouldStagger) {
        pushBubbleStep(0, () => {
          this.addPointsResolveCircle(card, tweenBubbleFromStat, mainBubblePts)
        })
        let delay = r
        if (nourishAmt !== 0) {
          const nourishDelay = delay
          pushBubbleStep(0, () => {
            this.addNourishResolveCircle(
              card,
              tweenNourishFromStatus,
              nourishAmt,
              act.owner,
              nourishDelay,
            )
          })
          delay += r
        }
        if (effectAmt !== 0 && !isResetState) {
          pushBubbleStep(delay, () => {
            this.addEffectsResolveCircle(
              card,
              tweenEffectsFromStatus,
              effectAmt,
            )
          })
        }
      } else {
        this.addPointsResolveCircle(card, tweenBubbleFromStat, mainBubblePts)
        this.addNourishResolveCircle(
          card,
          tweenNourishFromStatus,
          nourishAmt,
          act.owner,
        )
        if (effectAmt !== 0) {
          this.addEffectsResolveCircle(card, tweenEffectsFromStatus, effectAmt)
        }
      }
    }

    return this.recapBubbleTweenSlotCount(state)
  }

  /** Slot count for staggered resolve-bubble tweens (0 when not a single new resolve). */
  private recapBubbleTweenSlotCount(state: GameModel): number {
    const resolvedCount = state.story.resolvedActs.length
    const oneNewResolvedAct =
      resolvedCount === this.snapshotResolvedActCount + 1 && resolvedCount > 0

    if (!oneNewResolvedAct) {
      return 0
    }

    const act = state.story.resolvedActs[resolvedCount - 1]
    let n = 1
    if (act.pointsFromNourish !== 0) n++
    if (act.pointsFromEffects !== 0) n++
    return n
  }

  /** Creates a world-space bubble root and attaches it to the resolve layer. */
  private makeBubbleRoot(
    worldX: number,
    worldY: number,
  ): Phaser.GameObjects.Container {
    const bubble = this.scene.add.container(worldX, worldY)
    this.layer.add(bubble)
    if (this.pendingPopDelay >= 0) {
      this.scheduleBubblePop(bubble, this.pendingPopDelay)
    }
    return bubble
  }

  private localToWorld(
    target: Phaser.GameObjects.GameObject,
    x: number,
    y: number,
  ): Phaser.Math.Vector2 {
    const container = target as Phaser.GameObjects.Container
    const m = container.getWorldTransformMatrix()
    return new Phaser.Math.Vector2(
      m.tx + m.a * x + m.c * y,
      m.ty + m.b * x + m.d * y,
    )
  }

  private static setBubbleDisplaySize(
    img: Phaser.GameObjects.Image,
    radius: number,
  ): void {
    const d = radius * 2
    img.setDisplaySize(d, d)
  }

  private static createBubbleImage(
    scene: Phaser.Scene,
    textureKey: string,
    radius: number,
  ): Phaser.GameObjects.Image {
    const img = scene.add.image(0, 0, textureKey)

    StoryResolveBubbles.setBubbleDisplaySize(img, radius)

    return img
  }

  /** Main printed-points bubble; optionally tweens from the card’s points stat to center. */
  addPointsResolveCircle(
    card: CardImage,
    tweenFromStat: boolean,
    mainBubblePts: number,
  ): void {
    const pts = mainBubblePts
    const start = tweenFromStat
      ? this.localToWorld(card.container, card.txtPoints.x, card.txtPoints.y)
      : this.localToWorld(card.container, 0, 0)
    const end = this.localToWorld(card.container, 0, 0)
    const bubble = this.makeBubbleRoot(start.x, start.y)

    const bubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_POINTS,
      StoryResolveBubbles.RADIUS_START,
    )
    if (!tweenFromStat) {
      StoryResolveBubbles.setBubbleDisplaySize(
        bubbleImg,
        StoryResolveBubbles.RADIUS_END_LARGE,
      )
    }

    const txtPts = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${pts}[/stroke]`,
        tweenFromStat
          ? BBStyle.storyResolveBubble
          : StoryResolveBubbles.resolveBubbleTextStyle(
              StoryResolveBubbles.FONT_PX_END_LARGE,
            ),
      )
      .setOrigin(0.5)

    bubble.add([bubbleImg, txtPts])

    if (tweenFromStat) {
      const grow = {
        fontPx: StoryResolveBubbles.FONT_PX_START,
        radius: StoryResolveBubbles.RADIUS_START,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: end.x,
        y: end.y,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.FONT_PX_END_LARGE,
        radius: StoryResolveBubbles.RADIUS_END_LARGE,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(bubbleImg, grow.radius)
          txtPts.setStyle(
            StoryResolveBubbles.resolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  /** Nourish bubble; optional tween from the status strip into the main bubble’s bottom-right. */
  addNourishResolveCircle(
    card: CardImage,
    tweenFromStatus: boolean,
    nourishAmt: number,
    owner: number,
    moveDelayMs: number = 0,
  ): void {
    if (nourishAmt === 0) return

    const { x: endOffsetX, y: endOffsetY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomLeft')
    const cardCenter = this.localToWorld(card.container, 0, 0)
    const end = new Phaser.Math.Vector2(
      cardCenter.x + endOffsetX,
      cardCenter.y + endOffsetY,
    )

    let bx = end.x
    let by = end.y
    if (tweenFromStatus) {
      const cam = this.scene.cameras.main
      const sourceY = owner === 1 ? 200 : cam.height - 200
      const world = cam.getWorldPoint(cam.width / 2, sourceY)
      bx = world.x
      by = world.y
    }

    const bubble = this.makeBubbleRoot(bx, by)

    const nourishBubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_NOURISH,
      StoryResolveBubbles.RADIUS_START,
    )
    if (!tweenFromStatus) {
      StoryResolveBubbles.setBubbleDisplaySize(
        nourishBubbleImg,
        StoryResolveBubbles.RADIUS_END_SMALL,
      )
    }

    const label = nourishAmt > 0 ? `+${nourishAmt}` : `${nourishAmt}`
    const txtNourish = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromStatus
          ? BBStyle.storyResolveBubble
          : StoryResolveBubbles.resolveBubbleTextStyle(
              StoryResolveBubbles.FONT_PX_END_SMALL,
            ),
      )
      .setOrigin(0.5)

    bubble.add([nourishBubbleImg, txtNourish])

    if (tweenFromStatus) {
      const grow = {
        fontPx: StoryResolveBubbles.FONT_PX_START,
        radius: StoryResolveBubbles.RADIUS_START,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: end.x,
        y: end.y,
        delay: moveDelayMs,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.FONT_PX_END_SMALL,
        radius: StoryResolveBubbles.RADIUS_END_SMALL,
        delay: moveDelayMs,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(
            nourishBubbleImg,
            grow.radius,
          )
          txtNourish.setStyle(
            StoryResolveBubbles.resolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  /** Score beyond printed points and nourish; optional tween from the card text to bottom-left. */
  addEffectsResolveCircle(
    card: CardImage,
    tweenFromEffectText: boolean,
    effectAmt: number,
  ): void {
    if (effectAmt === 0) return

    const { x: endOffsetX, y: endOffsetY } =
      StoryResolveBubbles.secondaryBubbleRestAtMainCorner('bottomRight')
    const cardCenter = this.localToWorld(card.container, 0, 0)
    const end = new Phaser.Math.Vector2(
      cardCenter.x + endOffsetX,
      cardCenter.y + endOffsetY,
    )

    let bx = end.x
    let by = end.y
    if (tweenFromEffectText) {
      const start = this.localToWorld(
        card.container,
        card.txtText.x,
        card.txtText.y,
      )
      bx = start.x
      by = start.y
    }

    const bubble = this.makeBubbleRoot(bx, by)

    const effectsBubbleImg = StoryResolveBubbles.createBubbleImage(
      this.scene,
      StoryResolveBubbles.BUBBLE_TEXTURE_EFFECT,
      StoryResolveBubbles.RADIUS_START,
    )
    if (!tweenFromEffectText) {
      StoryResolveBubbles.setBubbleDisplaySize(
        effectsBubbleImg,
        StoryResolveBubbles.RADIUS_END_SMALL,
      )
    }

    const label = effectAmt > 0 ? `+${effectAmt}` : `${effectAmt}`
    const txtFx = this.scene.add
      .rexBBCodeText(
        0,
        0,
        `[stroke=${StoryResolveBubbles.STAT_STROKE}]${label}[/stroke]`,
        tweenFromEffectText
          ? BBStyle.storyResolveBubble
          : StoryResolveBubbles.resolveBubbleTextStyle(
              StoryResolveBubbles.FONT_PX_END_SMALL,
            ),
      )
      .setOrigin(0.5)

    bubble.add([effectsBubbleImg, txtFx])

    if (tweenFromEffectText) {
      const grow = {
        fontPx: StoryResolveBubbles.FONT_PX_START,
        radius: StoryResolveBubbles.RADIUS_START,
      }
      this.scene.tweens.add({
        targets: bubble,
        x: end.x,
        y: end.y,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
      })
      this.scene.tweens.add({
        targets: grow,
        fontPx: StoryResolveBubbles.FONT_PX_END_SMALL,
        radius: StoryResolveBubbles.RADIUS_END_SMALL,
        duration: Time.match.recapTween,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          StoryResolveBubbles.setBubbleDisplaySize(
            effectsBubbleImg,
            grow.radius,
          )
          txtFx.setStyle(
            StoryResolveBubbles.resolveBubbleTextStyle(grow.fontPx),
          )
        },
      })
    }
  }

  private static resolveBubbleTextStyle(fontPx: number) {
    const base = BBStyle.storyResolveBubble
    const t = base.strokeThickness ?? 1
    return {
      ...base,
      fontSize: `${Math.round(fontPx)}px`,
      strokeThickness: Math.max(
        1,
        Math.round(t * (fontPx / StoryResolveBubbles.FONT_PX_START)),
      ),
    }
  }
}
