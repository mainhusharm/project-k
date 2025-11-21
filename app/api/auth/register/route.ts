import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { createToken } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
})

export async function POST(req: NextRequest) {
  console.log('=== REGISTER API ROUTE ENTRY ===')

  try {
    // Validate environment variables first
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase URL' },
        { status: 500 }
      )
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase keys')
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase keys' },
        { status: 500 }
      )
    }

    console.log('Environment check passed')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Has Anon Key:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    console.log('Has Service Role:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Parse request body
    let body
    try {
      body = await req.json()
      console.log('Request body parsed:', { email: body.email, name: body.name })
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError)
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Validate schema
    let validatedData
    try {
      validatedData = registerSchema.parse(body)
      console.log('Schema validation passed')
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation error:', validationError.errors)
        return NextResponse.json(
          { error: validationError.errors[0].message },
          { status: 400 }
        )
      }
      throw validationError
    }

    const { email, password, name } = validatedData

    // Create Supabase client
    let supabase
    try {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      console.log('Supabase client created')
    } catch (clientError) {
      console.error('Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { error: 'Failed to connect to database', details: clientError instanceof Error ? clientError.message : 'Unknown' },
        { status: 500 }
      )
    }

    // Hash password
    let hashedPassword
    try {
      hashedPassword = await bcrypt.hash(password, 10)
      console.log('Password hashed successfully')
    } catch (hashError) {
      console.error('Failed to hash password:', hashError)
      return NextResponse.json(
        { error: 'Failed to process password', details: hashError instanceof Error ? hashError.message : 'Unknown' },
        { status: 500 }
      )
    }

    // Check if user already exists
    console.log('Checking for existing user...')
    let existingUser
    try {
      const { data, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle()

      if (checkError) {
        console.error('Error checking existing user:', checkError)
        return NextResponse.json(
          { error: 'Database error', details: checkError.message, code: checkError.code },
          { status: 500 }
        )
      }

      existingUser = data
      console.log('Existing user check complete:', !!existingUser)
    } catch (queryError) {
      console.error('Unexpected error checking user:', queryError)
      return NextResponse.json(
        { error: 'Failed to check existing user', details: queryError instanceof Error ? queryError.message : 'Unknown' },
        { status: 500 }
      )
    }

    if (existingUser) {
      console.log('User already exists')
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Insert new user
    console.log('Inserting new user...')
    let user
    try {
      const { data, error: insertError } = await supabase
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

      if (insertError) {
        console.error('Error inserting user:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code
        })
        return NextResponse.json(
          { error: insertError.message || 'Failed to create user', details: insertError.details || insertError.hint, code: insertError.code },
          { status: 500 }
        )
      }

      user = data
      console.log('User created successfully:', { id: user.id, email: user.email })
    } catch (insertQueryError) {
      console.error('Unexpected error inserting user:', insertQueryError)
      return NextResponse.json(
        { error: 'Failed to create user', details: insertQueryError instanceof Error ? insertQueryError.message : 'Unknown' },
        { status: 500 }
      )
    }

    // Create JWT token
    console.log('Creating JWT token for user:', user.id)
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

    // Create response with cookie
    console.log('Setting authentication cookie')
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    console.log('Registration successful!')
    return response

  } catch (error) {
    console.error('UNHANDLED ERROR IN REGISTRATION:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      },
      { status: 500 }
    )
  }
}
