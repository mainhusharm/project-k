import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Handle mock accounts (immediate fallback)
  if (params.id.startsWith('MOCK-')) {
    return NextResponse.json({
      balance: 10000,
      equity: 10000,
      margin: 0,
      free_margin: 10000,
      margin_level: 0,
      leverage: 100,
      currency: 'USD'
    })
  }

  try {
    const user = await requireAuth()

    const { data: userChallenge } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!userChallenge) {
      return NextResponse.json(
        { error: 'User challenge not found' },
        { status: 404 }
      )
    }

    const { data: account } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_challenge_id', params.id)
      .maybeSingle()

    if (!account) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      )
    }

    const { data: positions } = await supabase
      .from('positions')
      .select('*')
      .eq('trading_account_id', account.id)
      .order('open_time', { ascending: false })

    return NextResponse.json({
      balance: account.balance,
      equity: account.equity,
      margin: account.margin,
      free_margin: account.free_margin,
      margin_level: account.margin_level,
      leverage: account.leverage,
      currency: account.currency
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
}
