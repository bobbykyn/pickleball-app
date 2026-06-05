// Pickle Kitchen "chef brigade" rank system, based on cumulative court time.
// Ranks climb the real kitchen hierarchy: dishwasher → master chef.

export interface Tier {
  name: string
  sub: string        // brigade title / flavour text
  emoji: string
  minHours: number   // hours required to reach this tier
  color: string      // accent colour (hex)
}

// Ordered ascending by minHours.
export const TIERS: Tier[] = [
  { name: 'Dishwasher',     sub: 'Plongeur · everyone starts here', emoji: '🧽', minHours: 0,   color: '#94A3B8' },
  { name: 'Prep Cook',      sub: 'Commis · learning the ropes',     emoji: '🔪', minHours: 5,   color: '#64748B' },
  { name: 'Line Cook',      sub: 'Cuisinier · holds a station',     emoji: '🍳', minHours: 15,  color: '#3F8E7C' },
  { name: 'Chef de Partie', sub: 'Station boss',                    emoji: '🧑‍🍳', minHours: 30,  color: '#2A6A5A' },
  { name: 'Sous Chef',      sub: 'Second-in-command',               emoji: '🥘', minHours: 55,  color: '#C0392B' },
  { name: 'Head Chef',      sub: 'Chef de Cuisine · runs the pass', emoji: '👨‍🍳', minHours: 90,  color: '#A52F22' },
  { name: 'Executive Chef', sub: 'Le patron',                       emoji: '⭐', minHours: 140, color: '#F2A900' },
  { name: 'Master Chef',    sub: 'Grand Chef · the legend',         emoji: '🏆', minHours: 200, color: '#D4A017' },
]

export interface TierProgress {
  tier: Tier
  index: number
  next: Tier | null
  hoursToNext: number
  /** 0..1 progress from current tier toward the next */
  progress: number
}

export function getTier(hours: number): TierProgress {
  let index = 0
  for (let i = 0; i < TIERS.length; i++) {
    if (hours >= TIERS[i].minHours) index = i
  }
  const tier = TIERS[index]
  const next = index < TIERS.length - 1 ? TIERS[index + 1] : null
  const hoursToNext = next ? Math.max(0, next.minHours - hours) : 0
  const progress = next
    ? Math.min(1, Math.max(0, (hours - tier.minHours) / (next.minHours - tier.minHours)))
    : 1
  return { tier, index, next, hoursToNext, progress }
}
