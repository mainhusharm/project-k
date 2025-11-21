import { NextResponse } from 'next/server'

// Database setup is now handled by Supabase migrations
// This route is deprecated but kept for compatibility

export async function POST() {
  return NextResponse.json({
    message: 'Database is already set up via migrations',
    status: 'success'
  })
}
