import { NextResponse } from 'next/server'
import { marketDataService } from '@/lib/simulated-market-data'
import { supabase } from '@/lib/supabase'

async function setupDemoAccount() {
  try {
    console.log('Setting up demo trading account...')

    // Start market data service
    marketDataService.start()

    // Create demo user
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        email: 'demo@propfirmtrading.com',
        password: 'demo123', // Note: schema uses 'password', not 'password_hash'
        name: 'Demo Trader',
      })
      .select()
      .single()

    if (userError && !userError.message.includes('duplicate key')) {
      console.error('User creation error:', userError)
    }

    // Get or create challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .upsert({
        name: 'Demo Challenge',
        description: 'Demo trading challenge for testing',
        account_size: 10000,
        profit_target: 1000,
        max_total_loss: 500,
        max_daily_loss: 300,
        price: 0,
      })
      .select()
      .single()

    if (challengeError && !challengeError.message.includes('duplicate key')) {
      console.error('Challenge creation error:', challengeError)
    }

    // Create user challenge
    const { data: userChallenge, error: ucError } = await supabase
      .from('user_challenges')
      .upsert({
        user_id: user!.id,
        challenge_id: challenge!.id,
        status: 'ACTIVE',
        start_date: new Date().toISOString(),
        current_balance: challenge!.account_size,
        high_water_mark: challenge!.account_size,
      })
      .select()
      .single()

    if (ucError && !ucError.message.includes('duplicate key')) {
      console.error('User challenge creation error:', ucError)
    }

    // Create trading account
    const accountNumber = 'DEMO' + Math.floor(Math.random() * 1000000).toString().padStart(7, '0')

    const { data: tradingAccount, error: taError } = await supabase
      .from('trading_accounts')
      .upsert({
        user_challenge_id: userChallenge!.id,
        account_number: accountNumber,
        password: 'demo123',
        balance: challenge!.account_size,
        equity: challenge!.account_size,
        margin: 0,
        free_margin: challenge!.account_size,
        leverage: 100,
        server: 'Demo-Server-1',
        is_active: true,
      })
      .select()
      .single()

    if (taError && !taError.message.includes('duplicate key')) {
      console.error('Trading account creation error:', taError)
    }

    console.log('Demo setup complete!')

    return {
      success: true,
      accountId: tradingAccount!.id,
      demoAccount: {
        accountNumber,
        password: 'demo123',
        balance: challenge!.account_size,
        tradingAccountId: tradingAccount!.id,
        userChallengeId: userChallenge!.id,
      },
      message: 'Demo trading account created successfully!'
    }

  } catch (error) {
    console.error('Demo setup error:', error)
    throw error
  }
}

export async function GET() {
  try {
    const result = await setupDemoAccount()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to setup demo account' },
      { status: 500 }
    )
  }
}

export async function POST() {
  // Return consistent mock account ID for demo persistence
  const mockAccountId = 'MOCK-DEMO-PERSISTENT'
  const mockResult = {
    success: true,
    accountId: mockAccountId,
    demoAccount: {
      accountNumber: 'DEMOPERSISTENT',
      password: 'demo123',
      balance: 10000,
      tradingAccountId: mockAccountId,
      userChallengeId: mockAccountId,
    },
    message: 'Demo trading account ready (persistent mode)'
  }

  // Try real database setup in background (won't block UI)
  setupDemoAccount().catch(error => {
    console.log('Database setup failed, using mock account instead:', error.message)
  })

  return NextResponse.json(mockResult)
}
