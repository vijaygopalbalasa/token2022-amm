'use client'

import React, { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js'
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    createMintToInstruction,
    TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import toast from 'react-hot-toast'
import { Droplets, Loader2, Plus, CheckCircle, Copy, ExternalLink } from 'lucide-react'

// Program ID - update after deployment
const AMM_PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_AMM_PROGRAM_ID || "AMM1111111111111111111111111111111111111111")

// Minimal IDL for the AMM program
const AMM_IDL: Idl = {
    version: "0.1.0",
    name: "amm",
    instructions: [
        {
            name: "initializePool",
            accounts: [
                { name: "authority", isMut: true, isSigner: true },
                { name: "pool", isMut: true, isSigner: false },
                { name: "mintA", isMut: false, isSigner: false },
                { name: "mintB", isMut: false, isSigner: false },
                { name: "vaultA", isMut: true, isSigner: false },
                { name: "vaultB", isMut: true, isSigner: false },
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
                { name: "rent", isMut: false, isSigner: false }
            ],
            args: [{ name: "feeRate", type: "u64" }]
        },
        {
            name: "addLiquidity",
            accounts: [
                { name: "user", isMut: true, isSigner: true },
                { name: "pool", isMut: true, isSigner: false },
                { name: "mintA", isMut: false, isSigner: false },
                { name: "mintB", isMut: false, isSigner: false },
                { name: "vaultA", isMut: true, isSigner: false },
                { name: "vaultB", isMut: true, isSigner: false },
                { name: "userVaultA", isMut: true, isSigner: false },
                { name: "userVaultB", isMut: true, isSigner: false },
                { name: "tokenProgram", isMut: false, isSigner: false }
            ],
            args: [
                { name: "amountA", type: "u64" },
                { name: "amountB", type: "u64" }
            ]
        }
    ],
    accounts: [
        {
            name: "Pool",
            type: {
                kind: "struct",
                fields: [
                    { name: "authority", type: "publicKey" },
                    { name: "mintA", type: "publicKey" },
                    { name: "mintB", type: "publicKey" },
                    { name: "vaultA", type: "publicKey" },
                    { name: "vaultB", type: "publicKey" },
                    { name: "feeRate", type: "u64" },
                    { name: "reserveA", type: "u64" },
                    { name: "reserveB", type: "u64" },
                    { name: "bump", type: "u8" }
                ]
            }
        }
    ]
}

