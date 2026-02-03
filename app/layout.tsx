import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'IPO Automator',
  description: 'Created with v0',
  generator: 'Basanta Shrestha',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32_1.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-31x32_1.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon-1.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
