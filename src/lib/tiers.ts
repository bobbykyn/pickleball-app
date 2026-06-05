// Pickle Kitchen "chef brigade" rank system, based on cumulative court time.
// Ranks climb the kitchen hierarchy: 洗碗 (dishwasher) → 米芝蓮之星 (Michelin star).

export interface Tier {
  name: string       // English rank name
  zh: string         // Chinese rank name
  sub: string        // flavour text
  emoji: string
  minHours: number   // hours required to reach this tier
  color: string      // accent colour (hex)
}

// Ordered ascending by minHours.
export const TIERS: Tier[] = [
  { name: 'Dishwasher',     zh: '洗碗',       sub: 'Everyone starts at the sink',  emoji: '🧽', minHours: 0,   color: '#94A3B8' },
  { name: 'Kitchen Hand',   zh: '打雜',       sub: 'Odd jobs around the kitchen',  emoji: '🧹', minHours: 15,  color: '#64748B' },
  { name: 'Junior Chef',    zh: '見習廚師',   sub: 'Learning the craft',           emoji: '🔪', minHours: 50,  color: '#3F8E7C' },
  { name: 'Sous Chef',      zh: '副廚',       sub: 'Second-in-command',            emoji: '🥘', minHours: 100, color: '#2A6A5A' },
  { name: 'Head Chef',      zh: '主廚',       sub: 'Runs the pass',                emoji: '👨‍🍳', minHours: 200, color: '#C0392B' },
  { name: 'Executive Chef', zh: '行政總廚',   sub: 'Le patron',                    emoji: '⭐', minHours: 300, color: '#F2A900' },
  { name: 'Michelin Star',  zh: '米芝蓮之星', sub: 'A legend of the kitchen',      emoji: '🌟', minHours: 500, color: '#D4A017' },
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
