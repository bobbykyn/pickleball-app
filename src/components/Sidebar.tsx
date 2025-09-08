'use client'

import { User } from '@supabase/supabase-js'
import { X, User as UserIcon, Bell, Moon, Sun, Calendar } from 'lucide-react'
import { useState, useEffect } from 'react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
}

export default function Sidebar({ isOpen, onClose, user }: SidebarProps) {
  const [darkMode, setDarkMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Fix hydration issues by only rendering after component mounts
  useEffect(() => {
    setMounted(true)
    // Load dark mode preference from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDarkMode)
  }, [])

  const toggleDarkMode = () => {
    if (!mounted) return
    const newDarkMode = !darkMode
    setDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    // Apply dark mode to document
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Settings</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          {user && (
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-teal-700 rounded-full flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.email}</p>
                  <p className="text-sm text-gray-600">Logged in</p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Options */}
          <div className="space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {darkMode ? <Moon className="w-5 h-5 text-gray-600" /> : <Sun className="w-5 h-5 text-gray-600" />}
                <span className="font-medium text-gray-900">Dark Mode</span>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  darkMode ? 'bg-teal-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notifications */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Notifications</span>
              </div>
              <div className="space-y-2 ml-8">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm text-gray-700">New sessions</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm text-gray-700">RSVP updates</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm text-gray-700">WhatsApp (coming soon)</span>
                </label>
              </div>
            </div>

            {/* Calendar View */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-600" />
                <span className="font-medium text-gray-900">Calendar View</span>
              </div>
              <p className="text-sm text-gray-600 mt-2 ml-8">Coming soon - Monthly calendar with game highlights</p>
            </div>

            {/* Profile Settings */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-5 h-5 text-gray-600" />
                  <span className="font-medium text-gray-900">Profile Settings</span>
                </div>
                <button className="text-teal-700 text-sm font-medium hover:text-teal-800">
                  Edit
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2 ml-8">Update name, phone, preferences</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Court Booker v1.0<br />
              Made for the pickleball crew 🏓
            </p>
          </div>
        </div>
      </div>
    </>
  )
}