import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { z } from 'zod'



// Create a Supabase client for user registration
// Using anon key since we have RLS policy allowing registration
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name } = registerSchema.parse(body)

    console.log('Attempting to create new user:', { email, name })

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const { data: user, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        name,
        role: 'TRADER',
        kyc_status: 'PENDING',
      })
      .select('id, email, name, role')
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to create user', details: error.details || error.hint },
        { status: 500 }
      )
    }

    console.log('User created successfully:', user)

    // Create JWT token and log the user in
    const token = await createToken(user.id)

    const response = NextResponse.json({ user })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Unexpected error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}
