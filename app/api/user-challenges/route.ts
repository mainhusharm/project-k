import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const user = await requireAuth()

    const { data: userChallenges, error } = await supabase
      .from('user_challenges')
      .select(`
        *,
        challenge:challenges(*),
        trades(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(userChallenges || [])
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
