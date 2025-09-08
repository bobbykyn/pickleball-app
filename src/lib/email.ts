import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const sendSessionCreatedEmail = async (
  recipients: string[],
  sessionData: {
    title: string
    dateTime: string
    location: string
    creatorName: string
    costPerPerson: number
    sessionUrl: string
  }
) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Pickleball Crew <onboarding@resend.dev>', // Use resend's domain for now
      to: recipients,
      subject: `🏓 New Game: ${sessionData.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0f766e; text-align: center;">🏓 New Pickleball Session!</h1>
          
          <div style="background: #f0fdfa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #134e4a; margin-top: 0;">${sessionData.title}</h2>
            
            <div style="margin: 15px 0;">
              <strong>📅 When:</strong> ${new Date(sessionData.dateTime).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            
            <div style="margin: 15px 0;">
              <strong>📍 Where:</strong> ${sessionData.location}
            </div>
            
            <div style="margin: 15px 0;">
              <strong>💰 Cost:</strong> $${sessionData.costPerPerson.toFixed(2)} per person (splits as more join!)
            </div>
            
            <div style="margin: 15px 0;">
              <strong>👤 Created by:</strong> ${sessionData.creatorName}
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${sessionData.sessionUrl}" 
               style="background: #0f766e; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Join This Session
            </a>
          </div>
          
          <p style="text-align: center; color: #6b7280; font-size: 14px;">
            Click "Join This Session" to RSVP and see who else is playing!
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Email sending error:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email service error:', error)
    return { success: false, error }
  }
}