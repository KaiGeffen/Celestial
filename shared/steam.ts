import steam from './steam.json'

/** Numeric Steamworks App ID (demo build). Canonical value: `./steam.json`. */
export const STEAM_APP_ID: number = steam.steamAppId

/** Same id as string (e.g. Web API query params). */
export const STEAM_APP_ID_STRING = String(STEAM_APP_ID)

/** Store listing; slug must match the Steam partner store page. */
export const STEAM_STORE_URL = `https://store.steampowered.com/app/${STEAM_APP_ID}/Celestial_Decks/`
