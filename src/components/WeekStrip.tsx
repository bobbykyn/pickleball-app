'use client'

import { Session } from '@/types'
import { addDays, format, isSameDay, isToday, startOfDay } from 'date-fns'

interface WeekStripProps {
  sessions: Session[]
  onDayClick: (date: Date) => void
  monthOpen: boolean
  onToggleMonth: () => void
}

/** Next 7 days at a glance — gold = there's a session, ring = today. */
export default function WeekStrip({ sessions, onDayClick, monthOpen, onToggleMonth }: WeekStripProps) {
  const today = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const countOn = (d: Date) => sessions.filter((s) => isSameDay(new Date(s.date_time), d)).length

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/60">
          {format(today, 'MMMM')}
        </span>
        <button onClick={onToggleMonth} className="text-xs font-bold text-gold-ink hover:underline">
          {monthOpen ? 'Hide month' : 'Month view'}
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const n = countOn(d)
          const has = n > 0
          const now = isToday(d)
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              aria-label={`${format(d, 'EEEE d MMMM')}${has ? `, ${n} session${n > 1 ? 's' : ''}` : ''}`}
              className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                has
                  ? 'bg-brand-gold text-navy'
                  : now
                    ? 'ring-[1.5px] ring-inset ring-foreground/75 text-foreground'
                    : 'text-foreground/80 hover:bg-surface-2'
              } ${has && now ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : ''}`}
            >
              <span className={`text-[10px] font-bold ${has ? '' : 'text-foreground/55'}`}>
                {format(d, 'EEE').toUpperCase()}
              </span>
              <span className={`font-display text-[19px] leading-none ${has || now ? 'font-bold' : 'font-medium'}`}>
                {format(d, 'd')}
              </span>
              <span className={`w-[5px] h-[5px] rounded-full ${has ? 'bg-navy' : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
