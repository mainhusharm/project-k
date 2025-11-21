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

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    console.log('=== REGISTER API CALLED ===')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('Has Service Role:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    const body = await req.json()
    console.log('Request body received:', { email: body.email, name: body.name })

    const { email, password, name } = registerSchema.parse(body)
    console.log('Attempting to create new user:', { email, name })

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if user already exists
    console.log('Checking for existing user...')
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing user:', checkError)
    }

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
      console.error('Error creating user:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      return NextResponse.json(
        { error: error.message || 'Failed to create user', details: error.details || error.hint, code: error.code },
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
