// Read-only view of a published community card (/cardmaker/community/?id=N).
// Fetches the card's fields from the API and renders it with the shared
// renderer, plus keyword reminders and the referenced card — mirroring the
// game card pages (cardPage.js). Published cards can't be edited, so this is
// a view-only page, not the maker.

import {
  loadGameData,
  renderCard,
  realCardFields,
  findReferencedCard,
  keywordReminders,
} from '../cardRenderer.js'

const API_BASE = '/cardmaker/api'

// Must match slugify in generateAssets.ts
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const $ = (id) => document.getElementById(id)

async function init() {
  await loadGameData()

  const id = new URLSearchParams(location.search).get('id')
  const main = document.querySelector('.card-page')
  const status = $('status')

  if (!id) {
    main.hidden = true
    status.textContent = 'No card specified.'
    return
  }

  let card
  try {
    const res = await fetch(`${API_BASE}/cards/${encodeURIComponent(id)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    card = await res.json()
  } catch (e) {
    main.hidden = true
    status.innerHTML = 'Card not found. <a href="../">Make your own →</a>'
    return
  }

  document.title = `${card.name} — Celestial`
  $('card-title').textContent = card.name

  // Community cards already carry a subject index, so render their fields directly
  renderCard($('card-canvas'), card)

  if (card.creator) {
    const credit = $('credit')
    credit.textContent = `by ${card.creator}`
    credit.hidden = false
  }

  // Referenced game card, linked through to its own page
  let refCard = findReferencedCard(card.text)
  if (refCard && refCard.name === card.name) refCard = null
  const figure = $('ref-card')
  figure.hidden = refCard === null
  if (refCard) {
    renderCard($('ref-canvas'), realCardFields(refCard))
    $('ref-link').href = `../${slugify(refCard.name)}/`
  }

  // Keyword reminders
  const reminders = keywordReminders(card.text, refCard)
  const el = $('reminders')
  el.hidden = reminders.length === 0
  el.innerHTML = reminders.map((r) => `<p>${r}</p>`).join('')
}

init()
