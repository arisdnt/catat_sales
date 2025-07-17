import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Allow API routes to handle their own authentication
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return res
  }

  // Skip middleware for static files
  if (req.nextUrl.pathname.startsWith('/_next/') || 
      req.nextUrl.pathname.startsWith('/favicon.ico')) {
    return res
  }

  // For now, let the client-side handle auth redirects
  // This allows us to test login functionality without middleware interference
  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}