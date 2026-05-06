import { STEAM_APP_ID_STRING } from '../../../shared/steam'

/** Steamworks publisher Web API host (see https://partner.steamgames.com/doc/webapi/ISteamUserAuth). */
const STEAM_WEB_API_BASE = 'https://partner.steam-api.com'

/**
 * Verify a Steam session ticket via ISteamUserAuth/AuthenticateUserTicket.
 * Expects a Steamworks publisher Web API key (not the legacy steamcommunity.com/dev/apikey-only flow).
 */
export async function verifySteamTicket(ticket: string): Promise<string | null> {
  const steamKey = process.env.STEAM_WEB_API_KEY?.trim()
  const ticketTrimmed = ticket?.trim()
  if (!steamKey || !ticketTrimmed) {
    if (!steamKey) {
      console.warn(
        '[Steam auth] STEAM_WEB_API_KEY is not set; cannot verify tickets.',
      )
    }
    return null
  }

  const params = new URLSearchParams({
    key: steamKey,
    appid: STEAM_APP_ID_STRING,
    ticket: ticketTrimmed,
  })

  const endpoint = `${STEAM_WEB_API_BASE}/ISteamUserAuth/AuthenticateUserTicket/v1/?${params}`

  let response: Response
  try {
    response = await fetch(endpoint)
  } catch (e) {
    console.warn(
      '[Steam auth] Request failed:',
      e instanceof Error ? e.message : String(e),
    )
    return null
  }

  const text = await response.text()

  if (!response.ok) {
    console.warn(
      '[Steam auth] HTTP',
      response.status,
      text.slice(0, 240),
    )
    return null
  }

  let parsed: {
    response?: {
      params?: { result?: string; steamid?: string | number }
      error?: { errorcode?: number; errordesc?: string }
    }
  }
  try {
    parsed = JSON.parse(text) as typeof parsed
  } catch {
    console.warn('[Steam auth] Non-JSON response:', text.slice(0, 240))
    return null
  }

  const apiErr = parsed.response?.error
  if (apiErr) {
    console.warn(
      '[Steam auth] Steam API error:',
      apiErr.errordesc ?? `errorcode=${apiErr.errorcode}`,
    )
    return null
  }

  const p = parsed.response?.params
  const result = p?.result
  const steamIdRaw = p?.steamid

  if (result === 'OK' && steamIdRaw != null && `${steamIdRaw}` !== '') {
    return String(steamIdRaw)
  }

  if (result && result !== 'OK') {
    console.warn('[Steam auth] Ticket rejected:', result)
    return null
  }

  console.warn('[Steam auth] Unexpected body:', text.slice(0, 320))
  return null
}
