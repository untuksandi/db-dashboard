import type { Metadata } from 'next'
import './globals.css'
import { Bebas_Neue, Outfit } from 'next/font/google'

const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'ASABA Project Dashboard 123',
  description: 'ASABA – Real-time Project Status Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${bebas.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  )
}
