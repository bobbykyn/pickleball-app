import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { sessionId, newMemberName, rsvpStatus } = await request.json()

    if (rsvpStatus !== 'yes') {
      return NextResponse.json({ message: 'Only sending notifications for confirmed joins' })
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select(`
        *,
        profiles:created_by(name, wants_rsvp_updates),
        rsvps(
          profiles(name, wants_rsvp_updates)
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    console.log('DEBUG - Session data:', {
      title: session.title,
      created_by: session.created_by,
      rsvps: session.rsvps,
      creator_profile: session.profiles
    })

    // Get recipients: existing "yes" RSVPs + creator (if they want notifications)
    const recipients = []
    
    // Helper function to get email from user ID
    const getEmailFromUserId = async (userId: string) => {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
      return authError ? null : authUser?.user?.email
    }

    // Add session creator if they want RSVP updates
    if (session.profiles?.wants_rsvp_updates) {
      const creatorEmail = await getEmailFromUserId(session.created_by)
      if (creatorEmail) {
        recipients.push(creatorEmail)
      }
    }

    // Add existing "yes" RSVPs who want notifications
    for (const rsvp of session.rsvps || []) {
      if (rsvp.status === 'yes' && rsvp.profiles?.wants_rsvp_updates) {
        const rsvpEmail = await getEmailFromUserId(rsvp.user_id)
        if (rsvpEmail) {
          recipients.push(rsvpEmail)
        }
      }
    }

    // Remove duplicates and filter out the new member (they don't need to email themselves)
    const uniqueRecipients = [...new Set(recipients)]

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({ message: 'No recipients want RSVP notifications' })
    }

    // Calculate new cost per person
    const attendeeCount = (session.rsvps?.filter((r: any) => r.status === 'yes').length || 0) + 1
    const costPerPerson = (session.total_cost || 0) / attendeeCount

    // Send email with rate limiting
    console.log('Sending RSVP notifications to:', uniqueRecipients)
    
    // Send emails one by one to respect rate limits
    for (let i = 0; i < uniqueRecipients.length; i++) {
      const recipient = uniqueRecipients[i]
      
      try {
        const { error: emailError } = await resend.emails.send({
          from: 'Pickleball Crew <onboarding@resend.dev>',
          to: recipient,
          subject: `🎯 ${newMemberName} joined ${session.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #0f766e; text-align: center;">🎯 Someone Joined Your Game!</h1>
              
              <div style="background: #f0fdfa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h2 style="color: #134e4a; margin-top: 0;">${session.title}</h2>
                
                <div style="background: #dcfdf7; border-radius: 6px; padding: 15px; margin: 15px 0; border-left: 4px solid #14b8a6;">
                  <strong style="color: #0f766e;">🎉 ${newMemberName} just joined!</strong>
                </div>
                
                <div style="margin: 15px 0;">
                  <strong>📅 When:</strong> ${new Date(session.date_time).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                
                <div style="margin: 15px 0;">
                  <strong>📍 Where:</strong> ${session.location}
                </div>
                
                <div style="margin: 15px 0; font-size: 18px; color: #0f766e;">
                  <strong>💰 New Cost: $${costPerPerson.toFixed(2)} per person</strong>
                </div>
                
                <div style="margin: 15px 0;">
                  <strong>👥 Players:</strong> ${attendeeCount}/${session.max_players}
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://pickleball-app-1.vercel.app" 
                   style="background: #0f766e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  View Session
                </a>
              </div>
            </div>
          `,
        })

        if (emailError) {
          console.error('❌ Failed to send RSVP email to:', recipient, emailError)
        } else {
          console.log('✅ RSVP email sent successfully to:', recipient)
        }
      } catch (error) {
        console.error('❌ Error sending RSVP email to:', recipient, error)
      }
      
      // Add delay between emails to respect rate limits
      if (i < uniqueRecipients.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600)) // 600ms delay
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `RSVP notifications sent to ${uniqueRecipients.length} recipients` 
    })

  } catch (error) {
    console.error('API Error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}