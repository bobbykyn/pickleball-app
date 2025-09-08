import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

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
        profiles:created_by(name, email, wants_rsvp_updates),
        rsvps(
          profiles(name, email, wants_rsvp_updates)
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Get recipients: existing "yes" RSVPs + creator (if they want notifications)
    const recipients = []
    
    // Add session creator if they want RSVP updates
    if (session.profiles?.wants_rsvp_updates && session.profiles?.email) {
      recipients.push(session.profiles.email)
    }

    // Add existing "yes" RSVPs who want notifications
    session.rsvps?.forEach((rsvp: any) => {
      if (rsvp.profiles?.wants_rsvp_updates && rsvp.profiles?.email) {
        recipients.push(rsvp.profiles.email)
      }
    })

    // Remove duplicates and filter out the new member (they don't need to email themselves)
    const uniqueRecipients = [...new Set(recipients)]

    if (uniqueRecipients.length === 0) {
      return NextResponse.json({ message: 'No recipients want RSVP notifications' })
    }

    // Calculate new cost per person
    const attendeeCount = (session.rsvps?.filter((r: any) => r.status === 'yes').length || 0) + 1
    const costPerPerson = (session.total_cost || 0) / attendeeCount

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: 'Pickleball Crew <onboarding@resend.dev>',
      to: uniqueRecipients,
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
      console.error('Email error:', emailError)
      return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `RSVP notifications sent to ${uniqueRecipients.length} recipients` 
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}