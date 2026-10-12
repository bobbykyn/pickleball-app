'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import PkMark from './PkMark'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  initialMode?: 'login' | 'signup'
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true)

  // Sync to the requested mode each time the modal is opened
  useEffect(() => {
    if (isOpen) setIsLogin(initialMode !== 'signup')
  }, [isOpen, initialMode])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (!isOpen) return null

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setMessage('Logged in successfully!')
        onClose()
    } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0]
            }
          }
        })
        if (error) throw error
        
        // Create profile if user was created
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name: name || email.split('@')[0],
              phone: null,
              wants_notifications: true,
              wants_rsvp_updates: false,
              google_avatar_url: data.user.user_metadata?.avatar_url || null
            })
          
          if (profileError) {
            console.error('Profile creation error:', profileError)
          }
        }
        
        setMessage('Check your email for verification link!')
      }
      
    } catch (error: Error | any) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }
  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`
        }
      })
      if (error) throw error
    } catch (error: Error | any) {
      setMessage(error.message)
      setLoading(false)
    }
  }

  const fieldCls = "w-full h-[50px] px-3.5 rounded-xl border border-brand-border bg-[var(--input-bg)] text-foreground placeholder-foreground/40 text-[15px] focus:border-brand-gold focus:outline-none transition-colors"

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div
        className="pk-sheet w-full max-w-md rounded-t-3xl sm:rounded-2xl px-6 pt-6 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:pb-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <PkMark height={40} />
            <div>
              <h2 className="font-display text-2xl font-semibold uppercase tracking-[0.06em] leading-none">
                {isLogin ? 'Log in' : 'Sign up'}
              </h2>
              <p className="mt-1.5 text-xs text-foreground/60">{isLogin ? 'Welcome back to the kitchen.' : 'Join the crew · 加入匹克廚房'}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 -m-2 rounded-full text-foreground/60 hover:text-foreground hover:bg-surface-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-3.5">
          {!isLogin && (
            <label className="block text-xs font-bold text-foreground/75">
              Name
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className={`${fieldCls} mt-1.5`} required />
            </label>
          )}

          <label className="block text-xs font-bold text-foreground/75">
            Email
            <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`${fieldCls} mt-1.5`} required />
          </label>

          <label className="block text-xs font-bold text-foreground/75">
            Password
            <input type="password" autoComplete={isLogin ? 'current-password' : 'new-password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${fieldCls} mt-1.5`} required />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] mt-1 bg-brand-primary text-white rounded-xl font-display uppercase tracking-[0.16em] text-[15px] font-semibold hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? 'Loading…' : (isLogin ? 'Log in' : 'Sign up')}
          </button>

          <div className="flex items-center gap-3 py-1">
            <span className="flex-1 h-px bg-brand-border" />
            <span className="text-[11px] font-bold tracking-[0.16em] text-foreground/50">OR</span>
            <span className="flex-1 h-px bg-brand-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full h-[52px] rounded-xl border border-foreground/25 text-foreground font-semibold text-[15px] hover:bg-surface-2 disabled:opacity-50 transition-colors flex items-center justify-center gap-2.5"
          >
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </form>

        {message && (
          <p className={`mt-4 text-sm font-medium ${message.includes('successfully') || message.includes('Check your email') ? 'text-go-ink' : 'text-[#E5484D]'}`}>
            {message}
          </p>
        )}

        <p className="mt-5 text-center text-sm text-foreground/70">
          {isLogin ? 'New to the crew? ' : 'Already have an account? '}
          <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-gold-ink hover:underline">
            {isLogin ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  )
}
