import logEvent from './analytics'
import { Url } from './settings/url'

export default function openDiscord() {
  window.open(Url.discord, '_blank')

  logEvent('discord_opened')
}
