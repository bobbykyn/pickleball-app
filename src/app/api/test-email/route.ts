import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST() {
  try {
    console.log('📧 Testing email...')
    console.log('📧 API Key exists:', !!process.env.RESEND_API_KEY)
    
    const { data, error } = await resend.emails.send({
      from: 'Test <onboarding@resend.dev>',
      to: ['bobbykyn@gmail.com'],
      subject: '🧪 Email Test from Pickleball App',
      html: `
        <h1>🎯 Email Test Successful!</h1>
        <p>Your email setup is working!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
    })

    if (error) {
      console.error('📧 Resend error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('📧 Email sent successfully:', data)
    return NextResponse.json({ 
      success: true, 
      message: 'Test email sent!',
      data 
    })

  } catch (error) {
    console.error('📧 Catch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}