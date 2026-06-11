import jwt from 'jsonwebtoken'

/**
 * Server-issued session tokens. After a provider login (Google/Steam) is
 * verified once, we hand the client one of these so it can reconnect for the
 * lifetime below WITHOUT re-verifying a fresh provider token. This decouples
 * our sessions from Google ID tokens, which expire after ~1 hour.
 *
 * SECURITY: the signing secret must come from the environment and never be
 * hardcoded — anyone who knows it can forge a session for any account. If it is
 * unset we simply do not issue session tokens and fall back to provider login.
 */
const SESSION_TTL = '30d'

let warnedMissingSecret = false
// Read lazily (not at module load): dotenv.config() runs when db/db.ts is
// imported, which can happen after this module is first evaluated.
function getSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim()
  if (!secret) {
    if (!warnedMissingSecret) {
      console.warn(
        '[Session] SESSION_SECRET is not set; session tokens disabled. ' +
          'Clients will fall back to re-verifying provider tokens on reconnect.',
      )
      warnedMissingSecret = true
    }
    return null
  }
  return secret
}

export interface SessionClaims {
  /** The account id this session authenticates. */
  uuid: string
  /** Which verified provider minted the original login. */
  provider: 'google' | 'steam'
  /** Verified email, carried so a re-created account keeps its provider mark. */
  email?: string | null
}

/** Mint a signed session token, or null if no secret is configured. */
export function issueSessionToken(claims: SessionClaims): string | null {
  const secret = getSecret()
  if (!secret) return null
  return jwt.sign(
    { uuid: claims.uuid, provider: claims.provider, email: claims.email ?? null },
    secret,
    { expiresIn: SESSION_TTL },
  )
}

/** Verify a session token's signature and expiry. Returns claims or null. */
export function verifySessionToken(token: string): SessionClaims | null {
  const secret = getSecret()
  const t = token?.trim()
  if (!secret || !t) return null

  try {
    const decoded = jwt.verify(t, secret) as jwt.JwtPayload
    const { uuid, provider, email } = decoded
    if (typeof uuid !== 'string') return null
    if (provider !== 'google' && provider !== 'steam') return null
    return {
      uuid,
      provider,
      email: typeof email === 'string' ? email : null,
    }
  } catch (e) {
    console.warn(
      '[Session] Token verification failed:',
      e instanceof Error ? e.message : String(e),
    )
    return null
  }
}
