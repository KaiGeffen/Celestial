import { CosmeticSet } from '@shared/types/cosmeticSet'
import { Achievement } from '@shared/types/achievement'
import messagesToClient from '@shared/network/messagesToClient'

/** The signed-in player's account data, as the client knows it. */
export interface UserData {
  uuid: string
  username: string
  elo: number
  pveWins: number
  garden: Date[]
  gems: number
  coins: number
  ownedItems: number[]
  missionGoldClaimed: boolean[]
  cosmeticSet: CosmeticSet
  achievements: Achievement[]
  canBeSpectated: boolean
}

type Listener = (data: UserData | null) => void

/**
 * Single reactive holder of the signed-in player's account data.
 *
 * Authority is encoded in the API. Server-authoritative fields (currency, elo,
 * achievements, mission claims, garden, …) can ONLY change via
 * `applyServerData` from a server snapshot — there is intentionally no client
 * setter for them, so the client can never optimistically guess them. Genuinely
 * client-owned fields expose narrow setters that update locally and emit; the
 * caller (the networking layer) is responsible for syncing them to the server.
 */
class UserDataStore {
  private data: UserData | null = null
  private listeners = new Set<Listener>()

  get(): Readonly<UserData> | null {
    return this.data
  }

  isLoaded(): boolean {
    return this.data !== null
  }

  /** Subscribe to changes; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Replace all state from an authoritative server snapshot. */
  applyServerData(data: messagesToClient['sendUserData'], uuid: string): void {
    this.data = {
      uuid,
      username: data.username,
      elo: data.elo,
      pveWins: data.pveWins,
      garden: data.garden.map((d) => new Date(d)),
      gems: data.gems,
      coins: data.coins,
      ownedItems: data.ownedItems,
      missionGoldClaimed: data.missionGoldClaimed,
      cosmeticSet: data.cosmeticSet,
      achievements: data.achievements,
      canBeSpectated: data.canBeSpectated,
    }
    this.emit()
  }

  // --- Client-owned mutations (the caller syncs these to the server) ---

  setCosmeticSet(cosmeticSet: CosmeticSet): void {
    if (!this.data) return
    this.data = { ...this.data, cosmeticSet }
    this.emit()
  }

  setSpectatable(canBeSpectated: boolean): void {
    if (!this.data) return
    this.data = { ...this.data, canBeSpectated }
    this.emit()
  }

  /**
   * Mark all achievements seen locally. Deliberate exception to the
   * server-authoritative rule: `seen` is monotonic, client-initiated view state,
   * so a local update can't diverge from the server, and it avoids re-showing
   * the unseen prompt in the window before the server snapshot returns.
   */
  markAchievementsSeen(): void {
    if (!this.data) return
    this.data = {
      ...this.data,
      achievements: this.data.achievements.map((a) => ({ ...a, seen: true })),
    }
    this.emit()
  }

  clear(): void {
    this.data = null
    this.emit()
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener(this.data))
  }
}

export const userDataStore = new UserDataStore()
