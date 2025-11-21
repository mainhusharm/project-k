import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { createTradingAccount } from '@/lib/trading-account'
import { z } from 'zod'

const purchaseSchema = z.object({
  challengeId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { challengeId } = purchaseSchema.parse(body)

    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .eq('is_active', true)
      .maybeSingle()

    if (!challenge) {
      return NextResponse.json(
        { error: 'Challenge not found' },
        { status: 404 }
      )
    }

    const { data: userChallenge, error } = await supabase
      .from('user_challenges')
      .insert({
        user_id: user.id,
        challenge_id: challengeId,
        status: 'ACTIVE',
        start_date: new Date().toISOString(),
        current_balance: challenge.account_size,
        high_water_mark: challenge.account_size,
      })
      .select()
      .single()

    if (error) throw error

    const { credentials } = await createTradingAccount(userChallenge.id)

    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'CHALLENGE_PURCHASE',
        amount: challenge.price,
        status: 'COMPLETED',
        metadata: { tradingAccount: credentials },
      })

    return NextResponse.json({
      userChallenge,
      credentials,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to purchase challenge' },
      { status: 500 }
    )
  }
}
