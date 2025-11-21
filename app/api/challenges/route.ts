import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: challenges, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .order('account_size', { ascending: true })

    if (error) throw error

    return NextResponse.json(challenges || [])
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch challenges' },
      { status: 500 }
    )
  }
}
