import 'phaser'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

import { CardImage } from './cardImage'
import Catalog from '../../../shared/state/catalog'
import { Time } from '../settings/settings'
import { MatchScene } from '../scene/matchScene'

/**
 * Flip-over reveal: a cardback shrinks horizontally to nothing, then the real card
 * grows from nothing back to its full size. Shared by Animator (story reveals) and
 * the journey mission unlock screen.
 *
 * The hidden cardback is created in the same `parent` as the real card so it lines
 * up regardless of how that container is nested (Phaser Container or ContainerLite).
 *
 * @param i - reveal slot index; staggers each subsequent reveal by half its duration
 *            so the next card starts flipping as the previous finishes.
 */
export function animateCardReveal(
  scene: MatchScene,
  card: CardImage,
  parent: Phaser.GameObjects.Container | ContainerLite,
  i: number = 0,
): void {
  const endScaleX = card.container.scaleX
  const endScaleY = card.container.scaleY

  // A scaling trick to make the card appear to flip over
  const scaleTrick = 0.95

  // Start the next reveal halfway through the current reveal
  const stepDelay = i * (Time.match.cardReveal / 2)

  // Animate the back of the card flipping
  const hiddenCard = new CardImage(
    Catalog.cardback,
    parent,
    false,
    true,
    card.cardback,
  ).show()
  hiddenCard.container.setPosition(card.container.x, card.container.y)
  hiddenCard.container.setScale(endScaleX, endScaleY)
  // ContainerLite parents don't auto-propagate depth to late-added children, so
  // the cardback would render at depth 0 (behind whatever the source card sits in).
  // Mirror the source card's depth so the flip is visible inside e.g. the unlock panel.
  hiddenCard.container.setDepth(card.container.depth)

  scene.tweens.add({
    targets: hiddenCard.container,
    scaleX: 0,
    scaleY: endScaleY * scaleTrick,
    delay: stepDelay,
    duration: Time.match.cardReveal / 2,
    ease: 'Sine.easeIn',
    onComplete: () => hiddenCard.destroy(),
  })

  // Animate the actual card flipping up
  card.hide()
  card.container.scaleY = endScaleY * scaleTrick
  card.container.scaleX = 0
  scene.tweens.add({
    targets: card.container,
    scaleX: endScaleX,
    scaleY: endScaleY,
    delay: stepDelay + Time.match.cardReveal / 2,
    duration: Time.match.cardReveal / 2,
    ease: 'Sine.easeOut',
    onStart: () => card.show(),
  })
}
