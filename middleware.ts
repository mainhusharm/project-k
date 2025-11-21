import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
)

const publicPaths = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/trading/market-data', '/api/trading/chart-data', '/api/trading/orders', '/api/trading/positions', '/api/trading/trades', '/api/demo/setup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public auth routes without authentication
  if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/register')) {
    return NextResponse.next()
  }

  // Allow trading APIs without authentication for demo
  if (pathname.startsWith('/api/trading') || pathname.startsWith('/api/demo')) {
    return NextResponse.next()
  }

  // Allow test endpoints
  if (pathname.startsWith('/api/test-')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
    const token = request.cookies.get('token')?.value

    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    try {
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch (error) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
