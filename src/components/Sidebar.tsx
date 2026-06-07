'use client'

import { User } from '@supabase/supabase-js'
import { X, User as UserIcon, Bell, Moon, Sun, Calendar, BarChart3, Users, Shield } from 'lucide-react'
import { isAdminEmail } from '@/lib/admins'
import { useState, useEffect } from 'react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  darkMode: boolean
  onToggleDarkMode: () => void
  onSignOut: () => void
  onOpenProfile: () => void
  onOpenHistory?: () => void
  onOpenStats?: () => void
  onOpenAllStats?: () => void
  onOpenAdmin?: () => void
}

export default function Sidebar({ 
  isOpen, 
  onClose, 
  user, 
  darkMode, 
  onToggleDarkMode, 
  onSignOut, 
  onOpenProfile,
  onOpenHistory,
  onOpenStats,
  onOpenAllStats,
  onOpenAdmin
}: SidebarProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop overlay for closing sidebar by clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed top-0 right-0 h-full w-80 shadow-2xl transform transition-transform duration-300 ease-in-out z-50 border-l ${
          darkMode 
            ? 'bg-gray-800 border-gray-700 text-white' 
            : 'bg-white border-gray-200 text-gray-900'
        } ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6 h-full flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Settings</h2>
              <button 
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-700'
                }`}
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {user && (
              <div className={`mb-8 p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user.email}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Logged in</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Dark Mode Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3">
                  {darkMode ? <Moon className="w-5 h-5 text-brand-primary" /> : <Sun className="w-5 h-5 text-amber-500" />}
                  <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Dark Mode</span>
                </div>
                <button
                  onClick={onToggleDarkMode}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-brand-primary' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle dark mode"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notifications */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center space-x-3 mb-3">
                  <Bell className={`w-5 h-5 ${darkMode ? 'text-brand-primary' : 'text-gray-500'}`} />
                  <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Notifications</span>
                </div>
                <div className="space-y-2 ml-8">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded text-brand-primary focus:ring-brand-primary" defaultChecked />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>New sessions</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded text-brand-primary focus:ring-brand-primary" defaultChecked />
                    <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>RSVP updates</span>
                  </label>
                  <label className="flex items-center space-x-2 opacity-50 cursor-not-allowed">
                    <input type="checkbox" className="rounded" disabled />
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>WhatsApp (soon)</span>
                  </label>
                </div>
              </div>

              {/* Profile Settings */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserIcon className={`w-5 h-5 ${darkMode ? 'text-brand-primary' : 'text-gray-500'}`} />
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Profile Settings</span>
                  </div>
                  <button 
                    className={`${darkMode ? 'text-brand-primary hover:text-brand-primary/80' : 'text-brand-primary hover:text-brand-primary/80'} text-sm font-medium`} 
                    onClick={onOpenProfile}
                  >
                    Edit
                  </button>
                </div>
                <p className={`text-xs mt-1 ml-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Update name, phone, preferences</p>
              </div>

              {/* Game History */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <button 
                  onClick={onOpenHistory}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Calendar className={`w-5 h-5 ${darkMode ? 'text-brand-primary' : 'text-gray-500'}`} />
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Game History</span>
                  </div>
                  <span className={`${darkMode ? 'text-brand-primary hover:text-brand-primary/80' : 'text-brand-primary hover:text-brand-primary/80'} text-sm font-medium`}>View</span>
                </button>
                <p className={`text-xs mt-1 ml-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>View past games and attendance</p>
              </div>

              {/* My Stats */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <button
                  onClick={onOpenStats}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <BarChart3 className={`w-5 h-5 ${darkMode ? 'text-brand-primary' : 'text-gray-500'}`} />
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>My Stats</span>
                  </div>
                  <span className={`${darkMode ? 'text-brand-primary hover:text-brand-primary/80' : 'text-brand-primary hover:text-brand-primary/80'} text-sm font-medium`}>View</span>
                </button>
                <p className={`text-xs mt-1 ml-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Your play history & fun stats</p>
              </div>

              {/* All Stats */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <button
                  onClick={onOpenAllStats}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <Users className={`w-5 h-5 ${darkMode ? 'text-brand-primary' : 'text-gray-500'}`} />
                    <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>All Stats</span>
                  </div>
                  <span className="text-brand-primary hover:text-brand-primary/80 text-sm font-medium">View</span>
                </button>
                <p className={`text-xs mt-1 ml-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Community totals & leaderboard</p>
              </div>

              {/* Admin — User Management (admins only) */}
              {isAdminEmail(user?.email) && (
                <div className={`p-4 rounded-lg border ${darkMode ? 'bg-gray-700/50 border-brand-primary/40' : 'bg-gray-50 border-brand-primary/30'}`}>
                  <button
                    onClick={onOpenAdmin}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Shield className="w-5 h-5 text-brand-primary" />
                      <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>User Management</span>
                    </div>
                    <span className="text-brand-primary hover:text-brand-primary/80 text-sm font-medium">Open</span>
                  </button>
                  <p className={`text-xs mt-1 ml-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>View signups & remove users (admin)</p>
                </div>
              )}
            </div>
          </div>

          <div>
            {/* Sign Out Button at Bottom */}
            <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <button
                onClick={onSignOut}
                className={`w-full flex items-center justify-center space-x-2 p-3 text-red-500 font-medium rounded-lg transition-colors ${
                  darkMode ? 'hover:bg-red-950/20' : 'hover:bg-red-50'
                }`}
              >
                <span>Sign Out</span>
              </button>
            </div>

            <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
匹克廚房 • PICKLE KITCHEN v1.0<br />
                GEAR UP. PLAY WELL. LIVE MORE.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}