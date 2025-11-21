'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/format'
import { Activity, TrendingUp, Trophy } from 'lucide-react'

interface UserChallenge {
  id: string
  status: string
  current_balance: number
  challenge: {
    name: string
  }
  trades: Array<{
    status: string
    pnl: number
  }>
}

export default function DashboardPage() {
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/user-challenges')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setUserChallenges(data)
          } else {
            console.error('Invalid data format:', data)
            setUserChallenges([])
          }
        } else {
          console.error('Failed to fetch challenges:', res.status)
          setUserChallenges([])
        }
      } catch (error) {
        console.error('Failed to load challenges:', error)
        setUserChallenges([])
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const activeChallenges = userChallenges.filter(uc => uc.status === 'ACTIVE')

  const totalPnL = userChallenges.reduce((sum, uc) => {
    const challengePnL = uc.trades
      ?.filter(t => t.status === 'CLOSED')
      .reduce((s, t) => s + (t.pnl || 0), 0) || 0
    return sum + challengePnL
  }, 0)

  const totalTrades = userChallenges.reduce((sum, uc) => {
    return sum + (uc.trades?.length || 0)
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome back</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Active Challenges
            </CardTitle>
            <Trophy className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{activeChallenges.length}</p>
            <p className="text-xs text-slate-500 mt-1">
              {userChallenges.length} total challenges
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total P&L
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPnL)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              All time performance
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Trades
            </CardTitle>
            <Activity className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{totalTrades}</p>
            <p className="text-xs text-slate-500 mt-1">
              Across all challenges
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activeChallenges.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No active challenges</p>
              <p className="text-slate-500 text-sm mt-1">
                Purchase a challenge to get started trading
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeChallenges.map((uc) => {
                const trades = uc.trades || []
                const closedTrades = trades.filter(t => t.status === 'CLOSED')
                const pnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

                return (
                  <div key={uc.id} className="flex justify-between items-center border-b pb-4 last:border-0">
                    <div>
                      <p className="font-semibold text-slate-900">{uc.challenge.name}</p>
                      <p className="text-sm text-slate-600">
                        {trades.length} trades • {closedTrades.length} closed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(uc.current_balance)}
                      </p>
                      <p className={`text-sm ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
