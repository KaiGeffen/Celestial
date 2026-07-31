import { STEAM_STORE_URL } from '@shared/steam'
import { URL as LOCAL_HOST } from '@shared/network/settings'
import { Flags } from './flags'

// Non-local deploy target: staging.celestialdecks.gg for `build:staging`,
// celestialdecks.gg otherwise
const apiHost = Flags.staging
  ? 'staging.celestialdecks.gg'
  : 'celestialdecks.gg'

// A URL for one of the server's services: hits its port directly in local
// dev (no reverse proxy running), or the deployed domain's path-routed
// endpoint otherwise (reverse proxy in front of staging/prod)
function serviceUrl(
  localPort: number,
  path: string,
  { ws = false }: { ws?: boolean } = {},
): string {
  return Flags.local
    ? `${ws ? 'ws' : 'http'}://${LOCAL_HOST}:${localPort}${path}`
    : `${ws ? 'wss' : 'https'}://${apiHost}${path}`
}

// Settings relating to various urls
export const Url = {
  // discord: 'https://discord.gg/UXWswspB8S',
  // Links to the introductions channel
  discord: 'https://discord.gg/HGhgTXEpKt',
  steamStore: STEAM_STORE_URL,
  apiHost,
  serviceUrl,
  nextfest: 'https://store.steampowered.com/sale/nextfest',
  feedback: 'https://forms.gle/xq9Dnx5mtbSkX6Zs9',
  oauth:
    '574352055172-n1nqdc2nvu3172levk2kl5jf7pbkp4ig.apps.googleusercontent.com',
  gsi_token: 'gsi_token_v2',
  session_token: 'session_token_v1',
  privacyPolicy: 'https://celestialdecks.gg/privacy/',
  tournament:
    'https://fateleague.com/tournaments/summer-season-celestial-decks-august',
}
