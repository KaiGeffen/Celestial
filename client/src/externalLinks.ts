import logEvent from './analytics'
import { Url } from './settings/url'

export function openDiscord() {
  window.open(Url.discord, '_blank')
  logEvent('opened_discord')
}

export function openPrivacyPolicy() {
  window.open(Url.privacyPolicy, '_blank')
  logEvent('opened_privacy_policy')
}

export function openFeedbackForm() {
  window.open(Url.feedback, '_blank')
  logEvent('opened_feedback_form')
}
