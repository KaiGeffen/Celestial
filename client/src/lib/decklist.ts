import BaseScene from '../scene/baseScene'
import Cutout from './buttons/cutout'
import Card from '@shared/state/card'
import { Space } from '../settings/settings'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite.js'

// TODO The cutouts arent being destroyed when cutouts destroy themselves

// Upper bound on total cards in the list (a loose UI guard, not the legal deck size)
const MAX_CARDS = 99

export default class Decklist {
  private scene: BaseScene
  sizer
  cutouts: Cutout[] = []
  countCards: number = 0
  cutoutClickCallback: (cutout: Cutout) => () => void
  private layoutDeferred = false

  constructor(
    scene: BaseScene,
    cutoutClickCallback: (cutout: Cutout) => () => void,
  ) {
    this.scene = scene
    this.cutoutClickCallback = cutoutClickCallback

    this.sizer = this.scene.rexUI.add.fixWidthSizer({
      width: Space.cutoutWidth + 10,
      // orientation: 'vertical',
      space: {
        // top: Space.padSmall,
        left: Space.padSmall,
        right: Space.padSmall,
      },
    })
  }

  // Add a new card to the deck
  addCard(card: Card) {
    if (this.countCards >= MAX_CARDS) {
      this.scene.signalError('Too many cards!')
      return
    }

    // If card exists in deck with same ID AND version, increment it
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutout = this.cutouts[i]

      if (
        cutout.card.id === card.id &&
        cutout.card.upgradeVersion === card.upgradeVersion &&
        !cutout.required
      ) {
        cutout.increment()
        this.countCards++
        return
      }
    }

    // Otherwise, create a new cutout
    this.addNewCutout(card)
  }

  // Remove a copy of the given card from the deck, return whether cutout is fully removed
  removeCard(card: Card): boolean {
    // Find the cutout with matching ID and version
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutout = this.cutouts[i]

      if (
        cutout.card.id === card.id &&
        cutout.card.upgradeVersion === card.upgradeVersion &&
        !cutout.required
      ) {
        this.countCards--

        // The cutout destroys itself at 0; drop it from our list to match
        if (cutout.decrement()) {
          this.cutouts.splice(i, 1)
          return true
        }

        return false
      }
    }

    // Cutout wasn't found
    return false
  }

  // Set the deck to the given cards
  setDeck(deck: Card[]) {
    // Remove the current deck
    this.cutouts.forEach((cutout) => cutout.destroy())
    this.cutouts = []
    this.countCards = 0

    this.layoutDeferred = true
    for (const card of deck) {
      if (card) this.addCard(card)
    }
    this.layoutDeferred = false
    this.sizer.layout()
  }

  setJourneyDeck(requiredCards: Card[]) {
    this.setDeck(requiredCards)
    this.cutouts.forEach((cutout) => {
      cutout.setRequired()
    })
  }

  // Get the quick copy/paste code for the deck
  getDeckCode(): number[] {
    let result = []
    this.cutouts.forEach((cutout) => {
      for (let i = 0; i < cutout.count; i++) {
        result.push(cutout.card.id)
      }
    })
    return result
  }

  // Add a new cutout to the decklist
  private addNewCutout(card: Card) {
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.cutoutWidth,
      Space.cutoutHeight,
    )
    const newCutout = new Cutout(container, card)
    newCutout.setOnClick(this.cutoutClickCallback(newCutout))

    // Add at the right index
    // Sort order: cost (ascending) -> name (ascending) -> upgrade version (ascending)
    // This ensures base versions (upgradeVersion 0) appear before + (1) and ++ (2)
    // Example: "Dove", "Dove+", "Dove++", "Yearn" will appear in that order
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutoutI = this.cutouts[i]

      if (
        cutoutI.card.cost > card.cost ||
        (cutoutI.card.cost === card.cost &&
          (cutoutI.card.name > card.name ||
            (cutoutI.card.name === card.name &&
              (cutoutI.card.upgradeVersion || 0) > (card.upgradeVersion || 0))))
      ) {
        this.sizer.insert(i, container)
        if (!this.layoutDeferred) this.sizer.layout()

        // Update values
        this.cutouts.splice(i, 0, newCutout)
        this.countCards++

        return
      }
    }

    // If no position was found, add to the end
    this.sizer.add(container)
    if (!this.layoutDeferred) this.sizer.layout()
    this.cutouts.push(newCutout)
    this.countCards++
  }
}
