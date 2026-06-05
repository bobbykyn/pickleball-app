'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Users, Clock, MapPin, Trophy, Zap, Flame, CalendarDays } from 'lucide-react'
import UserAvatar from './UserAvatar'
import { computeLeaderboard, computeCommunityStats } from '@/lib/stats'
import { getTier } from '@/lib/tiers'
import ChefRanksInfo from './ChefRanksInfo'

interface AllStatsModalProps {
  isOpen: boolean
  onClose: () => void
  darkMode: boolean
  user: any
}

export default function AllStatsModal({ isOpen, onClose, darkMode, user }: AllStatsModalProps) {
  const [raw, setRaw] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
      console.error('Error loading all stats:', e)
    } finally {
      setLoading(false)
    }
  }

  const board = useMemo(() => computeLeaderboard(raw), [raw])
  const comm = useMemo(() => computeCommunityStats(raw), [raw])
  const myRank = board.findIndex((e) => e.id === user?.id)

  if (!isOpen) return null

  const cardBg = darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'
  const topBoard = board.slice(0, 15)
  const myInTop = myRank >= 0 && myRank < 15

  const Tile = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
    <div className={`p-4 rounded-lg ${cardBg}`}>
      <div className="flex items-center gap-2 mb-1 text-brand-primary">{icon}<span className={`text-[11px] uppercase tracking-wider font-semibold ${subText}`}>{label}</span></div>
      <p className="font-display text-2xl font-bold text-brand-primary leading-tight">{value}</p>
      {sub && <p className={`text-xs mt-0.5 ${subText}`}>{sub}</p>}
    </div>
  )

  const Row = ({ e, place }: { e: any; place: number }) => {
    const isMe = e.id === user?.id
    const t = getTier(e.hours).tier
    return (
      <div className={`flex items-center gap-3 px-2.5 py-2 rounded-lg ${isMe ? 'bg-brand-primary/15 ring-1 ring-brand-primary/40' : ''}`}>
        <span className={`w-6 text-center text-sm font-display font-bold ${place < 3 ? 'text-brand-primary' : subText}`}>{place + 1}</span>
        <UserAvatar profile={{ name: e.name, ...(e.profile || {}) }} size="sm" />
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className={`text-sm font-medium truncate ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{e.name}{isMe ? ' (you)' : ''}</span>
          <span className={`${subText} opacity-50`}>|</span>
          <span className="text-xs font-semibold whitespace-nowrap" style={{ color: t.color }}>{t.name}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-display font-bold text-brand-primary leading-none">{e.hours}h</p>
          <p className={`text-[10px] ${subText}`}>{e.games} game{e.games === 1 ? '' : 's'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-xl font-display font-bold tracking-wider text-brand-primary uppercase">All Stats | 全員戰績</h2>
          <button onClick={onClose} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-xs mb-6 ${subText}`}>Everything the whole kitchen has cooked up together.</p>

        {loading ? (
          <p className={subText}>Crunching the numbers…</p>
        ) : board.length === 0 ? (
          <div className={`text-center py-10 rounded-lg ${cardBg}`}>
            <Trophy className={`w-10 h-10 mx-auto mb-3 ${subText}`} />
            <p className={`font-medium ${subText}`}>No games played across the kitchen yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Community totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile icon={<Users className="w-4 h-4" />} label="Players" value={String(comm.totalPlayers)} sub="in the kitchen" />
              <Tile icon={<Trophy className="w-4 h-4" />} label="Sessions" value={String(comm.totalSessions)} sub="played" />
              <Tile icon={<Clock className="w-4 h-4" />} label="Court time" value={`${comm.playerHours}h`} sub="combined" />
              <Tile icon={<MapPin className="w-4 h-4" />} label="Venues" value={String(comm.totalVenues)} sub="courts used" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Tile icon={<MapPin className="w-4 h-4" />} label="Favourite court" value={comm.favoriteVenue} sub="most booked" />
              <Tile icon={<Users className="w-4 h-4" />} label="Most players" value={`${comm.biggestSession.count}`} sub={`in one session · ${comm.biggestSession.month}`} />
              <Tile icon={<CalendarDays className="w-4 h-4" />} label="Busiest month" value={comm.busiestMonth} sub="most sessions" />
              <Tile icon={<Users className="w-4 h-4" />} label="Guests brought" value={String(comm.totalGuests)} sub="+1s all-time" />
            </div>

            {/* Leaderboard */}
            <div className={`p-4 rounded-lg ${cardBg}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight text-brand-primary leading-none">Who&apos;s Cooking?</h2>
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-brand-secondary mt-1">Kitchen Leaderboard | 排行榜</h3>
                  <p className={`text-[11px] mb-3 ${subText}`}>All players, ranked by total court time</p>
                </div>
                <ChefRanksInfo darkMode={darkMode} currentTierName={myRank >= 0 ? getTier(board[myRank].hours).tier.name : undefined} />
              </div>
              <div className="space-y-1.5">
                {topBoard.map((e, i) => <Row key={e.id} e={e} place={i} />)}
                {!myInTop && myRank >= 0 && (
                  <>
                    <p className={`text-center text-xs ${subText}`}>· · ·</p>
                    <Row e={board[myRank]} place={myRank} />
                  </>
                )}
              </div>
            </div>

            {/* Meaningless fun (community) — at the end */}
            <div className={`p-4 rounded-lg border border-dashed ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider mb-3 text-brand-gold flex items-center gap-2">
                <Zap className="w-4 h-4" /> Totally official kitchen statistics
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div>
                  <p className="font-display text-2xl font-bold text-brand-primary">{(comm.playerHours * 350).toLocaleString()}</p>
                  <p className={`text-xs ${subText}`}>calories torched 🔥</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-brand-primary">{(comm.totalSessions * 312).toLocaleString()}</p>
                  <p className={`text-xs ${subText}`}>dinks dunk&apos;d 🥒</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-brand-primary">{Math.max(1, Math.round(comm.playerHours / 2)).toLocaleString()}</p>
                  <p className={`text-xs ${subText}`}>movies&apos; worth of play 🎬</p>
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
