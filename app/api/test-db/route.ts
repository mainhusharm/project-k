import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Simple test to check if we can connect to the database
    const { data, error } = await supabase.from('challenges').select('*').limit(1)

    if (error) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data })
  } catch (error) {
    return NextResponse.json(
      { error: 'Database connection failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
