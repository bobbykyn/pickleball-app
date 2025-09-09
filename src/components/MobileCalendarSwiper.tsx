'use client'

import { useSwipeable } from 'react-swipeable'
import MobileCalendarView from './MobileCalendarView'
import { format, addMonths } from 'date-fns'
import { Session } from '@/types'

interface MobileCalendarSwiperProps {
  sessions: Session[]
  darkMode: boolean
  onDateClick: (date: Date) => void
  currentMonthOffset: number
  setCurrentMonthOffset: (value: number | ((prev: number) => number)) => void
}

export default function MobileCalendarSwiper({ 
  sessions, 
  darkMode, 
  onDateClick, 
  currentMonthOffset, 
  setCurrentMonthOffset 
}: MobileCalendarSwiperProps) {
  
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (currentMonthOffset < 2) {
        setCurrentMonthOffset(prev => prev + 1)
      }
    },
    onSwipedRight: () => {
      if (currentMonthOffset > 0) {
        setCurrentMonthOffset(prev => prev - 1)
      }
    },
    trackMouse: false
  })

  return (
    <div {...handlers} className="touch-pan-y">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm">
          {format(addMonths(new Date(), currentMonthOffset), 'MMMM yyyy')}
          <span className="text-xs text-gray-400">← swipe →</span>
        </h3>
        
        <div className="text-xs space-y-1">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-teal-100 rounded"></div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Session</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded ${darkMode ? 'bg-gray-600' : 'bg-gray-200'}`}></div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Today</span>
          </div>
        </div>
      </div>
      
      <MobileCalendarView 
        sessions={sessions} 
        darkMode={darkMode}
        onDateClick={onDateClick}
        monthOffset={currentMonthOffset}
      />
    </div>
  )
}