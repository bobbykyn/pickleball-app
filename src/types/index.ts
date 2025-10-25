export interface Profile {
    id: string
  name: string
  phone: string | null
  wants_notifications: boolean
  wants_rsvp_updates: boolean
  avatar_url: string | null
  google_avatar_url: string | null
  created_at: string
  }
  
  export interface Session {
    id: string
  created_by: string
  title: string
  date_time: string
  location: string
  max_players: number
  duration_hours?: number
  total_cost?: number
  is_peak_time?: boolean
  cost_per_person?: number
  notes: string | null
  created_at: string
  is_private?: boolean
  private_key?: string
  rsvps?: RSVP[]
  invited_users?: string[]
  hide_costs?: boolean
  manual_participants?: string[]
  profiles?: { 
    name: string }[]
    avatar_url?: string
  }
  
  export interface RSVP {
    id: string
    session_id: string
    user_id: string
    status: 'yes' | 'maybe' | 'no'
    created_at: string
    profiles?: Profile
  }