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
        const hasSession = sessionDates.some(date => isSameDay(date, day))
        const today = isToday(day)
        
        return (
          <div
            key={day.toISOString()}
            onClick={() => onDateClick?.(day)}
            className={`
              h-6 flex items-center justify-center rounded text-xs
              ${today && hasSession ? 'bg-teal-600 text-white font-bold' : 
                today ? `${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-200'}` :
                hasSession ? 'bg-teal-100 text-teal-800' :
                darkMode ? 'text-gray-400' : 'text-gray-600'}
            `}
          >
            {format(day, 'd')}
          </div>
        )
      })}
    </div>
  )
}