import { Session } from '@/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths } from 'date-fns'

interface MobileCalendarViewProps {
  sessions: Session[]
  darkMode: boolean
  onDateClick?: (date: Date) => void
  monthOffset: number
}

export default function MobileCalendarView({ sessions, darkMode, onDateClick, monthOffset }: MobileCalendarViewProps) {
  const monthStart = startOfMonth(addMonths(new Date(), monthOffset))
  const monthEnd = endOfMonth(monthStart)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const sessionDates = sessions
    .filter(session => {
      const sessionDate = new Date(session.date_time)
      return sessionDate >= monthStart && sessionDate <= monthEnd
    })
    .map(session => new Date(session.date_time))

  return (
    <div className="grid grid-cols-7 gap-1 text-xs">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
        <div key={i} className={`text-center py-0.5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {day}
        </div>
      ))}
      
      {Array.from({ length: monthStart.getDay() }, (_, i) => (
        <div key={`empty-${i}`} />
      ))}
      
      {days.map((day) => {
        const count = sessionDates.filter(date => isSameDay(date, day)).length
        const hasSession = count > 0
        const today = isToday(day)
        
        return (
          <div
            key={day.toISOString()}
            onClick={() => onDateClick?.(day)}
            className={`
              relative h-6 flex items-center justify-center rounded text-xs cursor-pointer
              ${today && hasSession ? `bg-brand-gold text-[#0D1B2A] font-bold ring-2 ring-offset-1 ${darkMode ? 'ring-white ring-offset-[#16222F]' : 'ring-[#0D1B2A] ring-offset-[#F7F1E7]'}` :
                hasSession ? 'bg-brand-gold text-[#0D1B2A] font-bold' :
                today ? `font-bold ring-1 ${darkMode ? 'ring-white/70 text-white' : 'ring-[#0D1B2A]/60 text-gray-900'}` :
                darkMode ? 'text-gray-400' : 'text-gray-600'}
            `}
          >
            {format(day, 'd')}
            {count > 1 && (
              <span className="absolute top-[2px] right-[3px] w-1 h-1 rounded-full bg-[#0D1B2A]" />
            )}
          </div>
        )
      })}
    </div>
  )
}