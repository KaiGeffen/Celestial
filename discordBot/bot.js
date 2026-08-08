// Celestial card-lookup bot: "!card <name>" replies with a link to that
// card's page — Discord unfurls the link itself using the page's own
// og:image/og:title tags, so the bot doesn't need to fetch or attach the
// image. Card data comes from the game server's public /cards/api (see
// server/src/network/cardmakerServer.ts) — this bot carries no card list
// of its own, just enough to know whether the slug exists.

import { Client, GatewayIntentBits } from 'discord.js'

const TOKEN = process.env.DISCORD_BOT_TOKEN
if (!TOKEN) {
  console.error('DISCORD_BOT_TOKEN is not set')
  process.exit(1)
}

const SITE_BASE = process.env.SITE_BASE ?? 'https://celestialdecks.gg/cards'
const API_BASE = process.env.API_BASE ?? 'https://celestialdecks.gg/cards/api'

const PREFIX = '!card'

// Must match slugify in generateAssets.ts / cardmakerServer.ts
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
})

client.on('messageCreate', async (message) => {
  if (message.author.bot) return
  if (!message.content.toLowerCase().startsWith(PREFIX)) return

  const query = message.content.slice(PREFIX.length).trim()
  if (!query) {
    await message.reply(`Usage: \`${PREFIX} <card name>\`, e.g. \`${PREFIX} Dove\``)
    return
  }

  const slug = slugify(query)
  try {
    // HEAD, not GET: only need to know the slug exists, not its fields.
    const res = await fetch(`${API_BASE}/game-cards/${encodeURIComponent(slug)}`, {
      method: 'HEAD',
    })
    if (res.status === 404) {
      await message.reply(`No card named "${query}" — check the spelling and try again.`)
      return
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
  } catch (e) {
    console.error('Card lookup failed:', e)
    await message.reply("Couldn't reach the card database — try again in a bit.")
    return
  }

  await message.reply(`${SITE_BASE}/${slug}/`)
})

client.login(TOKEN)
