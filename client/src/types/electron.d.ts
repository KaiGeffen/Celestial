interface SteamAuthSession {
  steamId: string
  ticket: string
}

interface Window {
  electronAPI?: {
    quit?: () => void
    getSteamAuthSession?: () => Promise<SteamAuthSession | null>
    // Runs the Google OAuth loopback flow, resolving to a Google ID token
    getGoogleAuthToken?: () => Promise<string | null>
  }
}
