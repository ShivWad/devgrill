import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

export const metadata: Metadata = {
  title: 'DevGrill — Get grilled before the real thing.',
  description:
    'A relentless AI interviewer that probes your architecture, follows up, and pushes back — so the real system design round feels easy.',
  openGraph: {
    title: 'DevGrill — Get grilled before the real thing.',
    description:
      'Practice system design against an AI that never goes easy on you.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}
