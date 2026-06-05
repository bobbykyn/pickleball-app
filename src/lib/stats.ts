import { format } from 'date-fns'

// Shape of a row from the stats query in StatsModal / AllStatsModal.
export interface RawSession {
  id: string
  date_time: string
  duration_hours?: number | null
  location?: string | null
  created_by?: string
  rsvps?: Array<{
    user_id: string
    status: string
    guest_count?: number | null
    profiles?: { name?: string; avatar_url?: string | null; google_avatar_url?: string | null } | null
  }>
}

export interface BoardEntry {
  id: string
  name: string
  profile: any
  hours: number
  games: number
  bestMonth: number
}

/** Rank every player by total court time (then games as tiebreak). */
export function computeLeaderboard(raw: RawSession[]): BoardEntry[] {
  const map = new Map<string, any>()
  for (const s of raw) {
    const dur = Number(s.duration_hours) || 0
    const month = format(new Date(s.date_time), 'MMM yyyy')
    for (const r of s.rsvps || []) {
      if (r.status !== 'yes' || !r.user_id) continue
      let e = map.get(r.user_id)
      if (!e) {
        e = { id: r.user_id, profile: r.profiles, games: 0, hours: 0, months: new Map<string, number>() }
        map.set(r.user_id, e)
      }
      if (!e.profile && r.profiles) e.profile = r.profiles
      e.games++
      e.hours += dur
      e.months.set(month, (e.months.get(month) || 0) + 1)
    }
  }
  return [...map.values()]
    .map((e) => {
      let best = 0
      e.months.forEach((c: number) => { if (c > best) best = c })
      return { id: e.id, name: e.profile?.name || 'Player', profile: e.profile, hours: e.hours, games: e.games, bestMonth: best }
    })
    .sort((a, b) => b.hours - a.hours || b.games - a.games)
}

export interface CommunityStats {
  totalSessions: number
  totalPlayers: number
  totalVenues: number
  playerHours: number      // sum of court time across all participations
  totalGuests: number
  busiestMonth: string
  favoriteVenue: string
  biggestSession: { count: number; month: string }
}

/** Community-wide aggregates across all past sessions. */
export function computeCommunityStats(raw: RawSession[]): CommunityStats {
  const players = new Set<string>()
  const venues = new Set<string>()
  const months = new Map<string, number>()
  const venueCounts = new Map<string, number>()
  let totalSessions = 0
  let playerHours = 0
  let totalGuests = 0
  let biggestSession = { count: 0, month: '—' }

  for (const s of raw) {
    const dur = Number(s.duration_hours) || 0
    const yes = (s.rsvps || []).filter((r) => r.status === 'yes')
    if (yes.length > 0) {
      totalSessions++
      const k = format(new Date(s.date_time), 'MMM yyyy')
      months.set(k, (months.get(k) || 0) + 1)
      if (s.location) {
        venues.add(s.location)
        venueCounts.set(s.location, (venueCounts.get(s.location) || 0) + 1)
      }
      // Total attendance = players + their guests
      const attendance = yes.reduce((sum, r) => sum + 1 + (r.guest_count || 0), 0)
      if (attendance > biggestSession.count) {
        biggestSession = { count: attendance, month: k }
      }
    }
    for (const r of yes) {
      players.add(r.user_id)
      playerHours += dur
      totalGuests += r.guest_count || 0
    }
  }

  let busiestMonth = '—', bmCount = 0
  months.forEach((c, k) => { if (c > bmCount) { bmCount = c; busiestMonth = k } })

  let favoriteVenue = '—', fvCount = 0
  venueCounts.forEach((c, k) => { if (c > fvCount) { fvCount = c; favoriteVenue = k } })

  return {
    totalSessions,
    totalPlayers: players.size,
    totalVenues: venues.size,
    playerHours,
    totalGuests,
    busiestMonth,
    favoriteVenue,
    biggestSession,
  }
}
