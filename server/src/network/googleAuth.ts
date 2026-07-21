import { OAuth2Client } from 'google-auth-library'

/**
 * Google OAuth client ID this server accepts tokens for. Must match the
 * `client_id` the browser uses with Google Identity Services. Configurable via
 * env; falls back to the (public) production client ID. Read lazily so a value
 * from dotenv (loaded when db/db.ts is imported) is not missed.
 */
function getClientIds(): string[] {
  const web =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    '574352055172-n1nqdc2nvu3172levk2kl5jf7pbkp4ig.apps.googleusercontent.com'
  // The Electron desktop OAuth client has its own id; tokens minted for it carry
  // that audience. Verify accepts an array, so both the web (GIS) and desktop
  // clients are trusted.
  const desktop = process.env.GOOGLE_DESKTOP_CLIENT_ID?.trim()
  return desktop ? [web, desktop] : [web]
}

const client = new OAuth2Client()

export interface GoogleIdentity {
  /** Google's stable subject identifier for the account. */
  sub: string
  /** Verified email, or null if Google did not mark it verified. */
  email: string | null
}

/**
 * Verify a Google Identity Services ID token (the `credential` string handed to
 * the browser callback). Returns the verified identity, or null if the token is
 * missing, expired, malformed, or not issued for this app.
 *
 * NOTE: `verifyIdToken` checks the signature against Google's published keys and
 * validates the audience, issuer, and expiry. Never trust client-supplied
 * identity fields without going through this.
 */
export async function verifyGoogleCredential(
  credential: string,
): Promise<GoogleIdentity | null> {
  const token = credential?.trim()
  if (!token) return null

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: getClientIds(),
    })
    const payload = ticket.getPayload()
    if (!payload?.sub) return null

    return {
      sub: payload.sub,
      email: payload.email && payload.email_verified ? payload.email : null,
    }
  } catch (e) {
    console.warn(
      '[Google auth] Verification failed:',
      e instanceof Error ? e.message : String(e),
    )
    return null
  }
}
