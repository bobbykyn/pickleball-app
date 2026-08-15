/**
 * Single source of truth for the app's public URL.
 *
 * Used in outgoing emails and share links, where a relative URL is no use —
 * the recipient is reading it outside the app.
 *
 * The fallback is the original vercel.app address, so links keep working
 * until app.pickle-kitchen.com has DNS and a certificate. To cut over, set
 * NEXT_PUBLIC_APP_URL in the Vercel project and redeploy — no code change.
 */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || 'https://pickleball-app-1.vercel.app'
