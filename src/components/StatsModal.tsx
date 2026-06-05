'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Trophy, Clock, CalendarDays, MapPin, Flame, Activity, Zap, Crown } from 'lucide-react'
import { format } from 'date-fns'
import UserAvatar from './UserAvatar'

interface MiniProfile {
  name?: string
  avatar_url?: string | null
  google_avatar_url?: string | null
}

interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  darkMode: boolean
  user: any
  /** When set, show this user's stats instead of the signed-in user's. */
  viewUserId?: string
  viewUserProfile?: MiniProfile
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StatsModal({ isOpen, onClose, darkMode, user, viewUserId, viewUserProfile }: StatsModalProps) {
  const [raw, setRaw] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const targetId: string | undefined = viewUserId || user?.id
  const isSelf = !viewUserId || viewUserId === user?.id

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('sessions')
        .select('id, date_time, duration_hours, location, created_by, rsvps(user_id, status, guest_count, profiles(name, avatar_url, google_avatar_url))')
        .lt('date_time', now)
        .order('date_time', { ascending: false })
      if (error) throw error
      setRaw(data || [])
    } catch (e) {
      console.error('Error loading stats:', e)
    } finally {
      setLoading(false)
    }
  }

  // ---- Personal stats for the target user ----
  const stats = useMemo(() => {
    const attended = raw
      .filter((s) => (s.rsvps || []).some((r: any) => r.user_id === targetId && r.status === 'yes'))
      .map((s) => {
        const mine = (s.rsvps || []).find((r: any) => r.user_id === targetId)
        return {
          date: new Date(s.date_time),
          duration: Number(s.duration_hours) || 0,
          location: s.location || 'Unknown',
          guests: mine?.guest_count || 0,
        }
      })

    const gamesPlayed = attended.length
    const totalHours = attended.reduce((s, a) => s + a.duration, 0)
    const longest = attended.reduce((m, a) => Math.max(m, a.duration), 0)
    const totalGuests = attended.reduce((s, a) => s + a.guests, 0)

    const monthMap = new Map<string, number>()
    attended.forEach((a) => {
      const k = format(a.date, 'MMM yyyy')
      monthMap.set(k, (monthMap.get(k) || 0) + 1)
    })
    let mostPlayedMonth = '—', mpmCount = 0
    monthMap.forEach((c, k) => { if (c > mpmCount) { mpmCount = c; mostPlayedMonth = k } })

    const locMap = new Map<string, number>()
    attended.forEach((a) => locMap.set(a.location, (locMap.get(a.location) || 0) + 1))
    let favoriteCourt = '—', fcCount = 0
    locMap.forEach((c, k) => { if (c > fcCount) { fcCount = c; favoriteCourt = k } })

    const dowCounts = new Array(7).fill(0)
    attended.forEach((a) => { dowCounts[a.date.getDay()]++ })
    const fdIdx = dowCounts.reduce((b, c, i) => (c > dowCounts[b] ? i : b), 0)
    const favoriteDay = gamesPlayed > 0
      ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][fdIdx] : '—'

    const monthSeries: { label: string; count: number }[] = []
    const base = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      monthSeries.push({ label: format(d, 'MMM'), count: monthMap.get(format(d, 'MMM yyyy')) || 0 })
    }

    return { gamesPlayed, totalHours, longest, totalGuests, mostPlayedMonth, favoriteCourt, favoriteDay, dowCounts, monthSeries }
  }, [raw, targetId])

  // ---- Leaderboard across all users ----
  const { board, targetRank } = useMemo(() => {
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
    const arr = [...map.values()].map((e) => {
      let best = 0
      e.months.forEach((c: number) => { if (c > best) best = c })
      return { ...e, bestMonth: best, name: e.profile?.name || 'Player' }
    }).sort((a, b) => b.hours - a.hours || b.games - a.games)
    const rank = arr.findIndex((e) => e.id === targetId)
    return { board: arr, targetRank: rank }
  }, [raw, targetId])

  if (!isOpen) return null

  const cardBg = darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'
  const headerName = isSelf ? 'My Stats' : (viewUserProfile?.name || board.find((b) => b.id === targetId)?.name || 'Player')
  const headerProfile: MiniProfile | undefined = isSelf ? undefined : (viewUserProfile || board.find((b) => b.id === targetId)?.profile)

  const StatTile = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
    <div className={`p-4 rounded-lg ${cardBg}`}>
      <div className="flex items-center gap-2 mb-1 text-brand-primary">{icon}<span className={`text-[11px] uppercase tracking-wider font-semibold ${subText}`}>{label}</span></div>
      <p className="font-display text-2xl font-bold text-brand-primary leading-tight">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subText}`}>{sub}</p>}
    </div>
  )

  const maxMonth = Math.max(1, ...stats.monthSeries.map((m) => m.count))
  const maxDow = Math.max(1, ...stats.dowCounts)
  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)
  const topBoard = board.slice(0, 12)
  const targetInTop = targetRank >= 0 && targetRank < 12

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-1">
          <div className="flex items-center gap-3 min-w-0">
            {headerProfile && <UserAvatar profile={{ name: headerName, ...headerProfile }} size="md" />}
            <h2 className="text-xl font-display font-bold tracking-wider text-brand-primary uppercase truncate">
              {headerName}{isSelf ? ' | 戰績' : ' | Player Card'}
            </h2>
          </div>
          <button onClick={onClose} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-xs mb-6 ${subText}`}>GEAR UP. PLAY WELL. LIVE MORE.</p>

        {loading ? (
          <p className={subText}>Crunching the numbers…</p>
        ) : (
          <div className="space-y-6">
            {stats.gamesPlayed === 0 ? (
              <div className={`text-center py-10 rounded-lg ${cardBg}`}>
                <Trophy className={`w-10 h-10 mx-auto mb-3 ${subText}`} />
                <p className={`font-medium ${subText}`}>
                  {isSelf ? 'No games played yet — join a match to start building your stats!' : `${headerName} hasn't played any games yet.`}
                </p>
              </div>
            ) : (
              <>
                {/* Rank badge */}
                {targetRank >= 0 && (
                  <div className={`flex items-center gap-3 p-4 rounded-lg ${cardBg}`}>
                    <Crown className="w-6 h-6 text-brand-gold" />
                    <div>
                      <p className="font-display text-lg font-bold text-brand-primary leading-tight">
                        {targetRank === 0 ? '👑 Top Chef of the Kitchen' : `Ranked #${targetRank + 1}`}
                      </p>
                      <p className={`text-xs ${subText}`}>out of {board.length} players, by court time</p>
                    </div>
                  </div>
                )}

                {/* Headline tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatTile icon={<Trophy className="w-4 h-4" />} label="Games" value={String(stats.gamesPlayed)} sub="matches played" />
                  <StatTile icon={<Clock className="w-4 h-4" />} label="Court time" value={`${stats.totalHours}h`} sub="total on court" />
                  <StatTile icon={<Activity className="w-4 h-4" />} label="Longest" value={`${stats.longest}h`} sub="single session" />
                  <StatTile icon={<CalendarDays className="w-4 h-4" />} label="Top month" value={stats.mostPlayedMonth} sub="most active" />
                </div>

                {/* Games per month */}
                <div className={`p-4 rounded-lg ${cardBg}`}>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-4 text-brand-secondary">Games — last 6 months</h3>
                  <div className="flex items-end justify-between gap-2 h-32">
                    {stats.monthSeries.map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className={`text-xs font-semibold mb-1 ${subText}`}>{m.count || ''}</span>
                        <div className="w-full rounded-t bg-brand-primary transition-all"
                          style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count ? '6px' : '2px', opacity: m.count ? 1 : 0.2 }} />
                        <span className={`text-[10px] mt-1 ${subText}`}>{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day of week */}
                <div className={`p-4 rounded-lg ${cardBg}`}>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-4 text-brand-secondary">Favourite playing days</h3>
                  <div className="space-y-2">
                    {DOW.map((d, i) => (
                      <div key={d} className="flex items-center gap-3">
                        <span className={`text-xs w-8 ${subText}`}>{d}</span>
                        <div className="flex-1 h-3 rounded-full bg-black/10 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-secondary"
                            style={{ width: `${(stats.dowCounts[i] / maxDow) * 100}%`, opacity: stats.dowCounts[i] ? 1 : 0 }} />
                        </div>
                        <span className={`text-xs w-5 text-right ${subText}`}>{stats.dowCounts[i] || ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fun facts */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatTile icon={<MapPin className="w-4 h-4" />} label="Home court" value={stats.favoriteCourt} sub="most played" />
                  <StatTile icon={<CalendarDays className="w-4 h-4" />} label="Go-to day" value={stats.favoriteDay} sub="shows up" />
                  <StatTile icon={<Trophy className="w-4 h-4" />} label="Guests brought" value={String(stats.totalGuests)} sub="+1s over time" />
                </div>

                {/* Meaningless fun */}
                <div className={`p-4 rounded-lg border border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-3 text-brand-gold flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Totally official statistics
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="font-display text-2xl font-bold text-brand-primary">{(stats.totalHours * 350).toLocaleString()}</p>
                      <p className={`text-xs ${subText}`}>calories torched 🔥</p>
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-brand-primary">{(stats.gamesPlayed * 312).toLocaleString()}</p>
                      <p className={`text-xs ${subText}`}>dinks dunk&apos;d 🥒</p>
                    </div>
                    <div>
                      <p className="font-display text-2xl font-bold text-brand-primary">{Math.max(1, Math.round(stats.totalHours / 2))}</p>
                      <p className={`text-xs ${subText}`}>movies&apos; worth of play 🎬</p>
                    </div>
                  </div>
                  <p className={`text-[10px] text-center mt-3 ${subText}`}>
                    <Flame className="w-3 h-3 inline mr-1" />Numbers are for bragging rights only.
                  </p>
                </div>
              </>
            )}

            {/* Kitchen Leaderboard — always shown */}
            {board.length > 0 && (
              <div className={`p-4 rounded-lg ${cardBg}`}>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-1 text-brand-primary">Kitchen Leaderboard | 排行榜</h3>
                <p className={`text-[11px] mb-4 ${subText}`}>Ranked by total court time</p>
                <div className="space-y-1.5">
                  {topBoard.map((e, i) => {
                    const isTarget = e.id === targetId
                    return (
                      <div key={e.id}
                        className={`flex items-center gap-3 px-2.5 py-2 rounded-lg ${isTarget ? 'bg-brand-primary/15 ring-1 ring-brand-primary/40' : ''}`}>
                        <span className={`w-7 text-center text-sm font-display font-bold ${i < 3 ? '' : subText}`}>{medal(i)}</span>
                        <UserAvatar profile={{ name: e.name, ...(e.profile || {}) }} size="sm" />
                        <span className={`flex-1 text-sm font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                          {e.name}{isTarget ? ' (you)' : ''}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-display font-bold text-brand-primary leading-none">{e.hours}h</p>
                          <p className={`text-[10px] ${subText}`}>{e.games} game{e.games === 1 ? '' : 's'}</p>
                        </div>
                      </div>
                    )
                  })}
                  {!targetInTop && targetRank >= 0 && (
                    <>
                      <p className={`text-center text-xs ${subText}`}>· · ·</p>
                      {(() => {
                        const e = board[targetRank]
                        return (
                          <div className="flex items-center gap-3 px-2.5 py-2 rounded-lg bg-brand-primary/15 ring-1 ring-brand-primary/40">
                            <span className="w-7 text-center text-sm font-display font-bold">{targetRank + 1}</span>
                            <UserAvatar profile={{ name: e.name, ...(e.profile || {}) }} size="sm" />
                            <span className={`flex-1 text-sm font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{e.name} (you)</span>
                            <div className="text-right">
                              <p className="text-sm font-display font-bold text-brand-primary leading-none">{e.hours}h</p>
                              <p className={`text-[10px] ${subText}`}>{e.games} game{e.games === 1 ? '' : 's'}</p>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
