import { Session } from '@/types'
import { format } from 'date-fns'
import { Calendar, MapPin, Users, Clock, Trash2, Edit } from 'lucide-react'
import UserAvatar from './UserAvatar'
import { Share2 } from 'lucide-react';

interface SessionCardProps {
  session: Session
  currentUserId?: string
  currentUserEmail?: string
  onDelete?: (sessionId: string) => void
  onEdit?: (session: Session) => void
  onRSVP?: (sessionId: string, status: 'yes' | 'maybe' | 'no') => void
  darkMode?: boolean
}

export default function SessionCard({ session, currentUserId, currentUserEmail, onDelete, onEdit, onRSVP, darkMode = false }: SessionCardProps) {
  const isCreator = currentUserId === session.created_by
  const isAdmin = currentUserEmail === 'bobbykyn@gmail.com'
  const canDelete = isCreator || isAdmin
  const canEdit = isCreator || isAdmin
  
  const yesRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'yes') || []
  //const maybeRSVPs = session.rsvps?.filter(rsvp => rsvp.status === 'maybe') || []
  
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
    const attendees = session.rsvps?.filter(r => r.status === 'yes').length || 0
    const perPerson = (session.total_cost ?? 0) / (attendees || 1)
    
    const message = encodeURIComponent(
      `🎾 Pickleball Session!\n\n` +
      `📅 ${sessionDate}\n` +
      `⏰ ${timeStr}\n` +
      `📍 ${session.location}\n` +
      `💰 $${perPerson.toFixed(2)} HKD per person\n` +
      `👥 ${attendees} players confirmed\n\n` +
      `Join here: https://pickleball-app-1.vercel.app/`
    );
    
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const currentUserRSVP = session.rsvps?.find(rsvp => rsvp.user_id === currentUserId)
  const userRSVPStatus = currentUserRSVP?.status
  
  const handleRSVP = (status: 'yes' | 'no') => {
    if (!onRSVP || !currentUserId) return
    onRSVP(session.id, status)
  }
  
  const attendeeCount = yesRSVPs.length || 1
  const totalCost = session.total_cost || 0
  const costPerPerson = totalCost / attendeeCount
  const isPeakTime = session.is_peak_time
  const durationHours = session.duration_hours || 1 

  return (
    <div className={`rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border ${
      session.is_private
    ? darkMode 
      ? 'bg-purple-900/20 border-purple-700/50' 
      : 'bg-purple-50 border-purple-200'
    : darkMode 
      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' 
      : 'bg-white border-gray-100'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className={`text-xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'} flex items-center gap-2`}>
          {session.is_private && <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">🔒 Private</span>}
          {session.title}
        </h3>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
            darkMode 
              ? 'bg-teal-900 text-teal-200' 
              : 'bg-teal-100 text-teal-800'
          }`}>
            <Users className="w-4 h-4" />
            <span>{yesRSVPs.length}/{session.max_players}</span>
          </div>
          
          {/* Action buttons for creators/admin */}
          <div className="flex items-center space-x-1">
            {/* Share button for private sessions */}
            {session.is_private && isCreator && (
              <button
                onClick={() => {
                  const shareUrl = `${window.location.origin}/session/${session.id}?private=${session.private_key}`
                  navigator.clipboard.writeText(shareUrl)
                  alert('Share link copied to clipboard!')
                }}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-green-400 hover:bg-green-900/20'
                    : 'text-green-600 hover:bg-green-50'
                }`}
                title="Copy share link"
              >
                📋
              </button>
            )}
            
            {canEdit && onEdit && (
              <button
                onClick={() => onEdit(session)}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-blue-400 hover:bg-blue-900/20'
                    : 'text-blue-600 hover:bg-blue-50'
                }`}
                title={isAdmin ? "Edit session (Admin)" : "Edit session"}
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            
            {canDelete && (
              <button
                onClick={handleDelete}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode
                    ? 'text-red-400 hover:bg-red-900/20'
                    : 'text-red-600 hover:bg-red-50'
                }`}
                title={isAdmin ? "Delete session (Admin)" : "Delete session"}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Details */}
      <div className="space-y-3 mb-6">
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Calendar className="w-5 h-5 mr-3 text-blue-500" />
          <span className="font-medium">
            {format(new Date(session.date_time), 'EEEE, MMMM do')}
          </span>
        </div>
        
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <Clock className="w-5 h-5 mr-3 text-orange-500" />
          <span className="font-medium">
            {format(new Date(session.date_time), 'h:mm a')}
          </span>
        </div>
        
        <div className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <MapPin className="w-5 h-5 mr-3 text-red-500" />
          <span className="font-medium">{session.location}</span>
        </div>
      </div>

      {/* Cost Information - For Megabox and Stackd locations */}
{(session.location.toLowerCase().includes('megabox') || 
  (session.location.toLowerCase().includes('stackd') && session.location.toLowerCase().includes('hopewell'))) && (
  <div className={`flex items-center justify-between rounded-lg p-3 mt-2 ${
    darkMode ? 'bg-gray-700' : 'bg-gray-50'
  }`}>
    <div className="flex items-center space-x-4">
      <div className="text-center">
        <div className={`text-2xl font-bold ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>
          ${costPerPerson.toFixed(2)}
        </div>
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>per person</div>
      </div>
      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        {session.location.toLowerCase().includes('megabox') ? (
          <>
            <div>{durationHours}h • {isPeakTime ? 'Peak' : 'Off-peak'} rate</div>
            <div className="text-xs">Total: ${totalCost} ÷ {attendeeCount} {attendeeCount === 1 ? 'person' : 'people'}</div>
          </>
        ) : (
          <>
            <div>{durationHours}h • Stackd Hopewell</div>
            <div className="text-xs">Court: ${400 * durationHours} + Players: ${100 * attendeeCount}</div>
            <div className="text-xs">Total: ${totalCost} ÷ {attendeeCount} {attendeeCount === 1 ? 'person' : 'people'}</div>
          </>
        )}
      </div>
    </div>
    {attendeeCount > 1 && (
      <div className={`text-sm font-bold ${darkMode ? 'text-teal-400' : 'text-teal-700'}`}>
        OJ!!
      </div>
    )}
  </div>
)}
      
      {/* Notes */}
      {session.notes && (
        <div className={`mb-6 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{session.notes}</p>
        </div>
      )}
      
      {/* RSVP Status - More spacing */}
      <div className="my-8">
        <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
          darkMode 
            ? 'bg-teal-900 text-teal-200' 
            : 'bg-teal-100 text-teal-800'
        }`}>
          <span>Who's Playing:</span>
          {/* {maybeRSVPs.length > 0 && (
            <span className="text-yellow-600">{maybeRSVPs.length} maybe</span>
          )} */}
        </div>
        {yesRSVPs.length > 0 ? (
          <div className="flex flex-wrap gap-4">
            {yesRSVPs.map((rsvp) => (
              <div key={rsvp.id} className={`flex items-center space-x-2 px-3 py-2 rounded-full ${
                darkMode 
                  ? 'bg-teal-900 text-teal-200' 
                  : 'bg-teal-50 text-teal-800'
              }`}>
                <UserAvatar profile={rsvp.profiles} size="sm" />
                <span className="text-sm font-medium">
                  {rsvp.profiles?.name || 'Player'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            No one has joined yet - be the first!
          </p>
        )}
      </div>
      
      {/* Action Buttons */}
      {currentUserId && (
        <div className="flex gap-3">
        <button 
          onClick={() => handleRSVP('yes')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            userRSVPStatus === 'yes' 
              ? 'bg-teal-700 text-white' 
              : darkMode
                ? 'bg-teal-800 text-teal-200 hover:bg-teal-700'
                : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
          }`}
        >
          {userRSVPStatus === 'yes' ? '✓ Going' : 'Join!'}
        </button>
        
        {userRSVPStatus === 'yes' && (
          <button 
            onClick={() => handleRSVP('no')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              darkMode
                ? 'bg-red-800/30 text-red-300 hover:bg-red-800/50'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            Cancel
          </button>
        )}
      
      <button
  onClick={shareToWhatsApp}
  className={`p-3 rounded-lg transition-colors ${
    darkMode 
      ? 'bg-green-800 text-green-200 hover:bg-green-700' 
      : 'bg-green-100 text-green-700 hover:bg-green-200'
  }`}
  title="Share to WhatsApp"
>
  <svg 
    className="w-5 h-5" 
    fill="currentColor" 
    viewBox="0 0 24 24"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
</button>
      </div>
      )}
    </div>
  )
}