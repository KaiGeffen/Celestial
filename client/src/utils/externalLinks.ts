import logEvent from './analytics'
import { Url } from '../settings/url'
import Server from '../server'

export function openDiscord() {
  window.open(Url.discord, '_blank')
  logEvent('opened_discord')
  Server.accessDiscord()
}

export function openSteamStore() {
  window.open(Url.steamStore, '_blank')
  logEvent('opened_steam_store')
}

export function openNextFest() {
  window.open(Url.nextfest, '_blank')
  logEvent('opened_nextfest')
}

export function openPrivacyPolicy() {
  window.open(Url.privacyPolicy, '_blank')
  logEvent('opened_privacy_policy')
}

export function openFeedbackForm() {
  window.open(Url.feedback, '_blank')
  logEvent('opened_feedback_form')
}
