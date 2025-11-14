import logEvent from './analytics'
import { Url } from '../settings/url'
import Server from '../server'

export function openDiscord() {
  window.open(Url.discord, '_blank')
  logEvent('opened_discord')
  Server.accessDiscord()
}

export function openPrivacyPolicy() {
  window.open(Url.privacyPolicy, '_blank')
  logEvent('opened_privacy_policy')
}

export function openFeedbackForm() {
  window.open(Url.feedback, '_blank')
  logEvent('opened_feedback_form')
}
