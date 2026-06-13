import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Server-issued session tokens. After a provider login (Google/Steam) is
 * verified once, we hand the client one of these so it can reconnect for the
 * lifetime below WITHOUT re-verifying a fresh provider token. This decouples
 * our sessions from Google ID tokens, which expire after ~1 hour.
 *
 * These are standard HS256 JWTs, signed/verified here with Node's built-in
 * crypto (no external dependency). The client only base64-decodes the payload
 * to read the uuid; it never verifies the signature.
 *
 * SECURITY: the signing secret must come from the environment and never be
 * hardcoded — anyone who knows it can forge a session for any account. If it is
 * unset we simply do not issue session tokens and fall back to provider login.
 */
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days

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

const b64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64url')

const JWT_HEADER = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))

const signHs256 = (signingInput: string, secret: string): string =>
  b64url(createHmac('sha256', secret).update(signingInput).digest())

/** Mint a signed session token, or null if no secret is configured. */
export function issueSessionToken(claims: SessionClaims): string | null {
  const secret = getSecret()
  if (!secret) return null

  const now = Math.floor(Date.now() / 1000)
  const payload = b64url(
    JSON.stringify({
      uuid: claims.uuid,
      provider: claims.provider,
      email: claims.email ?? null,
      iat: now,
      exp: now + SESSION_TTL_SECONDS,
    }),
  )
  const signingInput = `${JWT_HEADER}.${payload}`
  return `${signingInput}.${signHs256(signingInput, secret)}`
}

/** Verify a session token's signature and expiry. Returns claims or null. */
export function verifySessionToken(token: string): SessionClaims | null {
  const secret = getSecret()
  const t = token?.trim()
  if (!secret || !t) return null

  const parts = t.split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts

  // Constant-time signature check
  const expected = signHs256(`${header}.${payload}`, secret)
  const sigBuf = Buffer.from(signature)
  const expBuf = Buffer.from(expected)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const { uuid, provider, email, exp } = decoded

    // Expiry
    if (typeof exp !== 'number' || Math.floor(Date.now() / 1000) >= exp) {
      return null
    }
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
