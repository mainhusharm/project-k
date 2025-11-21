'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TrendingUp, LogOut, LayoutDashboard, Trophy, LineChart, Monitor } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-slate-900">PropFirm</h1>
            </Link>
            <nav className="hidden md:flex gap-1">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/dashboard/challenges">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Challenges
                </Button>
              </Link>
              <Link href="/dashboard/trading">
                <Button variant="ghost" size="sm" className="gap-2">
                  <LineChart className="h-4 w-4" />
                  Trading
                </Button>
              </Link>
              <Link href="/dashboard/terminal">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Monitor className="h-4 w-4" />
                  Web Terminal
                </Button>
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
