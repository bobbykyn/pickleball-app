import { Session } from '@/types'
import { format } from 'date-fns'
import { Trash2, Edit, Loader2, X, Plus, Minus, CalendarPlus, Ticket, Link2, Check, Lock, Clock, MoreHorizontal, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import UserAvatar from './UserAvatar'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { isAdminEmail } from '@/lib/admins'
import { APP_URL } from '@/lib/config'
import { calendarUrl } from '@/lib/ics'

type AddedUser = { id: string; name: string; avatar_url?: string }

interface SessionCardProps {
  session: Session
  currentUserId?: string
  currentUserEmail?: string
  onDelete?: (sessionId: string) => void
  onEdit?: (session: Session) => void
  onRSVP?: (
    sessionId: string,
    status: 'yes' | 'maybe' | 'no',
    opts?: { guestCount?: number; guestNames?: string[]; addedUsers?: AddedUser[] }
  ) => void
  rsvpLoading?: boolean
  darkMode?: boolean
  onViewPlayer?: (userId: string, profile?: { name?: string; avatar_url?: string | null; google_avatar_url?: string | null }) => void
  onDecide?: (sessionId: string, userId: string, decision: 'yes' | 'no') => Promise<void> | void
}

export default function SessionCard({ session, currentUserId, currentUserEmail, onDelete, onEdit, onRSVP, rsvpLoading = false, darkMode = false, onViewPlayer, onDecide }: SessionCardProps) {
  const [linkCopied, setLinkCopied] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [joinMode, setJoinMode] = useState<'closed' | 'choose' | 'plus1' | 'plusmore'>('closed')
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; avatar_url?: string }>>([])
  const [picked, setPicked] = useState<AddedUser[]>([])
  const [guestNames, setGuestNames] = useState<string[]>([])
  const [unnamedGuestCount, setUnnamedGuestCount] = useState(0)
  const [pickerSearch, setPickerSearch] = useState('')
  const [showPickerDropdown, setShowPickerDropdown] = useState(false)

  useEffect(() => {
    if (joinMode !== 'plus1' && joinMode !== 'plusmore') return
    if (allUsers.length > 0) return
    supabase
      .from('profiles')
      .select('id, name, avatar_url, google_avatar_url')
      .order('name')
      .then(({ data }) => {
        if (data) setAllUsers(data as any)
      })
  }, [joinMode, allUsers.length])

  const resetPicker = () => {
    setPicked([])
    setGuestNames([])
    setUnnamedGuestCount(0)
    setPickerSearch('')
    setShowPickerDropdown(false)
    setJoinMode('closed')
  }

  const isCreator = currentUserId === session.created_by
  const isAdmin = isAdminEmail(currentUserEmail)
  const canDelete = isCreator || isAdmin
  const canEdit = isCreator || isAdmin

  const yesRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'yes') || []
  const pendingRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'pending') || []

  // Join rules
  const isHostOrAdmin = isCreator || isAdmin
  const inviteOnly = !!session.invite_only
  const needsApproval = !inviteOnly && !!session.requires_approval && !isHostOrAdmin
  const hasInvite = !inviteOnly || isHostOrAdmin ||
    (!!currentUserId && (session.invited_users || []).map(String).includes(currentUserId))
  const inviteUrl = session.invite_token ? `${APP_URL}/?invite=${session.invite_token}` : null

  const copyInviteLink = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      window.prompt('Copy this invite link:', inviteUrl)
    }
  }

  const decide = async (userId: string, decision: 'yes' | 'no') => {
    if (!onDecide) return
    setDecidingId(userId)
    try { await onDecide(session.id, userId, decision) } finally { setDecidingId(null) }
  }

  const handleDelete = async () => {
    if (!onDelete) return

    const confirmed = window.confirm('Are you sure you want to delete this session? This cannot be undone.')
    if (confirmed) {
      onDelete(session.id)
    }
  }

  const shareToWhatsApp = () => {
    const dateObj = new Date(session.date_time)
    const sessionDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = format(dateObj, 'h:mm a')
    const yesRSVPsCount = session.rsvps?.filter(r => r.status === 'yes').length || 0
    const totalGuestSeatsCount = session.rsvps?.reduce((sum, r) => sum + (r.status === 'yes' ? (r.guest_count || 0) : 0), 0) || 0
    const attendees = yesRSVPsCount + totalGuestSeatsCount

    const message = encodeURIComponent(
      `🎾 Pickleball Session!\n\n` +
      `📅 ${sessionDate}\n` +
      `⏰ ${timeStr}\n` +
      `📍 ${session.location}\n` +
      `👥 ${attendees} players confirmed\n\n` +
      `${inviteOnly ? '🎟 Invite only — join with this link' : 'Join here'}: ${inviteOnly && isHostOrAdmin && inviteUrl ? inviteUrl : `${APP_URL}/`}\n` +
      `📅 Add to calendar: ${calendarUrl(session.id)}`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const currentUserRSVP = session.rsvps?.find(rsvp => rsvp.user_id === currentUserId)
  const userRSVPStatus = currentUserRSVP?.status

  const openEditGuests = () => {
    if (currentUserRSVP) {
      const names = currentUserRSVP.guest_names || []
      const totalCount = currentUserRSVP.guest_count || 0
      setGuestNames(names)
      setUnnamedGuestCount(Math.max(0, totalCount - names.length))
    }
    setJoinMode('plusmore')
  }

  const handleRSVP = (status: 'yes' | 'no', opts?: { guestCount?: number; guestNames?: string[]; addedUsers?: AddedUser[] }) => {
    if (!onRSVP || !currentUserId) return
    onRSVP(session.id, status, opts)
  }

  const submitJoin = () => {
    const guestCount = unnamedGuestCount + guestNames.length
    handleRSVP('yes', { guestCount, guestNames, addedUsers: picked })
    resetPicker()
  }

  // exclude current user, already-RSVP'd users, and already-picked users from the picker
  const pickerCandidates = allUsers
    .filter(u => u.id !== currentUserId)
    .filter(u => !yesRSVPs.some(r => r.user_id === u.id))
    .filter(u => !picked.some(p => p.id === u.id))
    .filter(u => u.name?.toLowerCase().includes(pickerSearch.toLowerCase()))
    .slice(0, 5)

  const totalGuestSeats = (session.rsvps || []).reduce((sum, r) => sum + (r.status === 'yes' ? (r.guest_count || 0) : 0), 0)
  const attendeeCount = (yesRSVPs.length + totalGuestSeats) || 1
  const durationHours = session.duration_hours || 1

  const sessionDate = new Date(session.date_time)
  const courtList = (session.courts || []).map(c => c.trim()).filter(Boolean)
  const maxPlayers = session.max_players || 8
  const takenSeats = yesRSVPs.length + totalGuestSeats
  const spotsLeft = Math.max(0, maxPlayers - takenSeats)

  const endDate = new Date(sessionDate.getTime() + durationHours * 60 * 60 * 1000)
  const sameHalf = (sessionDate.getHours() >= 12) === (endDate.getHours() >= 12)
  const timeRange = `${format(sessionDate, sameHalf ? 'h:mm' : 'h:mm a')} – ${format(endDate, 'h:mm a')}`
  const hostName = session.profiles?.name || 'Unknown'
  const guestSeatsYes = takenSeats - yesRSVPs.length

  // Rubber stamp on the page: your status first, then the session's
  const stamp: { text: string; cls: string } | null =
    userRSVPStatus === 'yes' ? { text: "YOU'RE IN", cls: 'text-go-ink animate-stamp-in' }
    : userRSVPStatus === 'pending' ? { text: 'REQUESTED', cls: 'text-gold-ink' }
    : spotsLeft === 0 ? { text: 'FULL', cls: 'text-brand-primary' }
    : !hasInvite ? { text: 'INVITE ONLY', cls: 'text-gold-ink' }
    : { text: `${spotsLeft} SPOT${spotsLeft === 1 ? '' : 'S'}`, cls: 'text-gold-ink' }

  const copyPrivateLink = () => {
    const shareUrl = `${window.location.origin}/session/${session.id}?private=${session.private_key}`
    navigator.clipboard.writeText(shareUrl).catch(() => window.prompt('Copy this link:', shareUrl))
  }

  const menuItems: Array<{ label: string; icon: ReactNode; onClick: () => void; danger?: boolean }> = []
  if (userRSVPStatus === 'yes') menuItems.push({ label: 'Cancel my spot', icon: <LogOut className="w-4 h-4" />, onClick: () => handleRSVP('no'), danger: true })
  if (userRSVPStatus === 'pending') menuItems.push({ label: 'Withdraw request', icon: <LogOut className="w-4 h-4" />, onClick: () => handleRSVP('no'), danger: true })
  if (inviteOnly && isHostOrAdmin && inviteUrl) menuItems.push({ label: linkCopied ? 'Invite link copied' : 'Copy invite link', icon: <Link2 className="w-4 h-4" />, onClick: copyInviteLink })
  if (session.is_private && isCreator) menuItems.push({ label: 'Copy private link', icon: <Link2 className="w-4 h-4" />, onClick: copyPrivateLink })
  if (canEdit && onEdit) menuItems.push({ label: 'Edit session', icon: <Edit className="w-4 h-4" />, onClick: () => onEdit(session) })
  if (canDelete && onDelete) menuItems.push({ label: 'Delete session', icon: <Trash2 className="w-4 h-4" />, onClick: handleDelete, danger: true })

  const stripCls = session.is_private
    ? 'bg-purple-700 text-white border-purple-950'
    : inviteOnly
      ? 'bg-brand-gold text-navy border-[#9A6B00]'
      : 'bg-brand-primary text-white border-brand-burgundy'

  return (
    <article className={`relative rounded-t-md rounded-b-2xl overflow-hidden bg-card-bg shadow-[0_12px_28px_rgba(0,0,0,0.28)] transition-transform duration-300 ${
      inviteOnly && !session.is_private ? 'border-2 border-brand-gold' : 'border border-brand-border'
    }`}>
      {/* Calendar-page strip */}
      <div className={`h-[34px] flex items-center justify-between gap-3 px-4 border-b-[3px] font-mono text-[11px] font-semibold tracking-[0.06em] ${stripCls}`}>
        <span className="flex items-center gap-1.5 min-w-0">
          {session.is_private && <Lock className="w-3 h-3 shrink-0" />}
          {inviteOnly && <Ticket className="w-3 h-3 shrink-0" />}
          <span className="truncate">{session.title}</span>
        </span>
        <span className="shrink-0 uppercase opacity-90">Host: {hostName}</span>
      </div>
      <div className="pk-holes" aria-hidden="true" />

      {stamp && (
        <div key={stamp.text} className={`pk-stamp absolute right-3.5 top-[58px] pointer-events-none ${stamp.cls}`}>
          {stamp.text}
        </div>
      )}

      {/* Big date */}
      <div className="px-[18px] pt-1.5">
        <div className="font-display text-[52px] font-bold leading-none uppercase text-foreground">
          {format(sessionDate, 'd MMM')}
        </div>
        <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
          <span className="font-display text-xl font-medium tracking-[0.03em] text-gold-ink uppercase">
            {format(sessionDate, 'EEE')} · {timeRange}
          </span>
          <span className="text-[11px] font-bold text-foreground/75 border border-brand-border rounded-md px-1.5 py-0.5">
            {durationHours} {durationHours === 1 ? 'hr' : 'hrs'}
          </span>
          {needsApproval && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-foreground/75 border border-foreground/30 rounded-md px-1.5 py-0.5">
              <Check className="w-3 h-3" /> Approval
            </span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-[17px] font-semibold text-foreground">{session.location}</span>
          {courtList.length > 0 && (
            <span className="text-[11px] font-extrabold bg-foreground text-background rounded-md px-1.5 py-0.5">
              Court {courtList.join('+')}
            </span>
          )}
        </div>

        {session.notes && (
          <div className="mt-4 p-3 rounded-md bg-surface-2 border border-brand-border">
            <p className="text-sm text-foreground/80 whitespace-pre-line">{session.notes}</p>
          </div>
        )}
      </div>

      <div className="mx-[18px] mt-4 border-t-[1.5px] border-dashed border-brand-border" />

      <div className="px-4 pt-3.5 pb-4 space-y-3">
        {/* Pending requests — host and admins only */}
        {isHostOrAdmin && pendingRSVPs.length > 0 && (
          <div className="rounded-md border border-brand-gold/50 bg-brand-gold/[0.07] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-ink mb-2.5">
              <Clock className="w-3.5 h-3.5" /> Pending requests · {pendingRSVPs.length}
            </p>
            <div className="space-y-2">
              {pendingRSVPs.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 min-w-0 text-sm font-semibold text-foreground">
                    <UserAvatar profile={r.profiles} size="sm" />
                    <span className="truncate">{r.profiles?.name || 'Player'}</span>
                    {(r.guest_count || 0) > 0 && (
                      <span className="shrink-0 text-xs font-medium text-foreground/60">+{r.guest_count} guest{(r.guest_count || 0) > 1 ? 's' : ''}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    <button
                      disabled={decidingId === r.user_id}
                      onClick={() => decide(r.user_id, 'yes')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold bg-brand-go text-navy hover:brightness-105 disabled:opacity-50"
                    >
                      {decidingId === r.user_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Approve
                    </button>
                    <button
                      disabled={decidingId === r.user_id}
                      onClick={() => decide(r.user_id, 'no')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold border border-brand-primary/60 text-brand-primary hover:bg-brand-primary/10 disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      Decline
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Roster */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-foreground/60">On the court</span>
          <span className="text-[13px] font-bold">
            <span className="font-display text-base">{takenSeats}/{maxPlayers}</span>{' '}
            <span className={spotsLeft === 0 ? 'text-brand-primary' : 'text-foreground/60'}>
              · {spotsLeft === 0 ? 'full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
            </span>
          </span>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {Array.from({ length: maxPlayers }).map((_, i) => (
            <span
              key={i}
              className={`h-[5px] flex-1 rounded-full ${
                i < yesRSVPs.length ? 'bg-brand-go' : i < takenSeats ? 'bg-brand-go/50' : 'bg-foreground/[0.12]'
              }`}
            />
          ))}
        </div>

        {yesRSVPs.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {yesRSVPs.map((rsvp) => (
              <div key={rsvp.id} className="flex flex-wrap gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => onViewPlayer?.(rsvp.user_id, rsvp.profiles)}
                  disabled={!onViewPlayer}
                  title={onViewPlayer ? `View ${rsvp.profiles?.name || 'player'}'s stats` : undefined}
                  className={`flex items-center gap-1.5 pl-[3px] pr-2.5 py-[3px] rounded-full text-[13px] font-semibold bg-chip text-chip-ink transition-transform duration-200 ${
                    onViewPlayer ? 'hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <UserAvatar profile={rsvp.profiles} size="sm" />
                  {rsvp.profiles?.name || 'Player'}
                </button>

                {rsvp.guest_names?.map((gname, gi) => (
                  <span key={`g-${rsvp.id}-${gi}`} className="px-3 py-1 rounded-full text-[13px] font-semibold text-foreground/65 border border-dashed border-brand-border">
                    {gname} · guest
                  </span>
                ))}

                {(rsvp.guest_count || 0) > (rsvp.guest_names?.length || 0) && (
                  <span className="px-3 py-1 rounded-full text-[13px] font-semibold text-foreground/65 border border-dashed border-brand-border">
                    +{(rsvp.guest_count || 0) - (rsvp.guest_names?.length || 0)} guest of {rsvp.profiles?.name || 'player'}
                  </span>
                )}
              </div>
            ))}

            {/* Session-level manual participants (legacy, from create flow) */}
            {session.manual_participants?.map((name: string, index: number) => (
              <span key={`manual-${index}`} className="px-3 py-1 rounded-full text-[13px] font-semibold text-foreground/65 border border-dashed border-brand-border">
                {name} · guest
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-foreground/55">No one has joined yet — be the first.</p>
        )}

        {/* Actions */}
        {currentUserId && (
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              {userRSVPStatus === 'pending' ? (
                <div className="flex-1 h-12 rounded-xl font-display text-[15px] font-semibold uppercase tracking-[0.1em] flex items-center justify-center gap-2 border border-dashed border-brand-gold/70 text-gold-ink">
                  <Clock className="w-4 h-4" /> Requested
                </div>
              ) : !hasInvite && userRSVPStatus !== 'yes' ? (
                <button
                  disabled
                  aria-disabled="true"
                  title="You need the host's invite link to join"
                  className="flex-1 h-12 rounded-xl font-display text-[15px] font-semibold uppercase tracking-[0.1em] flex items-center justify-center gap-2 bg-foreground/10 text-foreground/40 cursor-not-allowed"
                >
                  <Lock className="w-4 h-4" /> Invite only
                </button>
              ) : (
                <button
                  disabled={rsvpLoading}
                  onClick={() => {
                    if (userRSVPStatus === 'yes') {
                      if (joinMode === 'closed') openEditGuests()
                      else resetPicker()
                    } else {
                      setJoinMode(prev => (prev === 'closed' ? 'choose' : 'closed'))
                    }
                  }}
                  className={`flex-1 h-12 rounded-xl font-display text-[15px] font-semibold uppercase tracking-[0.1em] flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 active:scale-[0.975] ${
                    userRSVPStatus === 'yes'
                      ? (joinMode === 'closed' ? 'bg-brand-go text-navy hover:brightness-105' : 'bg-foreground/15 text-foreground hover:bg-foreground/25')
                      : (joinMode === 'closed' ? 'bg-brand-primary text-white hover:brightness-110' : 'bg-foreground/15 text-foreground hover:bg-foreground/25')
                  }`}
                >
                  {rsvpLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : userRSVPStatus === 'yes' && joinMode === 'closed' && <Check className="w-4 h-4" strokeWidth={3} />}
                  {userRSVPStatus === 'yes'
                    ? (joinMode === 'closed' ? 'Going · Guests' : 'Close')
                    : (joinMode === 'closed' ? (needsApproval ? 'Request to join' : 'Join') : 'Close')}
                </button>
              )}

              <a
                href={calendarUrl(session.id)}
                target="_blank"
                rel="noopener"
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border border-brand-gold/50 text-gold-ink hover:bg-brand-gold/10 transition-colors active:scale-95"
                title="Add to calendar"
                aria-label="Add to calendar"
              >
                <CalendarPlus className="w-5 h-5" />
              </a>

              <button
                onClick={shareToWhatsApp}
                className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border border-foreground/30 text-foreground hover:bg-surface-2 transition-colors active:scale-95"
                title="Share to WhatsApp"
                aria-label="Share to WhatsApp"
              >
                <svg className="w-[19px] h-[19px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              </button>

              {menuItems.length > 0 && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="w-12 h-12 flex items-center justify-center rounded-xl border border-foreground/20 text-foreground/80 hover:bg-surface-2 transition-colors active:scale-95"
                    aria-label="More options"
                    aria-expanded={menuOpen}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  {menuOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                      <div className="absolute right-0 bottom-14 z-40 w-56 rounded-xl border border-brand-border bg-card-bg shadow-2xl py-1.5" role="menu">
                        {menuItems.map((item) => (
                          <button
                            key={item.label}
                            role="menuitem"
                            onClick={() => { item.onClick(); if (!item.label.startsWith('Copy')) setMenuOpen(false) }}
                            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-left hover:bg-surface-2 transition-colors ${item.danger ? 'text-brand-primary' : 'text-foreground'}`}
                          >
                            {item.icon}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Initial choose panel */}
            {joinMode === 'choose' && userRSVPStatus !== 'yes' && (
              <div className="p-3 rounded-md border border-brand-border bg-surface-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/55 mb-2.5">Who's coming?</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => { handleRSVP('yes'); setJoinMode('closed') }}
                    className="py-2.5 px-2 rounded-md font-display text-[13px] font-medium uppercase tracking-[0.07em] bg-brand-primary text-white hover:brightness-110 transition-all active:scale-[0.97]"
                  >
                    Just me
                  </button>
                  <button
                    onClick={() => setJoinMode('plus1')}
                    className="py-2.5 px-2 rounded-md font-display text-[13px] font-medium uppercase tracking-[0.07em] border border-brand-border text-foreground hover:border-foreground/40 hover:bg-surface-2 transition-all active:scale-[0.97]"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => setJoinMode('plusmore')}
                    className="py-2.5 px-2 rounded-md font-display text-[13px] font-medium uppercase tracking-[0.07em] border border-brand-border text-foreground hover:border-foreground/40 hover:bg-surface-2 transition-all active:scale-[0.97]"
                  >
                    +more
                  </button>
                </div>
              </div>
            )}

            {/* Picker panel (+1 or +more) */}
            {(joinMode === 'plus1' || joinMode === 'plusmore') && (() => {
              const cap = joinMode === 'plus1' ? 1 : Infinity
              const totalAdded = picked.length + guestNames.length + unnamedGuestCount
              const atCap = totalAdded >= cap
              return (
                <div className="p-3 rounded-md border border-brand-border bg-surface-2 space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/55">
                      {joinMode === 'plus1' ? 'Bring one friend' : 'Bring friends'}
                    </p>
                    <button onClick={resetPicker} className="text-foreground/50 hover:text-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Friend / guest search */}
                  <div className="relative">
                    <input
                      type="text"
                      value={pickerSearch}
                      onChange={(e) => { setPickerSearch(e.target.value); setShowPickerDropdown(e.target.value.length > 0) }}
                      onFocus={() => setShowPickerDropdown(pickerSearch.length > 0)}
                      placeholder="Search friend or type guest name..."
                      disabled={atCap}
                      className="w-full p-2 rounded-md border border-brand-border bg-background text-foreground placeholder-foreground/40 text-sm disabled:opacity-50 focus:border-brand-gold focus:outline-none transition-colors"
                    />
                    {showPickerDropdown && !atCap && (
                      <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-48 overflow-y-auto border border-brand-border bg-background">
                        {pickerCandidates.length > 0 ? (
                          pickerCandidates.map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setPicked(prev => [...prev, { id: u.id, name: u.name, avatar_url: u.avatar_url }])
                                setPickerSearch('')
                                setShowPickerDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2 transition-colors"
                            >
                              {u.name}
                            </button>
                          ))
                        ) : (
                          pickerSearch.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                setGuestNames(prev => [...prev, pickerSearch.trim()])
                                setPickerSearch('')
                                setShowPickerDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-surface-2 transition-colors"
                            >
                              Add "{pickerSearch.trim()}" as guest
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selected pills */}
                  {(picked.length > 0 || guestNames.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {picked.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 bg-chip text-chip-ink rounded-full text-xs whitespace-nowrap">
                          {u.name}
                          <button onClick={() => setPicked(prev => prev.filter(p => p.id !== u.id))}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      {guestNames.map((g, i) => (
                        <span key={`${g}-${i}`} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-foreground/70 border border-dashed border-brand-border">
                          {g} · guest
                          <button onClick={() => setGuestNames(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Unnamed guest stepper — only in +more */}
                  {joinMode === 'plusmore' && (
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/55">Unnamed guests</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUnnamedGuestCount(c => Math.max(0, c - 1))}
                          className="p-1.5 rounded-md border border-brand-border text-foreground hover:border-foreground/40 hover:bg-surface-2 transition-all active:scale-95"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-foreground">{unnamedGuestCount}</span>
                        <button
                          onClick={() => setUnnamedGuestCount(c => c + 1)}
                          className="p-1.5 rounded-md border border-brand-border text-foreground hover:border-foreground/40 hover:bg-surface-2 transition-all active:scale-95"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {joinMode === 'plus1' && atCap && (
                    <p className="text-[11px] text-gold-ink">+1 cap reached. Use +more to add another.</p>
                  )}

                  <button
                    disabled={rsvpLoading}
                    onClick={submitJoin}
                    className="w-full py-2.5 px-3 rounded-md font-display text-[13px] font-semibold uppercase tracking-[0.08em] bg-brand-primary text-white hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  >
                    {rsvpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {userRSVPStatus === 'yes' ? 'Update guests' : needsApproval ? 'Send request' : 'Confirm join'} {totalAdded > 0 ? `(+${totalAdded})` : ''}
                  </button>
                </div>
              )
            })()}
          </div>
        )}
      </div>
    </article>
  )
}
