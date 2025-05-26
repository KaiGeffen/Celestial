import 'phaser'

import { Color } from '../../settings/settings'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, UserSettings, Space, Flags } from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import UButton from '../../lib/buttons/underlined'

import { BuilderBase } from '../builderScene'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite'

const maxCostFilter: number = 7

// Filter region of the deck builder scene
export default class FilterRegion {
  scene: BuilderBase

  // Full list of all cards in the catalog (Even those invisible)
  cardCatalog: CardImage[]

  // The costs and string that cards in the catalog are filtered for
  filterCostAry: boolean[] = []
  searchText: string = ''
  searchObj // TODO Type as RexInputText
  filterUnowned: boolean

  // Create this region, offset by the given width
  create(scene: BuilderBase, filterUnowned: boolean) {
    this.scene = scene
    this.filterUnowned = filterUnowned

    const background = scene.add.rectangle(
      0,
      0,
      100,
      100,
      Color.backgroundLight,
    )

    // Add drop shadow to background
    scene.plugins.get('rexDropShadowPipeline')['add'](background, {
      distance: 3,
      angle: -90,
      shadowColor: 0x000000,
    })

    scene.rexUI.add
      .sizer({
        space: {
          left: Space.pad,
          right: Space.pad,
          top: Space.padSmall,
          bottom: Space.padSmall,
          item: Space.pad * 2,
        },
      })
      .setOrigin(0)
      .add(this.createBackButton().setDepth(2))
      .add(this.createSearchText().setDepth(2))
      .add(this.createFilterButtons().setDepth(2))
      .addBackground(background.setDepth(2))
      .layout()

    return this
  }

  private createBackButton() {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Back',
      f: () => {
        this.scene.doBack()
      },
    })
    return container
  }

  private createSearchText() {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.textboxWidth,
      Space.textboxHeight,
    )

    this.searchObj = this.scene.add
      .rexInputText(0, 0, Space.textboxWidth, Space.textboxHeight, {
        type: 'text',
        text: this.searchText,
        align: 'center',
        placeholder: 'Search',
        tooltip: 'Search for cards by text.',
        fontFamily: 'Mulish',
        fontSize: '24px',
        color: Color.textboxText,
        maxLength: 40,
        selectAll: true,
        id: 'search-field',
      })
      .on(
        'textchange',
        (inputText) => {
          // Filter the visible cards based on the text
          this.searchText = inputText.text
          this.scene.filter()
        },
        this,
      )
      .removeInteractive()

    // Reskin for text input
    let icon = this.scene.add.image(0, 0, 'icon-InputText')

    container.add([this.searchObj, icon])

    return container
  }

  private createFilterButtons() {
    const sizer = this.scene.rexUI.add.sizer({
      space: {
        item: Space.padSmall,
      },
    })

    // Cost filters
    sizer.add(
      this.scene.add.text(0, 0, 'Cost:', Style.builder).setOrigin(1, 0.5),
    )

    // Make a sizer with no space between items for the buttons
    const buttonsSizer = this.scene.rexUI.add.sizer()
    sizer.add(buttonsSizer)

    let btns = []
    for (let i = 0; i <= 7; i++) {
      const container = new ContainerLite(
        this.scene,
        0,
        0,
        41,
        Space.buttonHeight,
      )
      buttonsSizer.add(container)

      let s = i === 7 ? '7+' : i.toString()

      let btn = new UButton(container, 0, 0, s)
      btn.setOnClick(this.onClickFilterButton(i, btns))

      btns.push(btn)
    }

    new Buttons.Icon({
      name: 'SmallX',
      within: sizer,
      f: this.onClearFilters(btns),
    })

    return sizer
  }

  private onClickFilterButton(thisI: number, btns: UButton[]): () => void {
    return () => {
      // Clear out all buttons
      for (let i = 0; i < btns.length; i++) {
        // Toggle this one, clear all others
        if (i === thisI) {
          btns[i].toggle()
          this.filterCostAry[i] = !this.filterCostAry[i]
        } else {
          btns[i].toggleOff()
          this.filterCostAry[i] = false
        }
      }

      this.scene.filter()
    }
  }

  private onClearFilters(btns: UButton[]): () => void {
    return () => {
      for (let i = 0; i < btns.length; i++) {
        btns[i].toggleOff()
        this.filterCostAry[i] = false
      }

      this.searchObj.setText('')
      this.searchText = ''

      this.scene.filter()
    }
  }

  // Returns a function which filters cards to see which are selectable
  getFilterFunction(): (card: Card) => boolean {
    // Filter cards based on their cost
    let costFilter = (card: Card) => {
      // If no number are selected, all cards are fine
      if (!this.filterCostAry.includes(true)) {
        return true
      } else {
        // The last filtered cost includes everything more than it
        return this.filterCostAry[Math.min(card.cost, maxCostFilter)]
      }
    }

    // Filter cards based on if they contain the string being searched
    let searchTextFilter = (card: Card) => {
      // Search over text, name, cost, points
      let s = `${card.text}
        ${card.name}
        ${card.cost}
        ${card.points}`

      // Compare inclusion without case
      const query = this.searchText.toLowerCase()
      s = s.toLowerCase()

      return s.includes(query)
    }

    // Filter cards based on whether you have unlocked them
    let ownershipFilter = (card: Card) => {
      return !this.filterUnowned || UserSettings._get('inventory')[card.id]
    }

    // Filter based on the overlap of all above filters
    let andFilter = (card: Card) => {
      return costFilter(card) && searchTextFilter(card) && ownershipFilter(card)
    }

    return andFilter
  }
}
