import { STEAM_STORE_URL } from '@shared/steam'
import { Flags } from './flags'

// Settings relating to various urls
export const Url = {
  // discord: 'https://discord.gg/UXWswspB8S',
  // Links to the introductions channel
  discord: 'https://discord.gg/HGhgTXEpKt',
  steamStore: STEAM_STORE_URL,
  // Non-local deploy target: staging.celestialdecks.gg for `build:staging`,
  // celestialdecks.gg otherwise
  apiHost: Flags.staging ? 'staging.celestialdecks.gg' : 'celestialdecks.gg',
  nextfest: 'https://store.steampowered.com/sale/nextfest',
  feedback: 'https://forms.gle/xq9Dnx5mtbSkX6Zs9',
  oauth:
    '574352055172-n1nqdc2nvu3172levk2kl5jf7pbkp4ig.apps.googleusercontent.com',
  gsi_token: 'gsi_token_v2',
  session_token: 'session_token_v1',
  privacyPolicy: 'https://celestialdecks.gg/privacy/',
  tournament:
    'https://fateleague.com/tournaments/summer-season-celestial-decks-july',
}
