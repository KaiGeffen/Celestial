import 'phaser'

import { Color } from '../../settings/settings'
import Card from '../../../../shared/state/card'
import { CardImage } from '../../lib/cardImage'
import { Style, UserSettings, Space, Flags } from '../../settings/settings'
import Buttons from '../../lib/buttons/buttons'
import UButton from '../../lib/buttons/underlined'
import Catalog from '../../../../shared/state/catalog'

import { BuilderBase } from '../builderScene'
import ContainerLite from 'phaser3-rex-plugins/plugins/containerlite'

const MAX_COST_FILTER: number = 7

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
    this.scene.addShadow(background, -90)

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
      .add(this.createSortButton().setDepth(2))
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

  private createSortButton() {
    const container = new ContainerLite(
      this.scene,
      0,
      0,
      Space.buttonWidth,
      Space.buttonHeight,
    )
    new Buttons.Basic({
      within: container,
      text: 'Sort',
      f: () => {
        this.scene.catalogRegion.toggleOrdering()
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

  // Get the deck filter token if one exists in the search query
  getDeckFilter(): string {
    if (!this.searchText.trim()) return null

    const tokens = this.parseSearchQuery(this.searchText)
    const deckToken = tokens.find((token) => token.field === 'deck')
    return deckToken?.text
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
        return this.filterCostAry[Math.min(card.cost, MAX_COST_FILTER)]
      }
    }

    // Filter cards based on if they contain the string being searched
    let searchTextFilter = (card: Card) => {
      if (!this.searchText.trim()) return true

      // Parse search query into tokens (handling quotes)
      const tokens = this.parseSearchQuery(this.searchText)
      tokens.filter((token) => token.field !== 'deck')

      // Check each token against the card
      for (const token of tokens) {
        if (!this.matchesToken(card, token)) {
          return false
        }
      }

      return true
    }

    // Filter cards based on whether you have unlocked them (Only for journey mode)
    let ownershipFilter = (card: Card) => {
      return !this.filterUnowned || UserSettings._get('inventory')[card.id]
    }

    // Filter based on the overlap of all above filters
    let andFilter = (card: Card) => {
      return costFilter(card) && searchTextFilter(card) && ownershipFilter(card)
    }

    return andFilter
  }

  // Parse search query into tokens, handling quotes and special syntax
  private parseSearchQuery(query: string): SearchToken[] {
    const tokens: SearchToken[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < query.length; i++) {
      const char = query[i]

      if (char === '"') {
        if (inQuotes) {
          // End of quoted phrase
          if (current) {
            tokens.push(this.createToken(current, true))
            current = ''
          }
          inQuotes = false
        } else {
          // Start of quoted phrase
          if (current.trim()) {
            tokens.push(this.createToken(current.trim(), false))
            current = ''
          }
          inQuotes = true
        }
      } else if (char === ' ' && !inQuotes) {
        if (current.trim()) {
          tokens.push(this.createToken(current.trim(), false))
          current = ''
        }
      } else {
        current += char
      }
    }

    // Add remaining token
    if (current.trim()) {
      tokens.push(this.createToken(current.trim(), inQuotes))
    }

    return tokens
  }

  // Create a search token with parsed metadata
  private createToken(text: string, isPhrase: boolean): SearchToken {
    // Start with this token, set fields as we go
    const token: SearchToken = {
      text: text,
      isPhrase: isPhrase,
      negated: false,
      field: null,
      rangeMin: null,
      rangeMax: null,
    }

    // Check for negation
    if (text.startsWith('!')) {
      token.negated = true
      text = text.substring(1)
      token.text = text
    }

    // Check for field-specific searches (cost:, points:, name:, text:)
    // NOTE: deck: filter is handled separately for decklists, not for card filtering
    const fieldMatch = text.match(/^(cost|points|name|text|deck):(.+)$/i)
    if (fieldMatch) {
      token.field = fieldMatch[1].toLowerCase()
      const value = fieldMatch[2]
      token.text = value

      // Parse range/comparison for cost and points
      if (token.field === 'cost' || token.field === 'points') {
        // Check for range (e.g., "1-3")
        const rangeMatch = value.match(/^(\d+)-(\d+)$/)
        if (rangeMatch) {
          token.rangeMin = parseInt(rangeMatch[1])
          token.rangeMax = parseInt(rangeMatch[2])
        }
        // Check for "X+" (e.g., "2+")
        else if (value.endsWith('+')) {
          token.rangeMin = parseInt(value)
          token.rangeMax = Infinity
        } else if (value.endsWith('-')) {
          token.rangeMin = -Infinity
          token.rangeMax = parseInt(value)
        }
        // Check for exact match
        else if (/^\d+$/.test(value)) {
          token.rangeMin = parseInt(value)
          token.rangeMax = parseInt(value)
        }
      }
    }

    return token
  }

  // Check if a card matches a single search token
  private matchesToken(card: Card, token: SearchToken): boolean {
    let matches = false

    // Handle field-specific searches
    if (token.field === 'cost') {
      if (token.rangeMin !== null && token.rangeMax !== null) {
        matches = card.cost >= token.rangeMin && card.cost <= token.rangeMax
      }
    } else if (token.field === 'points') {
      if (token.rangeMin !== null && token.rangeMax !== null) {
        matches = card.points >= token.rangeMin && card.points <= token.rangeMax
      }
    } else if (token.field === 'name') {
      matches = card.name.toLowerCase().includes(token.text.toLowerCase())
    } else if (token.field === 'text') {
      matches = card.text.toLowerCase().includes(token.text.toLowerCase())
    } else {
      // No field specified - search everywhere
      matches = this.searchEverywhere(card, token.text)
    }

    // Apply negation
    return token.negated ? !matches : matches
  }

  // Search in all card fields (name, text, cost, points, keywords, referenced cards)
  private searchEverywhere(card: Card, query: string): boolean {
    const lowerQuery = query.toLowerCase()

    // Build searchable string
    let searchableText = `${card.name} ${card.text} ${card.cost} ${card.points}`

    // Keyword reminder text
    for (const [keyword, _] of Catalog.getReferencedKeywords(card)) {
      searchableText += ` ${keyword.text}`
    }

    // Text from all referenced cards
    for (const cardName of Catalog.getReferencedCardNames(card)) {
      const referencedCard = Catalog.getCard(cardName)
      if (referencedCard) {
        searchableText += ` ${referencedCard.text}`
      }
    }

    // Convert to lowercase
    searchableText = searchableText.toLowerCase()

    // Check if the query is in the searchable text
    return searchableText.includes(lowerQuery)
  }
}

interface SearchToken {
  text: string
  isPhrase: boolean
  negated: boolean
  field: string | null // 'cost', 'points', 'name', 'text', or null
  rangeMin: number | null
  rangeMax: number | null
}
