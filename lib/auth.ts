import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { supabase } from './supabase'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client for auth operations
// Uses anon key with RLS policies for security
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

export async function createToken(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
  return token
}

export async function verifyToken(token: string) {
  try {
    const verified = await jwtVerify(token, secret)
    return verified.payload as { userId: string }
  } catch {
    return null
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('token')?.value

    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const { data: user } = await supabaseAuth
      .from('users')
      .select('id, email, name, role, kyc_status')
      .eq('id', payload.userId)
      .maybeSingle()

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'ADMIN') {
    throw new Error('Forbidden')
  }
  return user
}
