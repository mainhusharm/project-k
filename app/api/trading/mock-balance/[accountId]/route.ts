import { NextRequest, NextResponse } from 'next/server'
import { getAccumulatedBalance } from '@/lib/mock-positions'

export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const balance = getAccumulatedBalance(params.accountId)
    return NextResponse.json({ balance })
  } catch (error) {
    console.error('Failed to get mock balance:', error)
    return NextResponse.json({ balance: 10000 })
  }
}
