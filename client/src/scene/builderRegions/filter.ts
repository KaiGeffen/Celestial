import 'phaser'

import { Color } from '../../settings/settings'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, UserSettings, Space, Flags } from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import UButton from '../../lib/buttons/underlined'

import { BuilderBase } from '../builderScene'

const maxCostFilter: number = 7

// Filter region of the deck builder scene
export default class FilterRegion {
  scene: BuilderBase

  // Full list of all cards in the catalog (Even those invisible)
  cardCatalog: CardImage[]

  // The costs and string that cards in the catalog are filtered for
  filterCostAry: boolean[] = []
  searchText: string = ''
  searchObj
  filterUnowned: boolean

  // Create this region, offset by the given width
  create(scene: BuilderBase, filterUnowned: boolean) {
    this.scene = scene
    this.filterUnowned = filterUnowned

    if (Flags.mobile) {
      const x = Space.windowWidth - Space.pad * 2 - (Space.iconSize * 3) / 2
      const y = Space.pad + Space.iconSize / 2
      let container = scene.add.container(x, y)
      let btnSearch = new Buttons.Icon({
        name: 'Search',
        within: container,
        x: 0,
        y: 0,
        f: () => {
          this.scene.scene.launch('MenuScene', {
            menu: 'search',
            callback: (s: string) => {
              // Filter the visible cards based on the text
              this.searchText = s
              this.scene.filter()
            },
            start: this.searchText,
          })
        },
      })
    } else {
      let container = scene.add.container().setDepth(2)

      this.createBackground(container)

      new Buttons.Basic({
        within: container,
        text: 'Back',
        x: Space.pad + Space.buttonWidth / 2,
        y: 40,
        f: () => {
          scene.doBack()
        },
      })

      this.createFilterButtons(container)

      this.createTextSearch(container)
    }

    return this
  }

  private createBackground(container: Phaser.GameObjects.Container) {
    let background
    background = this.scene.add
      .image(0, 0, 'chrome-SearchBar')
      .setOrigin(0)
      .setInteractive(
        new Phaser.Geom.Rectangle(
          0,
          0,
          Space.windowWidth - 40,
          Space.filterBarHeight,
        ),
        Phaser.Geom.Rectangle.Contains,
      )

    container.add(background)
  }

  private createFilterButtons(container: Phaser.GameObjects.Container) {
    // Where the filter buttons start
    const x0 = 620
    const y = 40

    // Cost filters
    container.add(
      this.scene.add.text(x0, y, 'Cost:', Style.builder).setOrigin(1, 0.5),
    )

    let btns = []
    for (let i = 0; i <= 7; i++) {
      let s = i === 7 ? '7+' : i.toString()
      let btn = new UButton(container, x0 + 35 + i * 41, y, s)
      btn.setOnClick(this.onClickFilterButton(i, btns))

      btns.push(btn)
    }
    let btnX = new Buttons.Icon({
      name: 'SmallX',
      within: container,
      x: x0 + 44 + 8 * 41,
      y: y + 3,
      f: this.onClearFilters(btns),
    })
  }

  private createTextSearch(container: Phaser.GameObjects.Container) {
    this.searchObj = this.scene.add['rexInputText'](
      369,
      40,
      Space.textboxWidth,
      Space.textboxHeight,
      {
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
      },
    )
      .on(
        'textchange',
        function (inputText) {
          // Filter the visible cards based on the text
          this.searchText = inputText.text
          this.scene.filter()
        },
        this,
      )
      .removeInteractive()

    // Reskin for text input
    let icon = this.scene.add.image(
      this.searchObj.x,
      this.searchObj.y,
      'icon-InputText',
    )

    container.add([this.searchObj, icon])
  }

  private onClickFilterButton(thisI: number, btns: UButton[]): () => void {
    let that = this

    return function () {
      // Clear out all buttons
      for (let i = 0; i < btns.length; i++) {
        // Toggle this one, clear all others
        if (i === thisI) {
          btns[i].toggle()
          that.filterCostAry[i] = !that.filterCostAry[i]
        } else {
          btns[i].toggleOff()
          that.filterCostAry[i] = false
        }
      }

      that.scene.filter()
    }
  }

  private onClearFilters(btns: UButton[]): () => void {
    let that = this

    return function () {
      for (let i = 0; i < btns.length; i++) {
        btns[i].toggleOff()
        that.filterCostAry[i] = false
      }

      that.scene.filter()
    }
  }

  // Returns a function which filters cards to see which are selectable
  getFilterFunction(): (card: Card) => boolean {
    let that = this

    // Filter cards based on their cost
    let costFilter = function (card: Card): boolean {
      // If no number are selected, all cards are fine
      if (!that.filterCostAry.includes(true)) {
        return true
      } else {
        // The last filtered cost includes everything more than it
        return that.filterCostAry[Math.min(card.cost, maxCostFilter)]
      }
    }

    // Filter cards based on if they contain the string being searched
    let searchTextFilter = function (card: Card): boolean {
      // Search over text, name, cost, points
      let s = `${card.text}
        ${card.name}
        ${card.cost}
        ${card.points}`

      // Compare inclusion without case
      const query = that.searchText.toLowerCase()
      s = s.toLowerCase()

      return s.includes(query)
    }

    // Filter cards based on whether you have unlocked them
    let ownershipFilter = function (card: Card): boolean {
      return !that.filterUnowned || UserSettings._get('inventory')[card.id]
    }

    // Filter based on the overlap of all above filters
    let andFilter = function (card: Card): boolean {
      return costFilter(card) && searchTextFilter(card) && ownershipFilter(card)
    }

    return andFilter
  }
}
