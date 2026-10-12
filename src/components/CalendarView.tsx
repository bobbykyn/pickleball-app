import { Session } from '@/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths } from 'date-fns'

interface CalendarViewProps {
  sessions: Session[]
  darkMode: boolean
  onDateClick?: (date: Date) => void
  mobileView?: boolean
  monthOffset?: number
}

export default function CalendarView({ sessions, darkMode, onDateClick, mobileView = false, monthOffset = 0 }: CalendarViewProps) {
  const currentDate = new Date()
  const effectiveDate = mobileView ? addMonths(currentDate, monthOffset) : currentDate
  const currentMonth = startOfMonth(effectiveDate)
  const nextMonth = startOfMonth(addMonths(effectiveDate, 1))
  
  const renderMonth = (monthStart: Date, title: string) => {
    const monthEnd = endOfMonth(monthStart)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    // Get session dates for this month
    const sessionDates = sessions
      .filter(session => {
        const sessionDate = new Date(session.date_time)
        return sessionDate >= monthStart && sessionDate <= monthEnd
      })
      .map(session => new Date(session.date_time))

    const countOn = (day: Date) => sessionDates.filter(date => isSameDay(date, day)).length

    // Event days: solid gold with navy text — the loudest thing on the grid.
    // Today: an outline ring only, so it never competes with event days.
    const getDayClasses = (day: Date) => {
      const baseClasses = "relative w-8 h-8 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors"
      const hasSession = countOn(day) > 0
      const today = isToday(day)
      
      if (today && hasSession) {
        return `${baseClasses} bg-brand-gold text-[#0D1B2A] font-bold ring-2 ring-offset-2 ${darkMode ? 'ring-white ring-offset-[#16222F]' : 'ring-[#0D1B2A] ring-offset-[#F7F1E7]'}`
      }
      if (hasSession) {
        return `${baseClasses} bg-brand-gold text-[#0D1B2A] font-bold hover:brightness-110`
      }
      if (today) {
        return `${baseClasses} font-bold ring-1 ${darkMode ? 'ring-white/70 text-white hover:bg-white/10' : 'ring-[#0D1B2A]/60 text-gray-900 hover:bg-gray-100'}`
      }
      
      return `${baseClasses} ${
        darkMode 
          ? 'text-gray-300 hover:bg-gray-700' 
          : 'text-gray-700 hover:bg-gray-100'
      }`
    }

    const handleDayClick = (day: Date) => {
      if (onDateClick) {
        onDateClick(day)
      }
    }

    return (
      <div className="mb-6">
        <h3 className={`font-semibold mb-3 text-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {title}
        </h3>
        
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div 
              key={index} 
              className={`text-xs font-medium text-center py-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: monthStart.getDay() }, (_, index) => (
            <div key={`empty-${index}`} className="w-8 h-8" />
          ))}
          
          {/* Month days */}
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={getDayClasses(day)}
              onClick={() => handleDayClick(day)}
              title={
                sessionDates.some(date => isSameDay(date, day))
                  ? `Session on ${format(day, 'MMM do')} - Click to view`
                  : `Click to create session on ${format(day, 'MMM do')}`
              }
            >
              {format(day, 'd')}
              {countOn(day) > 1 && (
                <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 flex gap-[2px]">
                  {Array.from({ length: Math.min(countOn(day) - 1, 3) }).map((_, i) => (
                    <span key={i} className="w-1 h-1 rounded-full bg-[#0D1B2A]" />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="calendar-view">
      <h2 className={`text-lg font-bold mb-4 text-center ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        Calendar
      </h2>
      {mobileView ? (
        renderMonth(currentMonth, format(currentMonth, 'MMMM yyyy'))
      ) : (
        <>
          {renderMonth(currentMonth, format(currentMonth, 'MMMM yyyy'))}
          {renderMonth(nextMonth, format(nextMonth, 'MMMM yyyy'))}
        </>
      )}
      
      {/* Legend */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-brand-gold rounded"></div>
          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Has sessions
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded ring-1 ${darkMode ? 'ring-white/70' : 'ring-[#0D1B2A]/60'}`}></div>
          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Today
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-gray-400 border-dashed rounded"></div>
          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Tap an empty day to create a session
          </span>
        </div>
      </div>
    </div>
  )
}