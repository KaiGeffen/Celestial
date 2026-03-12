# Spec: Split Builder into Deck Selector + Deck Editor

## Overview

Redesign the current **BuilderScene** (`client/src/scene/builderScene.ts`) into **two separate scenes**:

1. **Deck Selector** — First screen when entering the deckbuilder. Choose a deck, create/import/delete, then either edit it or play a match.
2. **Deck Editor** — Full deck-building UI (catalog, deck region, filters, etc.); entered from Deck Selector via "Edit deck" or "Create new+".

This spec details both **Deck Selector** and **Deck Editor** below.

---

## Entry points

- **HomeScene** deckbuilder button currently does `this.scene.start('BuilderScene', { isTutorial: false })`. Change to start **Deck Selector** (e.g. `DeckSelectorScene`).
- **Play menu** "Back" / return-to-builder currently does `this.scene.start('BuilderScene', ...)`. Change to start **Deck Selector**.
- **MatchScene** return-to-builder currently goes to `BuilderScene`. Change to **Deck Selector**.
- **MapJourneyBuilderScene** stays as-is (journey-specific builder); no change for this spec.

---

## Deck Selector scene

### Layout (three columns)

- **Left:** Deck roster — contents of the **currently selected** deck.
- **Center:** List of the user's decks (grid or list of deck entries).
- **Right:** Action buttons (Create new+, Import New, Delete deck, Edit deck, Share deck, Play Match).

Each region has a title: e.g. "DECK ROSTER" (left), "MY DECKS" (center); the right column uses the action button labels as its titles.

---

### Left: Deck roster (contents of selected deck)

- **Component:** Reuse **Decklist** from `client/src/lib/decklist.ts`.
- **Data:** When a deck is selected in the center column, set the Decklist to that deck's cards (from `UserSettings._get('decks')[index]` → `deck.cards` → map via `Catalog.getCardById(id)` to `Card[]`, then `decklist.setDeck(cards)`).
- **Behavior:**
  - Read-only in this scene: show cards and amounts; no need to add/remove from here (that happens in Deck Editor).
- **When no deck selected:** Show empty roster (e.g. empty Decklist or placeholder text).

**Reference:**  
`client/src/lib/decklist.ts` — `Decklist` constructor takes `(scene, cutoutClickCallback)`; use a no-op callback in this scene (no focus menu). Use `setDeck(deck: Card[])` to display the selected deck.

---

### Center: List of decks

- **Data source:** Same as today — `UserSettings._get('decks')` (array of `Deck`: `name`, `cards`, `cosmeticSet`).
- **UI:** For now, each deck is a **single `Buttons.Basic`** (`client/src/lib/buttons/basic.ts`) in a **rex UI Sizer** ([Sizer docs](https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-sizer/)).
  - One button per deck; label = deck name (e.g. `deck.name`).
  - Layout: vertical or grid via `scene.rexUI.add.sizer()` (e.g. `orientation: 1` for vertical, or use GridSizer for a grid). Add each button (wrapped in a container if needed for sizing) with `sizer.add(child, ...).layout()`.
- **Selection:**
  - Exactly one deck can be "selected" (or none). Store `savedDeckIndex: number | undefined`.
  - On click: select that deck (update `savedDeckIndex`, refresh left panel Decklist, update selected state on buttons — e.g. `BasicButton` enable/glow/select state as in existing code).
  - Optional: clicking the selected deck again could deselect (match current BuilderScene behavior).
- **Scrolling:** If the list is long, wrap the sizer in a **ScrollablePanel** (same pattern as `newScrollablePanel` in `client/src/lib/scrollablePanel.ts` and as in `decklists.ts`) so the center column scrolls.
- **Persistence:** Restore selection on load from `UserSettings._get('equippedDeckIndex')` (clamped to valid range), same idea as current `BuilderScene` create().

**Reference:**  
`client/src/scene/builderRegions/decklists.ts` — deck list creation, `createDeckBtn`, `decklistOnClick`, `selectDeck`, `createDecklistPanel`, `filter`. For Deck Selector we simplify: no `Buttons.Decklist` (no per-row delete on the list); use `Buttons.Basic` only. Delete is a single right-column "Delete deck" that acts on current selection.

---

### Right: Action buttons

All are **Buttons.Basic** (or equivalent) in a vertical sizer. Behavior:

