import Sizer from 'phaser3-rex-plugins/templates/ui/sizer/Sizer'
import BaseScene from '../scene/baseScene'
import Cutout from './buttons/cutout'
import Card from '../../../shared/state/card'
import { Space } from '../settings/settings'
import { MechanicsSettings } from '../../../shared/settings'
import ContainerLite from 'phaser3-rex-plugins/templates/ui/container/Container'

// TODO The cutouts arent being destroyed when cutouts destroy themselves

export default class Decklist {
  private scene: BaseScene
  sizer
  cutouts: Cutout[] = []
  countCards: number = 0
  cutoutClickCallback: (cutout: Cutout) => () => void

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
        top: Space.padSmall,
        left: 5,
        right: 5,
      },
    })
  }

  // Add a new card to the deck
  addCard(card: Card) {
    // If card exists in deck, increment it
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutout = this.cutouts[i]

      if (cutout.card.id === card.id && !cutout.required) {
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
    // Find the cutout
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutout = this.cutouts[i]

      if (cutout.card.id === card.id && !cutout.required) {
        // Update values
        cutout.decrement()
        this.countCards--

        // If fully removed, remove from deck list
        if (cutout.count === 0) {
          this.cutouts.splice(i, 1)
          cutout.destroy()

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

    // Add the new deck
    for (let i = 0; i < deck.length; i++) {
      let card = deck[i]
      this.addCard(card)
    }

    return true
  }

  setJourneyDeck(requiredCards: Card[]) {
    this.setDeck(requiredCards)
    this.cutouts.forEach((cutout) => {
      cutout.setRequired()
    })
  }

  // Get all cards in the deck listed as their id
  getCards(): number[] {
    return this.cutouts.reduce((acc, cutout) => {
      return [...acc, ...Array(cutout.count).fill(cutout.card.id)]
    }, [] as number[])
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
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutoutI = this.cutouts[i]

      if (
        cutoutI.card.cost > card.cost ||
        (cutoutI.card.cost === card.cost && cutoutI.card.name > card.name)
      ) {
        this.sizer.insert(i, container).layout()

        // Update values
        this.cutouts.splice(i, 0, newCutout)
        this.countCards++

        return
      }
    }

    // If no position was found, add to the end
    this.sizer.add(container).layout()
    this.cutouts.push(newCutout)
    this.countCards++
  }
}
