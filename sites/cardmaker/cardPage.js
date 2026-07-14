// Per-card page (/cardmaker/{slug}/) hydration: renders the card whose fields
// are embedded in the page by generateAssets.ts, plus keyword reminders and
// the referenced card (linked to its own page), like the maker's hints.

// NOTE This file lives at the cardmaker root; card pages load it as ../cardPage.js
import {
  loadGameData,
  renderCard,
  realCardFields,
  findReferencedCard,
  keywordReminders,
} from './cardRenderer.js'

// Must match slugify in generateAssets.ts
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

async function init() {
  await loadGameData()

  const card = JSON.parse(document.getElementById('card-data').textContent)
  renderCard(document.getElementById('card-canvas'), realCardFields(card))

  // Referenced card, linked through to its own page
  let refCard = findReferencedCard(card.text)
  if (refCard && refCard.name === card.name) refCard = null
  const figure = document.getElementById('ref-card')
  figure.hidden = refCard === null
  if (refCard) {
    renderCard(document.getElementById('ref-canvas'), realCardFields(refCard))
    document.getElementById('ref-link').href = `../${slugify(refCard.name)}/`
  }

  // Keyword reminders
  const reminders = keywordReminders(card.text, refCard)
  const el = document.getElementById('reminders')
  el.hidden = reminders.length === 0
  el.innerHTML = reminders.map((r) => `<p>${r}</p>`).join('')
}

init()