| Button          | Action                                                                                                                                                                                                                                                                                                                                                                        |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create new+** | Create a new deck (same logic as current "new deck": respect `DecklistSettings.MAX_DECKS`, create via `UserSettings._push('decks', { name, cards: [], cosmeticSet })`, select it), then **open Deck Editor** for that deck (e.g. `scene.start('DeckEditorScene', { deckIndex })`).                                                                                            |
| **Import New**  | For now: same as Create new+ (no actual import-from-clipboard yet).                                                                                                                                                                                                                                                                                                           |
| **Delete deck** | If a deck is selected: open **Confirm menu** (`client/src/scene/menu/confirm.ts`) with hint `'delete this deck'` and callback that: removes `UserSettings._get('decks')[savedDeckIndex]`, updates `equippedDeckIndex` if needed, refreshes center list, clears selection if the deleted deck was selected. If none selected, either hide/disable button or show a message.    |
| **Edit deck**   | If a deck is selected: **open Deck Editor** for that deck (e.g. `scene.start('DeckEditorScene', { deckIndex: savedDeckIndex })`). If none selected, disable or prompt to select one.                                                                                                                                                                                          |
| **Share deck**  | If a deck is selected: copy deck code to clipboard like **alterDeck** — use `encodeShareableDeckCode(deckCode)` from `shared/codec.ts`, `navigator.clipboard.writeText(encodedDeck)`, then show message "Deck code copied to clipboard." (and if `Flags.local`, optionally also copy array form). If none selected, disable or show message.                                  |
| **Play Match**  | Open **Play menu** the same way as current builder: `scene.launch('MenuScene', { menu: 'play', activeScene: this })`. Play menu uses `equippedDeckIndex` / current deck from UserSettings; ensure the "current" deck is the one selected in Deck Selector (e.g. set `UserSettings._set('equippedDeckIndex', savedDeckIndex)` when selection changes and before opening Play). |

**References:**

- Confirm: `decklists.ts` `deleteDeck()` → `scene.launch('MenuScene', { menu: 'confirm', callback, hint: 'delete this deck' })`.
- Share: `client/src/scene/menu/alterDeck.ts` (lines ~311–321) — `encodeShareableDeckCode`, clipboard, `showMessage`.
- Play: `builderScene.ts` `startCallback()` → `scene.launch('MenuScene', { menu: 'play', activeScene: this })`.

---

## Scene flow

- **Deck Selector** → (Create new+ / Import New) → **Deck Editor** (with new deck index).
- **Deck Selector** → (Edit deck) → **Deck Editor** (with existing `deckIndex`).
- **Deck Editor** → "Back" or done → **Deck Selector** (so user returns to deck list).
- **Deck Selector** → (Play Match) → **MenuScene** (play) → then match or back to Deck Selector / Home.

When leaving Deck Editor, start Deck Selector (e.g. `scene.start('DeckSelectorScene')`) so the user always returns to the selector first.

---

## Deck Editor scene

The Deck Editor is the full deck-building screen. It receives `{ deckIndex: number }` and reads/writes `UserSettings._get('decks')[deckIndex]` (name, cards, cosmeticSet). On change, update the saved deck (same idea as current `updateSavedDeck`). Exit: `scene.start('DeckSelectorScene')`.

Layout has **three sections**:

---

### 1. Collection (left)

