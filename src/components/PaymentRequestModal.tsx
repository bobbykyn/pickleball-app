'use client'

import { useState, useMemo } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { format } from 'date-fns'
import { Session } from '@/types'

interface PaymentRequestModalProps {
  isOpen: boolean
  onClose: () => void
  darkMode: boolean
  session: Session | null
  defaultLink?: string
  onShared?: () => void
}

interface Payer {
  id: string
  label: string
  amount: string
}

export default function PaymentRequestModal({ isOpen, onClose, darkMode, session, defaultLink, onShared }: PaymentRequestModalProps) {
  const [link, setLink] = useState('')
  const [bulk, setBulk] = useState('')
  const [payers, setPayers] = useState<Payer[]>([])
  const [copied, setCopied] = useState(false)
  const [initialised, setInitialised] = useState<string | null>(null)

  // Suggested per-head amount from the stored cost, if any
  const suggestion = useMemo(() => {
    const yes = session?.rsvps?.filter((r) => r.status === 'yes') || []
    const heads = yes.reduce((n, r) => n + 1 + (r.guest_count || 0), 0)
    const total = (session as any)?.total_cost || 0
    return total && heads ? String(Math.ceil(total / heads)) : ''
  }, [session])

  const buildPayers = (s: Session, amt: string): Payer[] => {
    const rows: Payer[] = []
    const yes = s.rsvps?.filter((r) => r.status === 'yes') || []
    for (const r of yes) {
      rows.push({ id: `u-${r.id}`, label: r.profiles?.name || 'Player', amount: amt })
      const names = r.guest_names || []
      names.forEach((g, i) => rows.push({ id: `g-${r.id}-${i}`, label: `${g} (guest)`, amount: amt }))
      const unnamed = Math.max(0, (r.guest_count || 0) - names.length)
      for (let i = 0; i < unnamed; i++) {
        rows.push({ id: `gu-${r.id}-${i}`, label: `${r.profiles?.name || 'Player'}'s guest`, amount: amt })
      }
    }
    return rows
  }

  // Initialise once per session opening
  if (isOpen && session && initialised !== session.id) {
    setLink(defaultLink || '')
    setBulk(suggestion)
    setPayers(buildPayers(session, suggestion))
    setInitialised(session.id)
    setCopied(false)
  }
  if (!isOpen && initialised !== null) setInitialised(null)

  const applyBulk = (val: string) => {
    setBulk(val)
    setPayers((prev) => prev.map((p) => ({ ...p, amount: val })))
  }
  const setOne = (id: string, val: string) => {
    setPayers((prev) => prev.map((p) => (p.id === id ? { ...p, amount: val } : p)))
  }

  const total = payers.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

  const message = useMemo(() => {
    if (!session) return ''
    const dateStr = format(new Date(session.date_time), 'EEE, MMM d')
    const lines = [
      `🥒 PICKLE KITCHEN — Payment for ${session.title}`,
      `📅 ${dateStr} · 📍 ${session.location}`,
      '',
      'Thanks for playing! Please settle your share 🙏',
      link ? `👉 ${link}` : '',
      '',
      ...payers.map((p) => `• ${p.label}: ${p.amount ? '$' + p.amount : '—'}`),
    ]
    if (total > 0) lines.push(`\nTotal: $${total}`)
    return lines.filter((l) => l !== undefined).join('\n')
  }, [session, link, payers, total])

  if (!isOpen || !session) return null

  const subText = darkMode ? 'text-gray-400' : 'text-gray-500'
  const inputCls = `w-full p-3 border rounded-lg text-gray-900 placeholder-gray-500 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary`

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    onShared?.()
  }
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} rounded-lg p-6 w-full max-w-md max-h-[88vh] overflow-y-auto`}>
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-display font-bold tracking-wider text-brand-primary uppercase">Request Payment</h2>
          <button onClick={onClose} className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className={`text-xs mb-5 ${subText}`}>{session.title}</p>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>💰 Payment link</label>
            <input type="text" placeholder="Paste your PayMe / FPS link" value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} />
            {!defaultLink && <p className={`text-xs mt-1 ${subText}`}>Tip: save this in Profile Settings so it auto-fills next time.</p>}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Amount each (fills everyone)</label>
            <input type="text" inputMode="decimal" placeholder="e.g. 80" value={bulk} onChange={(e) => applyBulk(e.target.value)} className={inputCls} />
            <p className={`text-xs mt-1 ${subText}`}>Then tweak anyone who owes a different amount below.</p>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Per player</label>
            <div className="space-y-2">
              {payers.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <span className={`flex-1 text-sm truncate ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{p.label}</span>
                  <div className="flex items-center gap-1">
                    <span className={subText}>$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={p.amount}
                      onChange={(e) => setOne(p.id, e.target.value)}
                      className="w-20 p-2 border rounded-lg text-gray-900 text-right border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                </div>
              ))}
              {payers.length === 0 && <p className={`text-sm ${subText}`}>No players to bill.</p>}
            </div>
            {total > 0 && (
              <p className={`text-right text-sm font-semibold mt-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Total: ${total}</p>
            )}
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Message preview</label>
            <pre className={`text-sm whitespace-pre-wrap rounded-lg p-3 font-sans ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700 border border-gray-200'}`}>{message}</pre>
          </div>

          <div className="flex gap-2">
            <button onClick={shareWhatsApp} className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              Share to WhatsApp
            </button>
            <button onClick={copyMessage} className={`px-4 py-3 rounded-lg font-medium transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`} title="Copy message">
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
