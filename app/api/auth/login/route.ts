import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { z } from 'zod'

// Use Supabase client with service role for secure server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    console.log('=== LOGIN API CALLED ===')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('Has Service Role:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    console.log('Login attempt for:', body.email)
    const { email, password } = loginSchema.parse(body)

    console.log('Querying user from database...')
    const { data: user, error: queryError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (queryError) {
      console.error('Database query error:', queryError)
      return NextResponse.json(
        { error: 'Database error', details: queryError.message },
        { status: 500 }
      )
    }

    console.log('User found:', !!user)

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('Verifying password...')
    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      console.log('Password invalid')
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    console.log('Password valid, creating token...')
    let token
    try {
      token = await createToken(user.id)
      console.log('JWT token created successfully')
    } catch (tokenError) {
      console.error('Error creating JWT token:', tokenError)
      return NextResponse.json(
        { error: 'Failed to create authentication token', details: tokenError instanceof Error ? tokenError.message : 'Unknown' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
