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
  sizer: Sizer
  cutouts: Cutout[] = []
  countCards: number = 0

  constructor(scene: BaseScene) {
    this.scene = scene

    this.sizer = this.scene.rexUI.add.sizer({
      orientation: 'vertical',
      space: {
        top: Space.padSmall,
      },
    })
  }

  addCard(card: Card) {
    // If card count exceeds maximum, return error TODO
    if (this.countCards >= MechanicsSettings.DECK_SIZE * 2) {
      return
    }

    // If card exists in deck, increment it
    for (let i = 0; i < this.cutouts.length; i++) {
      const cutout = this.cutouts[i]

      if (cutout.card.id === card.id) {
        cutout.increment()
        this.countCards++
        return
      }
    }

    // Otherwise, create a new cutout
    this.addNewCutout(card)
  }

  setDeck(deck: Card[]) {
    // Remove the current deck
    this.cutouts.forEach((cutout) => cutout.destroy())
    this.cutouts = []
    this.countCards = 0

    // Add the new deck
    console.log('setting deck', deck)
    for (let i = 0; i < deck.length; i++) {
      let card = deck[i]
      console.log('adding card', card)
      this.addCard(card)
    }

    return true
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
    console.log('adding new cutout', card)
    let container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.deckPanelWidth,
      Space.cutoutHeight,
    )
    const newCutout = new Cutout(container, card)

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

        console.log('added new cutout')

        return
      }
    }

    // If no position was found, add to the end
    this.sizer.add(container).layout()
    this.cutouts.push(newCutout)
    this.countCards++

    console.log('added new cutout')
  }
}