- **Scrollable list of all cards** — Same behavior as the catalog in `client/src/scene/builderRegions/catalog.ts`:
  - Use a scrollable panel with a fix-width sizer of card images (`CardImage` from `client/src/lib/cardImage.ts`).
  - Pool: collectible cards (and beta cards if `Flags.devCardsEnabled`); filter to owned cards via `UserSettings._get('cardInventory')` unless dev.
  - Clicking a card adds one copy to the deck (call the scene's `addCardToDeck(card)` and refresh saved deck).
  - Support filtering (see search below) and optional sort (e.g. by cost/color like `catalogRegion.toggleOrdering()`).
- **Search bar at the bottom** — Like `client/src/scene/builderRegions/filter.ts`:
  - A `rexInputText` search field (placeholder e.g. "Search"), at the bottom of the collection area.
  - On `textchange`, filter the visible cards in the catalog by the search string (e.g. card name); re-layout/refresh the catalog so only matching cards are shown (same idea as `filter.ts` search + `scene.filter()`).

**References:** `catalog.ts` for panel creation, `newScrollablePanel`, `createCard`, `filter()`, `toggleOrdering()`; `filter.ts` for `createSearchText()` and wiring search to filter.

---

### 2. Deck roster (center)

- **Component:** **Decklist** from `client/src/lib/decklist.ts`, showing the current deck's cards as **Cutouts** (`client/src/lib/buttons/cutout.ts`).
- **Cutout interaction** (same as `client/src/scene/builderRegions/deck.ts`):
  - **Click (left):** Remove one copy of that card from the deck. If the cutout's count reaches 0, remove the cutout and re-layout the panel.
  - **Right-click:** Add one copy of that card to the deck (call `addCardToDeck(cutout.card)`).
- Pass the cutout click callback from the scene: e.g. a function that receives the active pointer, uses `pointer.rightButtonDown()` to decide add vs remove, then updates the decklist, card count text, and saved deck (see `deck.ts` `onClickCutout()`).
- Decklist is bound to `UserSettings._get('decks')[deckIndex].cards`; any add/remove updates the deck array and persists (e.g. `updateSavedDeck(getDeckCode())`).

**Reference:** `deck.ts` — `Decklist`, `onClickCutout()`, `removeCardFromDeck`, `addCardToDeck`, `updateText()`, `getDeckCode()`.

---

### 3. Right side

- **At top:** A **Back** button — `client/src/lib/buttons/basic.ts` (`Buttons.Basic`), text "Back". On click: `scene.start('DeckSelectorScene')` (or equivalent).
- **Cosmetic styles:**
  - Show an **Avatar** button from `client/src/lib/buttons/avatar.ts` that displays the current deck's avatar and border (from `decks[deckIndex].cosmeticSet`).
  - A **"Styles"** (or similar) control that opens a menu when clicked. The menu should be **similar to the avatar/border selection in** `client/src/scene/menu/alterDeck.ts`:
    - Tabs or buttons for **Icon** (avatar) and **Border** (like alterDeck's `tab.ICON` and `tab.BORDER`).
    - Grid of unlocked avatars (from `getUnlockedAvatars()`), then grid of unlocked borders (from `getUnlockedBorders()`); selection updates `cosmeticSet.avatar` and `cosmeticSet.border`.
    - On confirm, save to `UserSettings._get('decks')[deckIndex].cosmeticSet` and update the displayed avatar button.
  - **Future:** This same Styles flow will include cardback cosmetic; for now only avatar and border.
- **Below styles:** A **Play** button (`Buttons.Basic` or equivalent). On click: open the play menu — `scene.launch('MenuScene', { menu: 'play', activeScene: this })` (same as `client/src/scene/menu/play.ts`). Ensure the equipped deck index is set to the current `deckIndex` so Play uses this deck.

**References:** `alterDeck.ts` — `createCosmeticOptions()`, `updateCosmeticGrid()`, Icon/Border tabs, `getUnlockedAvatars`, `getUnlockedBorders`; `deck.ts` for avatar button and `openEditMenu()`; `avatar.ts` for `Buttons.Avatar` with `avatarId` and `border`.

---

Implementation can copy from `BuilderScene`, `DeckRegion`, `CatalogRegion`, and `FilterRegion` as needed.

---

## Implementation notes

1. **New scene key:** Register a new Phaser scene for Deck Selector (e.g. `DeckSelectorScene`) in `client/src/app.ts` and use it wherever we currently start `BuilderScene` for the main deckbuilder flow.
2. **Sizer:** Use `scene.rexUI.add.sizer(config)` for the main three-column layout and for the right-column button column; use orientation and space/item as needed to match the wireframe.
3. **Naming:** "Deck Selector" vs "Deck Editor" can be scene keys like `DeckSelectorScene` and `DeckEditorScene`; exact names can follow existing conventions (e.g. `BuilderScene` → keep for Editor or rename to `DeckEditorScene` and introduce `DeckSelectorScene`).
4. **Deck list logic:** DecklistsRegion will be deleted eventually. Copy the same code from `decklists.ts` (create/delete/update/select, `UserSettings` deck array handling) into the Deck Selector scene rather than refactoring into shared helpers.

---

## Summary checklist (Deck Selector)

- [ ] New scene: Deck Selector (e.g. `DeckSelectorScene`).
- [ ] Left: `Decklist` from `client/src/lib/decklist.ts` showing `decks[savedDeckIndex].cards` when a deck is selected.
- [ ] Center: List of decks from `UserSettings._get('decks')`, each a `Buttons.Basic` in a rex UI Sizer (scrollable if needed).
- [ ] Right: Buttons — Create new+, Import New (same as Create), Delete (confirm menu), Edit deck (→ Deck Editor), Share deck (copy deckcode), Play Match (Play menu).
- [ ] Entry points: HomeScene, Play menu return, MatchScene return → start Deck Selector instead of BuilderScene.
- [ ] Deck Editor scene and transition from Deck Selector (Create/Edit) to be implemented in a follow-up; this spec defines the contract (e.g. `DeckEditorScene` with `deckIndex`).

---

## Summary checklist (Deck Editor)

- [ ] New scene: Deck Editor (e.g. `DeckEditorScene`), receives `deckIndex`.
- [ ] Collection: scrollable catalog (like `catalog.ts`), search bar at bottom (like `filter.ts`).
- [ ] Deck roster: `Decklist` + Cutouts; left-click remove copy, right-click add copy (like `deck.ts`).
- [ ] Right: Back (Basic), Avatar + Styles menu (avatar/border like `alterDeck.ts`), Play button (opens play menu).

This spec is ready to use for implementing both Deck Selector and Deck Editor.
