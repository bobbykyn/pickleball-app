import { Session } from '@/types'
import { format } from 'date-fns'
import { Calendar, MapPin, Users, Clock, Trash2 } from 'lucide-react'
import UserAvatar from './UserAvatar'

interface SessionCardProps {
    session: Session
    currentUserId?: string
    onDelete?: (sessionId: string) => void
    onRSVP?: (sessionId: string, status: 'yes' | 'maybe' | 'no') => void
  }

  export default function SessionCard({ session, currentUserId, onDelete, onRSVP }: SessionCardProps) {
    const yesRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'yes') || []
    const maybeRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'maybe') || []
    
    const handleDelete = async () => {
      if (!onDelete) return
      
      const confirmed = window.confirm('Are you sure you want to delete this session? This cannot be undone.')
      if (confirmed) {
        onDelete(session.id)
      }
    }
    
    const isCreator = currentUserId === session.created_by
    
    // NEW: Add RSVP logic
    const currentUserRSVP = session.rsvps?.find(rsvp => rsvp.user_id === currentUserId)
    const userRSVPStatus = currentUserRSVP?.status
    
    const handleRSVP = (status: 'yes' | 'maybe' | 'no') => {
      if (!onRSVP || !currentUserId) return
      onRSVP(session.id, status)
    }
    
    const attendeeCount = yesRSVPs.length || 1 // Minimum 1 person for cost calculation
    const totalCost = session.total_cost || 0
    const costPerPerson = totalCost / attendeeCount
    const isPeakTime = session.is_peak_time
    const durationHours = session.duration_hours || 1 

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border border-gray-100">
      {/* Header */}
      {/* Header */}
<div className="flex justify-between items-start mb-4">
  <h3 className="text-xl font-bold text-gray-900">
    {session.title}
  </h3>
  <div className="flex items-center space-x-2">
    <div className="flex items-center space-x-1 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
      <Users className="w-4 h-4" />
      <span>{yesRSVPs.length}/{session.max_players}</span>
    </div>
    {isCreator && (
      <button
        onClick={handleDelete}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete session"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    )}
  </div>
</div>
      
      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center text-gray-600">
          <Calendar className="w-5 h-5 mr-3 text-blue-500" />
          <span className="font-medium">
            {format(new Date(session.date_time), 'EEEE, MMMM do')}
          </span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <Clock className="w-5 h-5 mr-3 text-orange-500" />
          <span className="font-medium">
            {format(new Date(session.date_time), 'h:mm a')}
          </span>
        </div>
        
        <div className="flex items-center text-gray-600">
          <MapPin className="w-5 h-5 mr-3 text-red-500" />
          <span className="font-medium">{session.location}</span>
        </div>
</div>

{/* Cost Information */}
<div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-2">
  <div className="flex items-center space-x-4">
    <div className="text-center">
      <div className="text-2xl font-bold text-teal-700">
        ${costPerPerson.toFixed(2)}
      </div>
      <div className="text-xs text-gray-500">per person</div>
    </div>
    <div className="text-sm text-gray-600">
      <div>{durationHours}h • {isPeakTime ? 'Peak' : 'Off-peak'} rate</div>
      <div className="text-xs">Total: ${totalCost} ÷ {attendeeCount} {attendeeCount === 1 ? 'person' : 'people'}</div>
    </div>
  </div>
  {attendeeCount > 1 && (
    <div className="text-green-600 text-sm font-medium">
      Cost splits as more join!
    </div>
  )}
</div>
      
      {/* Notes */}
      {session.notes && (
        <div className="mb-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-gray-700 text-sm">{session.notes}</p>
        </div>
      )}
      
      {/* RSVP Status */}
      <div className="mb-6">
        <div className="flex items-center space-x-1 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
          <span>Who's Playing:</span>
          {maybeRSVPs.length > 0 && (
            <span className="text-yellow-600">{maybeRSVPs.length} maybe</span>
          )}
        </div>
        {yesRSVPs.length > 0 ? (
  <div className="flex flex-wrap gap-2">
    {yesRSVPs.map((rsvp) => (
      <div key={rsvp.id} className="flex items-center space-x-2 bg-teal-100 text-teal-800 px-3 py-2 rounded-full">
        <UserAvatar profile={rsvp.profiles} size="sm" />
        <span className="text-sm font-medium">
          {rsvp.profiles?.name || 'Player'}
        </span>
      </div>
    ))}
  </div>
        ) : (
          <p className="text-gray-500 text-sm">No one has joined yet - be the first!</p>
        )}
      </div>
      
      {/* Action Buttons */}
{currentUserId && (
  <div className="flex space-x-3">
    <button 
      onClick={() => handleRSVP('yes')}
      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
        userRSVPStatus === 'yes' 
          ? 'bg-teal-700 text-white' 
          : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
      }`}
    >
      Join!
    </button>
    <button 
      onClick={() => handleRSVP('maybe')}
      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
        userRSVPStatus === 'maybe' 
          ? 'bg-yellow-500 text-white' 
          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
      }`}
    >
      Maybe
    </button>
    <button 
      onClick={() => handleRSVP('no')}
      className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
        userRSVPStatus === 'no' 
          ? 'bg-gray-600 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      Next Time!
    </button>
  </div>
)}
    </div>
  )
}