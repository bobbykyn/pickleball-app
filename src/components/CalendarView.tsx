import { Session } from '@/types'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths } from 'date-fns'

interface CalendarViewProps {
  sessions: Session[]
  darkMode: boolean
}

export default function CalendarView({ sessions, darkMode }: CalendarViewProps) {
  const currentDate = new Date()
  const currentMonth = startOfMonth(currentDate)
  const nextMonth = startOfMonth(addMonths(currentDate, 1))
  
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

    const getDayClasses = (day: Date) => {
      const baseClasses = "w-8 h-8 flex items-center justify-center text-sm rounded-lg cursor-pointer transition-colors"
      const hasSession = sessionDates.some(date => isSameDay(date, day))
      const today = isToday(day)
      
      if (today && hasSession) {
        return `${baseClasses} bg-teal-600 text-white font-bold ring-2 ring-yellow-400`
      }
      if (today) {
        return `${baseClasses} ${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-900'} font-bold`
      }
      if (hasSession) {
        return `${baseClasses} bg-teal-100 text-teal-800 font-medium`
      }
      
      return `${baseClasses} ${
        darkMode 
          ? 'text-gray-300 hover:bg-gray-700' 
          : 'text-gray-700 hover:bg-gray-100'
      }`
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
              title={
                sessionDates.some(date => isSameDay(date, day))
                  ? `Session on ${format(day, 'MMM do')}`
                  : undefined
              }
            >
              {format(day, 'd')}
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
      
      {renderMonth(currentMonth, format(currentMonth, 'MMMM yyyy'))}
      {renderMonth(nextMonth, format(nextMonth, 'MMMM yyyy'))}
      
      {/* Legend */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-teal-100 rounded"></div>
          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Has sessions
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-4 h-4 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
          <span className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Today
          </span>
        </div>
      </div>
    </div>
  )
}