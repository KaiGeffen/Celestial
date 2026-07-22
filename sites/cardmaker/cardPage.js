// Per-card page (/cardmaker/{slug}/) hydration: renders the card whose fields
// are embedded in the page by generateAssets.ts, plus keyword reminders and
// any referenced cards (each linked to its own page), like the maker's hints.

// NOTE This file lives at the cardmaker root; card pages load it as ../cardPage.js
import {
  loadGameData,
  createTiltCard,
  downloadCardPng,
  realCardFields,
  findReferencedCards,
  renderReferencedCards,
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
  const fields = realCardFields(card)
  document
    .getElementById('card-mount')
    .appendChild(createTiltCard(fields, { width: 'min(354px, 90vw)' }))

  document
    .getElementById('btn-download')
    .addEventListener('click', () => downloadCardPng(fields, card.name))

  // Referenced cards, each linked through to its own page
  const refCards = findReferencedCards(card.text).filter(
    (c) => c.name !== card.name,
  )
  renderReferencedCards(
    document.getElementById('ref-cards'),
    refCards,
    (c) => `../${slugify(c.name)}/`,
  )

  // Keyword reminders
  const reminders = keywordReminders(card.text, refCards)
  const el = document.getElementById('reminders')
  el.hidden = reminders.length === 0
  el.innerHTML = reminders.map((r) => `<p>${r}</p>`).join('')
}

init()
