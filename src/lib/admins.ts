// Emails with admin privileges (manage sessions, remove users, view signups).
export const ADMIN_EMAILS = [
  'bobbykyn@gmail.com',
  'dewingpoint200@gmail.com',
]

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
