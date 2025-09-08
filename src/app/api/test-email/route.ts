import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST() {
  try {
    const { error } = await resend.emails.send({
      from: 'Test <onboarding@resend.dev>',
      to: ['bobbykyn@gmail.com'],
      subject: '🧪 Email Test',
      html: '<h1>Test successful!</h1>',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}