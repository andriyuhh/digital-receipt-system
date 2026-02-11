import React from "react"
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1a7fc1',
}

export const metadata: Metadata = {
  title: {
    default: 'HOSTech Coworking Space - Receipt System',
    template: '%s | HOSTech Receipts',
  },
  description: 'Digital receipt management system for HOSTech Coworking Space, Freetown, Sierra Leone. Issue, track, verify, and deliver receipts securely.',
  keywords: ['HOSTech', 'coworking', 'receipt', 'Freetown', 'Sierra Leone', 'digital receipt'],
  authors: [{ name: 'HOSTech Coworking Space' }],
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'HOSTech Coworking Space - Receipt System',
    description: 'Issue, track, verify, and deliver receipts securely for HOSTech Coworking Space.',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: false,
    follow: false,
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
