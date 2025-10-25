'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Session } from '@/types'
import SessionCard from '@/components/SessionCard'

export default function SessionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Get user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Check if this is a private session link
    const privateKey = searchParams.get('private')
    const sessionId = params.id as string

    if (privateKey) {
      // Load private session
      fetch(`/api/get-private-session?key=${privateKey}`)
    .then(response => response.json())
    .then(data => {
      if (data.session) {
        setSession(data.session)
      } else {
        setError('Private session not found or invalid link')
      }
      setLoading(false)
    })
    .catch(error => {
      console.error('Error loading private session:', error)
      setError('Error loading private session')
      setLoading(false)
        })
    } else if (sessionId) {
      // Load regular session
      supabase
        .from('sessions')
        .select(`
          *,
          profiles!sessions_created_by_fkey(name, avatar_url),
          rsvps(
            *,
            profiles(name)
          )
        `)
        .eq('id', sessionId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            setError('Session not found')
          } else {
            setSession(data)
          }
          setLoading(false)
        })
    } else {
      setError('No session specified')
      setLoading(false)
    }
  }, [params.id, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Session Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error || 'The session you are looking for does not exist.'}</p>
          <a 
            href="/" 
            className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <a 
              href="/" 
              className="inline-flex items-center text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              ← Back to all sessions
            </a>
          </div>
          
          <SessionCard 
            session={session}
            currentUserId={user?.id}
            currentUserEmail={user?.email}
            darkMode={true}
          />
        </div>
      </div>
    </div>
  )
}
