'use client'

import { LayoutGrid, Plus, X } from 'lucide-react'

interface CourtPickerProps {
  courts: string[]
  onChange: (courts: string[]) => void
  multiple: boolean
  onMultipleChange: (multiple: boolean) => void
}

/**
 * Court number entry, shared by the create and edit session modals.
 * Single input by default; ticking "Multiple courts" lets the creator add more.
 */
export default function CourtPicker({ courts, onChange, multiple, onMultipleChange }: CourtPickerProps) {
  // Always render at least one field so there is something to type into.
  const rows = courts.length > 0 ? courts : ['']

  // Blank rows are kept while editing; they're stripped on save and on display.
  const setAt = (i: number, value: string) => {
    const next = [...rows]
    next[i] = value
    onChange(next)
  }

  const addRow = () => onChange([...rows, ''])

  const removeAt = (i: number) => onChange(rows.filter((_, idx) => idx !== i))

  const toggleMultiple = (checked: boolean) => {
    onMultipleChange(checked)
    // Collapsing back to a single court keeps only the first entry.
    if (!checked) onChange(rows.slice(0, 1).filter(c => c.trim() !== ''))
  }

  const inputClass =
    'w-full p-3 border rounded-lg text-gray-900 placeholder-gray-400 border-gray-300 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary'

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        <LayoutGrid className="w-4 h-4 inline mr-1" />
        Court <span className="font-normal text-gray-400">(optional)</span>
      </label>

      <div className="space-y-2">
        {rows.map((court, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={court}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder={multiple ? `Court ${i + 1}` : 'e.g. 1'}
              className={inputClass}
            />
            {multiple && rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                aria-label={`Remove court ${i + 1}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {multiple && (
        <button
          type="button"
          onClick={addRow}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:underline"
        >
          <Plus className="w-4 h-4" />
          Add another court
        </button>
      )}

      <div className="flex items-center space-x-2 mt-2">
        <input
          type="checkbox"
          id="multipleCourts"
          checked={multiple}
          onChange={(e) => toggleMultiple(e.target.checked)}
          className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
        />
        <label htmlFor="multipleCourts" className="text-sm font-medium text-gray-700">
          Multiple courts
        </label>
      </div>
    </div>
  )
}

/** " - [Court 1]" / " - [Court 1+2]" — appended to auto-generated titles. */
export function formatCourts(courts: string[] | undefined | null) {
  const clean = (courts || []).map(c => c.trim()).filter(Boolean)
  if (clean.length === 0) return ''
  return ` - [Court ${clean.join('+')}]`
}