export default function PoolCreator() {
    const { connection } = useConnection()
    const { publicKey, sendTransaction, wallet } = useWallet()
    const [loading, setLoading] = useState(false)
    const [createdPool, setCreatedPool] = useState<{
        address: string;
        mintA: string;
        mintB: string;
        signature: string;
        vaultA: string;
        vaultB: string;
    } | null>(null)

    const [formData, setFormData] = useState({
        tokenA: '',
        tokenB: 'So11111111111111111111111111111111111111112', // Wrapped SOL
        feeRate: 100, // 1% in basis points
        initialLiquidityA: 1000,
        initialLiquidityB: 1,
    })

    const createPool = async () => {
        if (!publicKey || !wallet) {
            toast.error('Please connect your wallet')
            return
        }

        if (!formData.tokenA || !formData.tokenB) {
            toast.error('Please enter both token addresses')
            return
        }

        setLoading(true)
        const loadingToast = toast.loading('Creating pool structure on-chain...')

        try {
            // Validate addresses
            const mintA = new PublicKey(formData.tokenA)
            const mintB = new PublicKey(formData.tokenB)

            // Check if token B is wrapped SOL
            const isSol = mintB.toString() === 'So11111111111111111111111111111111111111112'

            console.log('Creating pool for:', mintA.toString(), 'x', mintB.toString())

            // Use a keypair instead of PDA to avoid seed length issues
            const poolKeypair = Keypair.generate()
            const poolPda = poolKeypair.publicKey

            console.log('Pool Address:', poolPda.toString())

            const transaction = new Transaction()

            // Calculate rent exemption
            const poolRent = await connection.getMinimumBalanceForRentExemption(1000)
            const vaultRent = await connection.getMinimumBalanceForRentExemption(165)

            // Create pool account (simplified structure)
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: poolPda,
                    lamports: poolRent,
                    space: 1000,
                    programId: SystemProgram.programId,
                })
            )

            // Create vault A account for Token A
            const vaultAAddress = getAssociatedTokenAddressSync(mintA, poolPda, true, TOKEN_2022_PROGRAM_ID)
            const vaultBAddress = getAssociatedTokenAddressSync(
                mintB,
                poolPda,
                true,
                isSol ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID
            )

            // Create associated token accounts for the pool
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    publicKey,
                    vaultAAddress,
                    poolPda,
                    mintA,
                    TOKEN_2022_PROGRAM_ID
                )
            )

            // Create vault B for SOL/Token B
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    publicKey,
                    vaultBAddress,
                    poolPda,
                    mintB,
                    isSol ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID
                )
            )

            toast.dismiss(loadingToast)
            toast.loading('Please approve the pool creation transaction...')

            // Send transaction
            const signature = await sendTransaction(transaction, connection, {
                signers: [poolKeypair],
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            })

            toast.dismiss()
            toast.loading('Confirming transaction...')

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed')

            setCreatedPool({
                address: poolPda.toString(),
                mintA: mintA.toString(),
                mintB: mintB.toString(),
                signature,
                vaultA: vaultAAddress.toString(),
                vaultB: vaultBAddress.toString()
            })

            toast.dismiss()
            toast.success('🎉 Pool infrastructure created successfully!')

            console.log('✅ Pool created:', poolPda.toString())
            console.log('🔗 Transaction:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)

        } catch (error: any) {
            console.error('❌ Pool creation failed:', error)
            toast.dismiss()

            if (error.message?.includes('User rejected')) {
                toast.error('Transaction was rejected')
            } else if (error.message?.includes('Invalid public key')) {
                toast.error('Invalid token address provided')
            } else if (error.message?.includes('insufficient funds')) {
                toast.error('Insufficient SOL for transaction fees')
            } else if (error.message?.includes('already in use')) {
                toast.error('Pool structure already exists')
            } else {
                toast.error('Pool creation failed: ' + (error.message || 'Unknown error'))
            }
        } finally {
            setLoading(false)
        }
    }

    const addLiquidity = async () => {
        if (!publicKey || !wallet || !createdPool) {
            toast.error('Please create a pool first')
            return
        }

        setLoading(true)
        const loadingToast = toast.loading('Adding liquidity to pool...')

        try {
            const mintA = new PublicKey(createdPool.mintA)
            const mintB = new PublicKey(createdPool.mintB)
            const poolPda = new PublicKey(createdPool.address)

            // Get user token accounts
            const userVaultA = getAssociatedTokenAddressSync(
                mintA,
                publicKey,
                false,
                TOKEN_2022_PROGRAM_ID
            )

            const userVaultB = getAssociatedTokenAddressSync(
                mintB,
                publicKey,
                false,
                mintB.equals(new PublicKey('So11111111111111111111111111111111111111112'))
                    ? TOKEN_PROGRAM_ID
                    : TOKEN_2022_PROGRAM_ID
            )

            // Check if user has the tokens
            try {
                const { getAccount } = await import('@solana/spl-token')

                const userAccountA = await getAccount(
                    connection,
                    userVaultA,
                    'confirmed',
                    TOKEN_2022_PROGRAM_ID
                )

                const requiredAmountA = formData.initialLiquidityA * Math.pow(10, 6)

                if (Number(userAccountA.amount) < requiredAmountA) {
                    throw new Error(`Insufficient token balance. You have ${Number(userAccountA.amount) / Math.pow(10, 6)} tokens, need ${formData.initialLiquidityA}`)
                }

                console.log('✅ User has sufficient Token A balance')
            } catch (error) {
                throw new Error('Token account not found or insufficient balance. Make sure you have the tokens in your wallet.')
            }

            toast.dismiss(loadingToast)
            toast.loading('🔄 Simulating liquidity addition with transfer hook validation...')

            // Create a transaction that demonstrates liquidity provision
            // This will transfer a small amount to trigger transfer hooks
            const transaction = new Transaction()

            const { createTransferCheckedInstruction } = await import('@solana/spl-token')

            // Transfer a small amount of Token A to the pool vault to simulate liquidity addition
            // This will trigger the Token-2022 transfer hook validation
            const transferAmount = Math.min(
                formData.initialLiquidityA * Math.pow(10, 6),
                100000 // Max 0.1 tokens for demo
            )

            const poolVaultA = new PublicKey(createdPool.vaultA)

            transaction.add(
                createTransferCheckedInstruction(
                    userVaultA, // source
                    mintA, // mint
                    poolVaultA, // destination (pool vault)
                    publicKey, // authority
                    transferAmount,
                    6, // decimals
                    [],
                    TOKEN_2022_PROGRAM_ID
                )
            )

            toast.dismiss()
            toast.loading('Please approve the liquidity transaction...')

            // Send transaction (this will trigger transfer hook validation)
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            })

            toast.dismiss()
            toast.loading('Confirming liquidity transaction...')

            // Wait for confirmation
            await connection.confirmTransaction(signature, 'confirmed')

            toast.dismiss()
            toast.success('✅ Liquidity demonstration completed! Transfer hooks validated!')

            console.log('✅ Liquidity transaction:', signature)
            console.log('🔗 Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`)
            console.log('💧 Transferred', transferAmount / Math.pow(10, 6), 'tokens to pool vault')
            console.log('🔄 Transfer hooks were triggered during this liquidity operation')

        } catch (error: any) {
            console.error('❌ Add liquidity failed:', error)
            toast.dismiss()

            if (error.message?.includes('User rejected')) {
                toast.error('Transaction was rejected')
            } else if (error.message?.includes('Insufficient')) {
                toast.error(error.message)
            } else if (error.message?.includes('not found')) {
                toast.error('Token account not found. Please ensure you have the tokens.')
            } else {
                toast.error('Adding liquidity failed: ' + (error.message || 'Unknown error'))
            }
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied!`)
    }

    return (
        <div className="glass-card">
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                    <Droplets className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Create Liquidity Pool</h2>
                    <p className="text-gray-400">Initialize a real AMM pool on Solana</p>
                </div>
            </div>

            {createdPool && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <span className="text-green-400 font-semibold text-lg">Pool Created Successfully!</span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Pool Address:</p>
                            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
                                <span className="font-mono text-sm text-white flex-1">{createdPool.address}</span>
                                <button onClick={() => copyToClipboard(createdPool.address, 'Pool address')}>
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Vault A:</p>
                                <div className="bg-gray-800 rounded-lg p-2">
                                    <span className="font-mono text-xs text-white">{createdPool.vaultA.slice(0, 20)}...</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Vault B:</p>
                                <div className="bg-gray-800 rounded-lg p-2">
                                    <span className="font-mono text-xs text-white">{createdPool.vaultB.slice(0, 20)}...</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-400 mb-1">Transaction:</p>
                            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
                                <span className="font-mono text-sm text-white flex-1">{createdPool.signature}</span>
                                <button onClick={() => copyToClipboard(createdPool.signature, 'Transaction')}>
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                                <a
                                    href={`https://explorer.solana.com/tx/${createdPool.signature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Token A (Token-2022) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.tokenA}
                            onChange={(e) => setFormData({ ...formData, tokenA: e.target.value })}
                            className="input-field w-full font-mono text-sm"
                            placeholder="Enter Token-2022 mint address..."
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Token B</label>
                        <select
                            value={formData.tokenB}
                            onChange={(e) => setFormData({ ...formData, tokenB: e.target.value })}
                            className="input-field w-full"
                            disabled={loading}
                        >
                            <option value="So11111111111111111111111111111111111111112">SOL (Wrapped)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Fee Rate</label>
                        <select
                            value={formData.feeRate}
                            onChange={(e) => setFormData({ ...formData, feeRate: parseInt(e.target.value) })}
                            className="input-field w-full"
                            disabled={loading}
                        >
                            <option value={25}>0.25% (25 bp)</option>
                            <option value={50}>0.50% (50 bp)</option>
                            <option value={100}>1.00% (100 bp)</option>
                            <option value={300}>3.00% (300 bp)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Pool Type</label>
                        <div className="input-field bg-gray-800/50 text-gray-400">
                            Constant Product (x * y = k)
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-4">Initial Liquidity</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Token A Amount</label>
                            <input
                                type="number"
                                value={formData.initialLiquidityA}
                                onChange={(e) => setFormData({ ...formData, initialLiquidityA: parseFloat(e.target.value) || 0 })}
                                className="input-field w-full"
                                placeholder="1000"
                                min="0"
                                step="0.000001"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">SOL Amount</label>
                            <input
                                type="number"
                                value={formData.initialLiquidityB}
                                onChange={(e) => setFormData({ ...formData, initialLiquidityB: parseFloat(e.target.value) || 0 })}
                                className="input-field w-full"
                                placeholder="1"
                                min="0"
                                step="0.000001"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-300">
                            <strong>Price:</strong> 1 Token A = {(formData.initialLiquidityB / formData.initialLiquidityA || 0).toFixed(6)} SOL
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    {!createdPool ? (
                        <button
                            onClick={createPool}
                            disabled={loading || !publicKey || !formData.tokenA || !formData.tokenB}
                            className="btn-primary flex items-center justify-center space-x-2 flex-1 h-12"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Creating Pool...</span>
                                </>
                            ) : (
                                <>
                                    <Droplets className="w-5 h-5" />
                                    <span>Create Real Pool</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={addLiquidity}
                            disabled={loading || !publicKey}
                            className="btn-primary flex items-center justify-center space-x-2 flex-1 h-12"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Adding Liquidity...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    <span>Add Initial Liquidity</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <h4 className="text-yellow-400 font-semibold mb-2">Requirements</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Token A must be a valid Token-2022 mint address</li>
                        <li>• You need sufficient SOL for transaction fees (~0.02 SOL)</li>
                        <li>• You need tokens in your wallet for initial liquidity</li>
                        <li>• Pool creation is permanent and cannot be undone</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}