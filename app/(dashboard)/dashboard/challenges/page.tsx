'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

interface Challenge {
  id: string
  name: string
  description: string
  price: number
  type: string
  account_size: number
  profit_target: number
  max_daily_loss: number
  max_total_loss: number
  trading_days: number
}

interface UserChallenge {
  id: string
  status: string
  current_balance: number
  challenge: Challenge
  created_at: string
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/challenges')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setChallenges(data)
        } else {
          console.error('Invalid challenges data:', data)
          setChallenges([])
        }
      })
      .catch((error) => {
        console.error('Failed to fetch challenges:', error)
        setChallenges([])
      })

    fetch('/api/user-challenges')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setUserChallenges(data)
        } else {
          console.error('Invalid user challenges data:', data)
          setUserChallenges([])
        }
      })
      .catch((error) => {
        console.error('Failed to fetch user challenges:', error)
        setUserChallenges([])
      })
  }, [])

  const handlePurchase = async (challengeId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/user-challenges/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Purchase failed')
      } else {
        alert('Challenge purchased successfully!')
        window.location.reload()
      }
    } catch (error) {
      alert('Purchase failed')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Clock className="h-4 w-4" />
      case 'PASSED':
        return <CheckCircle className="h-4 w-4" />
      case 'FAILED':
        return <XCircle className="h-4 w-4" />
      case 'FUNDED':
        return <TrendingUp className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-blue-100 text-blue-800'
      case 'PASSED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      case 'FUNDED':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Challenges</h1>
        <p className="text-slate-600 mt-1">Choose a challenge to start your evaluation</p>
      </div>

      {userChallenges.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900">Your Challenges</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {userChallenges.map((uc) => {
              const profit = uc.current_balance - uc.challenge.account_size
              return (
                <Card key={uc.id} className="shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{uc.challenge.name}</CardTitle>
                      <Badge className={getStatusColor(uc.status)}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(uc.status)}
                          {uc.status}
                        </span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Current Balance:</span>
                      <span className="font-semibold">{formatCurrency(uc.current_balance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Profit/Loss:</span>
                      <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Target:</span>
                      <span className="font-semibold">{formatCurrency(uc.challenge.profit_target)}</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Available Challenges</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {challenges.map((challenge) => (
            <Card key={challenge.id} className="shadow-md">
              <CardHeader>
                <CardTitle>{challenge.name}</CardTitle>
                <CardDescription>{challenge.description}</CardDescription>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(challenge.price)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Account Size:</span>
                    <span className="font-semibold">{formatCurrency(challenge.account_size)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Profit Target:</span>
                    <span className="font-semibold">{formatCurrency(challenge.profit_target)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Max Daily Loss:</span>
                    <span className="font-semibold">{formatCurrency(challenge.max_daily_loss)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Max Total Loss:</span>
                    <span className="font-semibold">{formatCurrency(challenge.max_total_loss)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Trading Days:</span>
                    <span className="font-semibold">{challenge.trading_days} days</span>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handlePurchase(challenge.id)}
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Purchase Challenge'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
