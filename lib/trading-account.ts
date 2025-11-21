import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

export async function createTradingAccount(userChallengeId: string) {
  const { data: userChallenge } = await supabase
    .from('user_challenges')
    .select('*, challenge:challenges(*), user:users(*)')
    .eq('id', userChallengeId)
    .maybeSingle()

  if (!userChallenge) {
    throw new Error('User challenge not found')
  }

  const challenge = userChallenge.challenge as any
  const user = userChallenge.user as any

  const accountNumber = generateAccountNumber()

  const plainPassword = generatePassword()
  const hashedPassword = await bcrypt.hash(plainPassword, 10)

  const { data: tradingAccount, error } = await supabase
    .from('trading_accounts')
    .insert({
      user_challenge_id: userChallengeId,
      account_number: accountNumber,
      password: hashedPassword,
      balance: challenge.account_size,
      equity: challenge.account_size,
      free_margin: challenge.account_size,
      leverage: 100,
      server: 'PropFirm-Demo-1',
    })
    .select()
    .single()

  if (error) throw error

  console.log(`✅ Trading account created: ${accountNumber}`)
  console.log(`📧 Send credentials to: ${user.email}`)
  console.log(`🔑 Account: ${accountNumber}, Password: ${plainPassword}`)

  return {
    tradingAccount,
    credentials: {
      accountNumber,
      password: plainPassword,
      server: 'PropFirm-Demo-1',
    },
  }
}

function generateAccountNumber(): string {
  const prefix = '10'
  const randomDigits = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')
  return prefix + randomDigits
}

function generatePassword(): string {
  const length = 12
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return password
}

export async function verifyTradingAccount(
  accountNumber: string,
  password: string
) {
  const { data: account } = await supabase
    .from('trading_accounts')
    .select(`
      *,
      user_challenge:user_challenges(
        *,
        user:users(*),
        challenge:challenges(*)
      )
    `)
    .eq('account_number', accountNumber)
    .maybeSingle()

  if (!account || !account.is_active) {
    return null
  }

  const validPassword = await bcrypt.compare(password, account.password)

  if (!validPassword) {
    return null
  }

  return account
}
