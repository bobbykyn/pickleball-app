import { User } from 'lucide-react'

interface UserAvatarProps {
  profile?: {
    name: string
    avatar_url?: string | null
    google_avatar_url?: string | null
  }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function UserAvatar({ profile, size = 'md', className = '' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  }

  const avatarUrl = profile?.avatar_url || profile?.google_avatar_url
  const initials = profile?.name 
    ? profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={profile?.name || 'User'}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={(e) => {
          // Fallback to initials if image fails to load
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          target.nextElementSibling?.classList.remove('hidden')
        }}
      />
    )
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium ${className}`}>
      {initials}
    </div>
  )
}