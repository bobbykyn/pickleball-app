import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Need service key for bypass RLS
)

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()
    
    // Get session details
    const { data: session } = await supabase
      .from('sessions')
      .select('*, profiles:created_by(email, name)')
      .eq('id', sessionId)
      .single()
    
    // Get all users except creator
    const { data: users } = await supabase
      .from('profiles')
      .select('email, name')
      .neq('id', session.created_by)
    
    // Send emails
    for (const user of users || []) {
      await resend.emails.send({
        from: 'Pickle Time <noreply@resend.dev>', // Use resend.dev for testing
        to: user.email,
        subject: `Let's Pickle Time! @ 雞仔Pickle: ${session.title}`,
        html: `
          <h2>New session created!</h2>
          <p><strong>${session.title}</strong></p>
          <p>📅 ${new Date(session.date_time).toLocaleString()}</p>
          <p>📍 ${session.location}</p>
          <a href="https://pickleball-app-1.vercel.app">Join Now</a>
        `
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error }, { status: 500 })
  }
}