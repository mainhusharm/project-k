import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { executeTrade } from '@/lib/trading'
import { supabase } from '@/lib/supabase'
import { z } from 'zod'

const tradeSchema = z.object({
  userChallengeId: z.string(),
  symbol: z.string(),
  side: z.enum(['BUY', 'SELL']),
  lotSize: z.number().positive(),
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
})

export async function POST(req: NextRequest) {
  try {
    await requireAuth()

    const body = await req.json()
    const data = tradeSchema.parse(body)

    const trade = await executeTrade(data.userChallengeId, data)

    return NextResponse.json({ trade })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute trade' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth()

    const searchParams = req.nextUrl.searchParams
    const userChallengeId = searchParams.get('userChallengeId')

    if (!userChallengeId) {
      return NextResponse.json(
        { error: 'userChallengeId is required' },
        { status: 400 }
      )
    }

    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_challenge_id', userChallengeId)
      .order('open_time', { ascending: false })

    if (error) throw error

    return NextResponse.json({ trades })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}
