'use client'

import React, { useState } from 'react'
import Header from './components/Header'
import TokenCreator from './components/TokenCreator'
import PoolCreator from './components/PoolCreator'
import SwapInterface from './components/SwapInterface'
import StatsOverview from './components/StatsOverview'
import { Coins, Droplets, ArrowRightLeft, BarChart3 } from 'lucide-react'

type Tab = 'create' | 'pool' | 'swap' | 'stats'

export default function Home() {
    const [activeTab, setActiveTab] = useState<Tab>('create')

    const tabs = [
        {
            id: 'create' as Tab,
            label: 'Create Token',
            icon: Coins,
            description: 'Create Token-2022 with Transfer Hooks'
        },
        {
            id: 'pool' as Tab,
            label: 'Create Pool',
            icon: Droplets,
            description: 'Initialize liquidity pools'
        },
        {
            id: 'swap' as Tab,
            label: 'Swap',
            icon: ArrowRightLeft,
            description: 'Trade tokens with hook validation'
        },
        {
            id: 'stats' as Tab,
            label: 'Stats',
            icon: BarChart3,
            description: 'View trading statistics'
        }
    ]

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-7xl mx-auto">
                <Header />

                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-full px-4 py-2 mb-6">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-300">Live on Devnet</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6">
                        <span className="gradient-text">Token2022</span>
                        <br />
                        <span className="text-white">AMM Protocol</span>
                    </h1>

                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        The first AMM to support Token-2022 with Transfer Hooks. Trade RWA tokens with built-in compliance, KYC gating, and programmable transfers.
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`glass-card transition-all duration-300 hover:scale-105 ${activeTab === tab.id
                                        ? 'ring-2 ring-primary-500 bg-primary-500/10'
                                        : 'hover:bg-white/10'
                                        }`}
                                >
                                    <Icon className={`w-8 h-8 mx-auto mb-3 ${activeTab === tab.id ? 'text-primary-400' : 'text-gray-400'
                                        }`} />
                                    <h3 className="font-semibold text-white mb-1">{tab.label}</h3>
                                    <p className="text-xs text-gray-400">{tab.description}</p>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-4xl mx-auto">
                    {activeTab === 'create' && <TokenCreator />}
                    {activeTab === 'pool' && <PoolCreator />}
                    {activeTab === 'swap' && <SwapInterface />}
                    {activeTab === 'stats' && <StatsOverview />}
                </div>

                {/* Features Footer */}
                <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <div className="glass-card text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Coins className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Transfer Hooks</h3>
                        <p className="text-gray-400 text-sm">Programmable token transfers with built-in compliance and validation logic.</p>
                    </div>

                    <div className="glass-card text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Droplets className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Deep Liquidity</h3>
                        <p className="text-gray-400 text-sm">Efficient automated market making with minimal slippage and optimal pricing.</p>
                    </div>

                    <div className="glass-card text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <ArrowRightLeft className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">RWA Ready</h3>
                        <p className="text-gray-400 text-sm">Purpose-built for real-world assets with KYC, whitelisting, and regulatory features.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}