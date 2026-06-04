'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Trophy, Clock, CalendarDays, MapPin, Flame, Activity, Zap } from 'lucide-react'
import { format } from 'date-fns'

interface StatsModalProps {
  isOpen: boolean
  onClose: () => void
  darkMode: boolean
  user: any
}

interface AttendedSession {
  date: Date
  duration: number
  location: string
  guests: number
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function StatsModal({ isOpen, onClose, darkMode, user }: StatsModalProps) {
  const [attended, setAttended] = useState<AttendedSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      loadStats()
    }
  }, [isOpen])

  const loadStats = async () => {
    try {
      if (!user) return
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('sessions')
        .select('id, title, date_time, location, duration_hours, rsvps(user_id, status, guest_count)')
        .lt('date_time', now)
        .order('date_time', { ascending: false })

      if (error) throw error

      const mine: AttendedSession[] = (data || [])
        .filter((s: any) => (s.rsvps || []).some((r: any) => r.user_id === user.id && r.status === 'yes'))
        .map((s: any) => {
          const myRsvp = (s.rsvps || []).find((r: any) => r.user_id === user.id)
          return {
            date: new Date(s.date_time),
            duration: Number(s.duration_hours) || 0,
            location: s.location || 'Unknown',
            guests: myRsvp?.guest_count || 0,
          }
        })

      setAttended(mine)
    } catch (e) {
      console.error('Error loading stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    const gamesPlayed = attended.length
    const totalHours = attended.reduce((sum, a) => sum + a.duration, 0)
    const longest = attended.reduce((max, a) => Math.max(max, a.duration), 0)
    const totalGuests = attended.reduce((sum, a) => sum + a.guests, 0)

    // Month counts
    const monthMap = new Map<string, number>()
    attended.forEach(a => {
      const key = format(a.date, 'MMM yyyy')
      monthMap.set(key, (monthMap.get(key) || 0) + 1)
    })
    let mostPlayedMonth = '—'
    let mostPlayedMonthCount = 0
    monthMap.forEach((count, key) => {
      if (count > mostPlayedMonthCount) {
        mostPlayedMonthCount = count
        mostPlayedMonth = key
      }
    })

    // Location counts
    const locMap = new Map<string, number>()
    attended.forEach(a => locMap.set(a.location, (locMap.get(a.location) || 0) + 1))
    let favoriteCourt = '—'
    let favoriteCourtCount = 0
    locMap.forEach((count, key) => {
      if (count > favoriteCourtCount) {
        favoriteCourtCount = count
        favoriteCourt = key
      }
    })

    // Day-of-week counts
    const dowCounts = new Array(7).fill(0)
    attended.forEach(a => { dowCounts[a.date.getDay()]++ })
    const favoriteDayIdx = dowCounts.reduce((best, c, i) => (c > dowCounts[best] ? i : best), 0)
    const favoriteDay = gamesPlayed > 0 ? ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][favoriteDayIdx] : '—'

    // Last 6 months chart (chronological)
    const monthSeries: { label: string; count: number }[] = []
    const base = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      const key = format(d, 'MMM yyyy')
      monthSeries.push({ label: format(d, 'MMM'), count: monthMap.get(key) || 0 })
    }

    return {
      gamesPlayed,
      totalHours,
      longest,
      totalGuests,
      mostPlayedMonth,
      favoriteCourt,
      favoriteDay,
      dowCounts,
      monthSeries,
    }
  }, [attended])

  if (!isOpen) return null

  const cardBg = darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'

  const StatTile = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
    <div className={`p-4 rounded-lg ${cardBg}`}>
      <div className="flex items-center gap-2 mb-1 text-brand-primary">{icon}<span className={`text-[11px] uppercase tracking-wider font-semibold ${subText}`}>{label}</span></div>
      <p className="font-display text-2xl font-bold text-brand-primary leading-tight">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subText}`}>{sub}</p>}
    </div>
  )

  const maxMonth = Math.max(1, ...stats.monthSeries.map(m => m.count))
  const maxDow = Math.max(1, ...stats.dowCounts)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-display font-bold tracking-wider text-brand-primary uppercase">My Stats | 戰績</h2>
          <button onClick={onClose} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-xs mb-6 ${subText}`}>GEAR UP. PLAY WELL. LIVE MORE.</p>

        {loading ? (
          <p className={subText}>Crunching the numbers…</p>
        ) : stats.gamesPlayed === 0 ? (
          <div className={`text-center py-12 rounded-lg ${cardBg}`}>
            <Trophy className={`w-10 h-10 mx-auto mb-3 ${subText}`} />
            <p className={`font-medium ${subText}`}>No games played yet — join a match to start building your stats!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Headline tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile icon={<Trophy className="w-4 h-4" />} label="Games" value={String(stats.gamesPlayed)} sub="matches played" />
              <StatTile icon={<Clock className="w-4 h-4" />} label="Court time" value={`${stats.totalHours}h`} sub="total on court" />
              <StatTile icon={<Activity className="w-4 h-4" />} label="Longest" value={`${stats.longest}h`} sub="single session" />
              <StatTile icon={<CalendarDays className="w-4 h-4" />} label="Top month" value={stats.mostPlayedMonth} sub="most active" />
            </div>

            {/* Games per month chart */}
            <div className={`p-4 rounded-lg ${cardBg}`}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-4 text-brand-secondary">Games — last 6 months</h3>
              <div className="flex items-end justify-between gap-2 h-32">
                {stats.monthSeries.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className={`text-xs font-semibold mb-1 ${subText}`}>{m.count || ''}</span>
                    <div
                      className="w-full rounded-t bg-brand-primary transition-all"
                      style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count ? '6px' : '2px', opacity: m.count ? 1 : 0.2 }}
                    />
                    <span className={`text-[10px] mt-1 ${subText}`}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day of week chart */}
            <div className={`p-4 rounded-lg ${cardBg}`}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-4 text-brand-secondary">Favourite playing days</h3>
              <div className="space-y-2">
                {DOW.map((d, i) => (
                  <div key={d} className="flex items-center gap-3">
                    <span className={`text-xs w-8 ${subText}`}>{d}</span>
                    <div className="flex-1 h-3 rounded-full bg-black/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-secondary"
                        style={{ width: `${(stats.dowCounts[i] / maxDow) * 100}%`, opacity: stats.dowCounts[i] ? 1 : 0 }}
                      />
                    </div>
                    <span className={`text-xs w-5 text-right ${subText}`}>{stats.dowCounts[i] || ''}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fun facts */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile icon={<MapPin className="w-4 h-4" />} label="Home court" value={stats.favoriteCourt} sub="most played" />
              <StatTile icon={<CalendarDays className="w-4 h-4" />} label="Go-to day" value={stats.favoriteDay} sub="you show up" />
              <StatTile icon={<Trophy className="w-4 h-4" />} label="Guests brought" value={String(stats.totalGuests)} sub="+1s over time" />
            </div>

            {/* Meaningless-but-fun stats */}
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
                  <p className={`text-xs ${subText}`}>dinks dunk'd 🥒</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-brand-primary">{Math.max(1, Math.round(stats.totalHours / 2))}</p>
                  <p className={`text-xs ${subText}`}>movies' worth of play 🎬</p>
                </div>
              </div>
              <p className={`text-[10px] text-center mt-3 ${subText}`}>
                <Flame className="w-3 h-3 inline mr-1" />Numbers are for bragging rights only.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
