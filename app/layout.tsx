import React from 'react'
import './globals.css'
import { Inter } from 'next/font/google'
import { WalletProvider } from './components/WalletProvider'
import type { Metadata, Viewport } from 'next'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Token2022 AMM | Advanced DeFi Trading',
    description: 'Trade Token-2022 with Transfer Hooks on the most advanced AMM',
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" className={inter.className}>
            <body className="antialiased">
                <WalletProvider>
                    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.02%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
                        <main className="relative z-10">
                            {children}
                        </main>
                    </div>
                </WalletProvider>
            </body>
        </html >
    )
}