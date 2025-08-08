'use client'

import React from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Zap, Coins, Droplets } from 'lucide-react'

export default function Header() {
    return (
        <header className="glass-card mb-8 sticky top-4 z-50">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center animate-glow">
                            <Zap className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold gradient-text">Token2022 AMM</h1>
                        <p className="text-xs text-gray-400">Advanced DeFi Trading</p>
                    </div>
                </div>

                <nav className="hidden md:flex items-center space-x-6">
                    <div className="flex items-center space-x-1 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer">
                        <Coins className="w-4 h-4" />
                        <span>Create Token</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer">
                        <Droplets className="w-4 h-4" />
                        <span>Liquidity</span>
                    </div>
                    <div className="text-sm text-gray-300 hover:text-white transition-colors cursor-pointer">
                        Swap
                    </div>
                </nav>

                <div className="wallet-adapter-button-trigger">
                    <WalletMultiButton className="!bg-gradient-to-r !from-primary-500 !to-accent-500 hover:!from-primary-600 hover:!to-accent-600 !rounded-lg !font-semibold !transition-all !duration-200 !transform hover:!scale-105" />
                </div>
            </div>
        </header>
    )
}