import { APP_URL } from '@/lib/config'

// Builds an iCalendar (.ics) file for one session, so a player can add it to
// Apple Calendar (iPhone opens these natively), Outlook or Google Calendar.
// Times are written in UTC, so the event lands at the right local time on any phone.

interface IcsSession {
  id: string
  title: string
  date_time: string
  duration_hours?: number | null
  location?: string | null
  courts?: string[] | null
  notes?: string | null
  profiles?: { name?: string } | null
}

const pad = (n: number) => String(n).padStart(2, '0')

function toIcsUtc(d: Date): string {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  )
}

function escapeText(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

// RFC 5545: lines longer than 75 octets must be folded.
function fold(line: string): string {
  const bytes = new TextEncoder()
  if (bytes.encode(line).length <= 75) return line
  const out: string[] = []
  let current = ''
  for (const ch of line) {
    const limit = out.length === 0 ? 75 : 74 // continuation lines start with a space
    if (bytes.encode(current + ch).length > limit) {
      out.push(current)
      current = ch
    } else {
      current += ch
    }
  }
  if (current) out.push(current)
  return out.join('\r\n ')
}

export function buildSessionIcs(session: IcsSession): string {
  const start = new Date(session.date_time)
  const hours = Number(session.duration_hours) || 1
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000)

  const courts = (session.courts || []).map((c) => c.trim()).filter(Boolean)
  const courtText = courts.length ? `Court ${courts.join('+')}` : ''
  const location = [session.location || '', courtText].filter(Boolean).join(' · ')

  const descLines = [
    courtText,
    session.profiles?.name ? `Hosted by ${session.profiles.name}` : '',
    session.notes || '',
    `Open in Pickle Kitchen: ${APP_URL}/`,
  ].filter(Boolean)

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pickle Kitchen//Sessions//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:session-${session.id}@pickle-kitchen`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeText(`🏓 ${session.title}`)}`,
    location ? `LOCATION:${escapeText(location)}` : '',
    `DESCRIPTION:${escapeText(descLines.join('\n'))}`,
    `URL:${APP_URL}/`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Pickleball in 2 hours',
    'TRIGGER:-PT2H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Public link that serves the .ics file — used by the card button, WhatsApp text and emails. */
export function calendarUrl(sessionId: string): string {
  return `${APP_URL}/cal/${sessionId}.ics`
}
