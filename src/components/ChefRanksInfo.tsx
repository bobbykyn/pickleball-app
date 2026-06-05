'use client'

import { useState } from 'react'
import { X, Info } from 'lucide-react'
import { TIERS } from '@/lib/tiers'

interface ChefRanksInfoProps {
  darkMode: boolean
  /** Highlight the viewer's current tier in the list. */
  currentTierName?: string
  className?: string
}

export default function ChefRanksInfo({ darkMode, currentTierName, className = '' }: ChefRanksInfoProps) {
  const [open, setOpen] = useState(false)
  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="See all chef ranks"
        className={`${subText} hover:text-brand-primary transition-colors ${className}`}
      >
        <Info className="w-4 h-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-display font-bold uppercase tracking-wider text-brand-primary">Chef Ranks | 廚師等級</h3>
              <button onClick={() => setOpen(false)} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-xs mb-4 ${subText}`}>Climb the brigade by racking up court time.</p>
            <div className="space-y-1.5">
              {TIERS.map((t, i) => ({ t, i })).reverse().map(({ t, i }) => {
                const current = t.name === currentTierName
                const next = TIERS[i + 1]
                const range = next ? `${t.minHours}–${next.minHours}h` : `${t.minHours}h+`
                return (
                  <div
                    key={t.name}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}
                    style={current ? { boxShadow: `inset 0 0 0 1px ${t.color}` } : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight" style={{ color: t.color }}>
                        {t.name} · {t.zh}{current ? ' · you' : ''}
                      </p>
                      <p className={`text-[11px] ${subText} truncate`}>{t.sub}</p>
                    </div>
                    <span className={`text-xs font-display font-bold whitespace-nowrap ${subText}`}>{range}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
