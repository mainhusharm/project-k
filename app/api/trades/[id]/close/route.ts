import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { closeTrade } from '@/lib/trading'
import { z } from 'zod'

const closeSchema = z.object({
  exitPrice: z.number().positive(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const body = await req.json()
    const { exitPrice } = closeSchema.parse(body)

    const trade = await closeTrade(params.id, exitPrice)

    return NextResponse.json({ trade })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to close trade' },
      { status: 500 }
    )
  }
}
