interface SteamAuthSession {
  steamId: string
  ticket: string
}

interface Window {
  electronAPI?: {
    quit?: () => void
    getSteamAuthSession?: () => Promise<SteamAuthSession | null>
  }
}
