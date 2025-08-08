'use client'

import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Activity, Users, Zap } from 'lucide-react'

export default function StatsOverview() {
    const [stats, setStats] = useState({
        totalValueLocked: 2547831,
        volume24h: 891234,
        transactions24h: 1247,
        activeUsers: 342,
        totalPools: 23,
        hookValidations: 15623
    })

    const [recentTrades, setRecentTrades] = useState([
        { id: 1, from: 'RWA', to: 'SOL', amount: 1234.56, time: '2m ago', txHash: 'ABC...123' },
        { id: 2, from: 'SOL', to: 'RWA', amount: 0.89, time: '5m ago', txHash: 'DEF...456' },
        { id: 3, from: 'RWA', to: 'SOL', amount: 2567.12, time: '8m ago', txHash: 'GHI...789' },
        { id: 4, from: 'SOL', to: 'RWA', amount: 1.45, time: '12m ago', txHash: 'JKL...012' },
        { id: 5, from: 'RWA', to: 'SOL', amount: 789.33, time: '18m ago', txHash: 'MNO...345' },
    ])

    const [topPools, setTopPools] = useState([
        { id: 1, pair: 'RWA/SOL', tvl: 1234567, volume24h: 456789, apy: 12.5 },
        { id: 2, pair: 'USDC/SOL', tvl: 987654, volume24h: 234567, apy: 8.3 },
        { id: 3, pair: 'BTC/SOL', tvl: 567890, volume24h: 123456, apy: 15.7 },
    ])

    // Simulate real-time updates
    useEffect(() => {
        const interval = setInterval(() => {
            setStats(prev => ({
                ...prev,
                volume24h: prev.volume24h + Math.floor(Math.random() * 1000),
                transactions24h: prev.transactions24h + Math.floor(Math.random() * 5),
                hookValidations: prev.hookValidations + Math.floor(Math.random() * 3)
            }))
        }, 3000)

        return () => clearInterval(interval)
    }, [])

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
        return num.toString()
    }

    const formatCurrency = (num: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(num)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Protocol Statistics</h2>
                    <p className="text-gray-400">Real-time analytics and trading data</p>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="glass-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Value Locked</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(stats.totalValueLocked)}</p>
                            <p className="text-green-400 text-sm">+12.5% (24h)</p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">24h Volume</p>
                            <p className="text-2xl font-bold text-white">{formatCurrency(stats.volume24h)}</p>
                            <p className="text-blue-400 text-sm">+8.3% (24h)</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">24h Transactions</p>
                            <p className="text-2xl font-bold text-white">{formatNumber(stats.transactions24h)}</p>
                            <p className="text-purple-400 text-sm">+15.7% (24h)</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Activity className="w-6 h-6 text-purple-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Active Users</p>
                            <p className="text-2xl font-bold text-white">{stats.activeUsers}</p>
                            <p className="text-cyan-400 text-sm">+5.2% (24h)</p>
                        </div>
                        <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                            <Users className="w-6 h-6 text-cyan-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Total Pools</p>
                            <p className="text-2xl font-bold text-white">{stats.totalPools}</p>
                            <p className="text-orange-400 text-sm">+2 (24h)</p>
                        </div>
                        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-orange-400" />
                        </div>
                    </div>
                </div>

                <div className="glass-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Hook Validations</p>
                            <p className="text-2xl font-bold text-white">{formatNumber(stats.hookValidations)}</p>
                            <p className="text-pink-400 text-sm">+234 (24h)</p>
                        </div>
                        <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-pink-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Trades & Top Pools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Trades */}
                <div className="glass-card">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <Activity className="w-5 h-5 mr-2 text-blue-400" />
                        Recent Trades
                    </h3>

                    <div className="space-y-3">
                        {recentTrades.map((trade) => (
                            <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                <div className="flex items-center space-x-3">
                                    <div className="flex items-center space-x-1">
                                        <div className="w-6 h-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-white">{trade.from}</span>
                                        <span className="text-gray-400">→</span>
                                        <div className="w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full"></div>
                                        <span className="text-sm font-medium text-white">{trade.to}</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-sm font-semibold text-white">{trade.amount.toLocaleString()}</p>
                                    <p className="text-xs text-gray-400">{trade.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-4 btn-secondary text-sm">
                        View All Trades
                    </button>
                </div>

                {/* Top Pools */}
                <div className="glass-card">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                        Top Pools
                    </h3>

                    <div className="space-y-3">
                        {topPools.map((pool, index) => (
                            <div key={pool.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center space-x-2">
                                        <span className="w-6 h-6 bg-gradient-to-r from-primary-500 to-accent-500 rounded text-white text-xs flex items-center justify-center font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="font-semibold text-white">{pool.pair}</span>
                                    </div>
                                    <span className="text-sm font-semibold text-green-400">
                                        {pool.apy.toFixed(1)}% APY
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-400">TVL</p>
                                        <p className="text-white font-medium">{formatCurrency(pool.tvl)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400">24h Volume</p>
                                        <p className="text-white font-medium">{formatCurrency(pool.volume24h)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <button className="w-full mt-4 btn-secondary text-sm">
                        View All Pools
                    </button>
                </div>
            </div>

            {/* Transfer Hook Analytics */}
            <div className="glass-card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                    Transfer Hook Analytics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-1">Successful Validations</p>
                        <p className="text-2xl font-bold text-green-400">98.7%</p>
                        <p className="text-xs text-gray-500 mt-1">15,389 / 15,623 total</p>
                    </div>

                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-1">Average Validation Time</p>
                        <p className="text-2xl font-bold text-blue-400">1.2s</p>
                        <p className="text-xs text-gray-500 mt-1">-0.3s from yesterday</p>
                    </div>

                    <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
                        <p className="text-gray-400 text-sm mb-1">Compliance Score</p>
                        <p className="text-2xl font-bold text-purple-400">A+</p>
                        <p className="text-xs text-gray-500 mt-1">100% regulatory adherence</p>
                    </div>
                </div>

                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm text-green-300">
                        <strong>Hook Status:</strong> All transfer hooks are operating normally.
                        Real-time compliance validation is active for all Token-2022 transfers.
                    </p>
                </div>
            </div>
        </div>
    )
}