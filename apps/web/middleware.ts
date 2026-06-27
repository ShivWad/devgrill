import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/pricing',
  '/why',
  '/interview',
  '/technical',
  '/api/webhooks/clerk',
  '/api/waitlist',
  '/api/interview/invoke',
  '/api/interview/resume',
  '/api/interview/state/(.*)',
  '/api/interview/auto-candidate',
  '/api/technical-interview/invoke',
  '/api/technical-interview/resume',
  '/api/technical-interview/state/(.*)',
  '/api/technical-interview/auto-candidate',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }

  const path = req.nextUrl.pathname
  if (path === '/interview' || path === '/technical') {
    const res = NextResponse.next()
    res.cookies.set('dg_last_type', path === '/technical' ? 'technical' : 'system_design', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
    return res
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
