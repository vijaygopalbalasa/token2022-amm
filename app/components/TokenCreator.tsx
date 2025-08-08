'use client'

import React, { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import {
    PublicKey,
    SystemProgram,
    Transaction,
    Keypair
} from '@solana/web3.js'
import {
    TOKEN_2022_PROGRAM_ID,
    ExtensionType,
    createInitializeMintInstruction,
    createInitializeTransferHookInstruction,
    getMintLen,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token'
import toast from 'react-hot-toast'
import { Coins, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react'
import { getTransferHookProgramId } from '../../utils/solana'

export default function TokenCreator() {
    const { connection } = useConnection()
    const { publicKey, sendTransaction } = useWallet()
    const [loading, setLoading] = useState(false)
    const [createdToken, setCreatedToken] = useState<{
        mint: string;
        signature: string;
        tokenAccount?: string;
    } | null>(null)

    const [formData, setFormData] = useState({
        name: 'RWA Compliance Token',
        symbol: 'RWA',
        decimals: 6,
        supply: 1000000,
        description: 'A Token-2022 with transfer hooks for compliance and regulatory requirements'
    })

    // Resolve program ID only when needed to avoid throwing at render time

    const createTokenWithHook = async () => {
        if (!publicKey) {
            toast.error('Please connect your wallet first')
            return
        }

        if (!formData.name || !formData.symbol) {
            toast.error('Please fill in token name and symbol')
            return
        }

        setLoading(true)
        const loadingToast = toast.loading('Creating Token-2022 with Transfer Hook...')

        try {
            // Resolve Transfer Hook Program ID early and validate
            let transferHookProgramId: PublicKey
            try {
                transferHookProgramId = getTransferHookProgramId()
            } catch (e: any) {
                toast.dismiss(loadingToast)
                toast.error('Transfer Hook program ID is not configured. Set NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID in .env.local to a valid base58 address.')
                return
            }

            // Generate new mint keypair
            const mint = Keypair.generate()
            console.log('🪙 Generated mint address:', mint.publicKey.toString())

            // Define extensions for the mint
            const extensions = [ExtensionType.TransferHook]
            const mintLen = getMintLen(extensions)

            // Calculate minimum balance for rent exemption
            const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(mintLen)
            console.log('💰 Rent exempt balance:', rentExemptBalance)

            // Build the transaction
            const transaction = new Transaction()

            // Add create account instruction
            transaction.add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: mintLen,
                    lamports: rentExemptBalance,
                    programId: TOKEN_2022_PROGRAM_ID,
                })
            )

            // Add initialize transfer hook instruction
            transaction.add(
                createInitializeTransferHookInstruction(
                    mint.publicKey,
                    publicKey, // authority
                    transferHookProgramId, // hook program
                    TOKEN_2022_PROGRAM_ID
                )
            )

            // Add initialize mint instruction
            transaction.add(
                createInitializeMintInstruction(
                    mint.publicKey,
                    formData.decimals,
                    publicKey, // mint authority
                    publicKey, // freeze authority (optional)
                    TOKEN_2022_PROGRAM_ID
                )
            )

            // Get recent blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
            transaction.recentBlockhash = blockhash
            transaction.feePayer = publicKey

            toast.dismiss(loadingToast)
            toast.loading('Please approve the transaction in your wallet...')

            // Send and confirm transaction
            const signature = await sendTransaction(transaction, connection, {
                signers: [mint],
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            })

            console.log('📝 Transaction signature:', signature)
            toast.dismiss()
            toast.loading('Confirming transaction...')

            // Wait for confirmation
            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed')

            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + confirmation.value.err.toString())
            }

            console.log('✅ Transaction confirmed!')

            // Create associated token account and mint initial supply if specified
            let tokenAccountAddress: string | undefined

            if (formData.supply > 0) {
                toast.loading('Minting initial supply...')
                // Derive ATA for wallet owner
                const ata = await getAssociatedTokenAddress(
                    mint.publicKey,
                    publicKey,
                    false, // allowOwnerOffCurve
                    TOKEN_2022_PROGRAM_ID,
                    ASSOCIATED_TOKEN_PROGRAM_ID
                )

                tokenAccountAddress = ata.toString()

                // Build a transaction to create ATA (if needed) and mint tokens
                const tx2 = new Transaction()
                // Create ATA
                tx2.add(
                    createAssociatedTokenAccountInstruction(
                        publicKey, // payer
                        ata,       // ata
                        publicKey, // owner
                        mint.publicKey,
                        TOKEN_2022_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                )
                // Mint to ATA
                tx2.add(
                    createMintToInstruction(
                        mint.publicKey,
                        ata,
                        publicKey, // mint authority
                        BigInt(formData.supply) * BigInt(Math.pow(10, formData.decimals)),
                        [],
                        TOKEN_2022_PROGRAM_ID
                    )
                )

                const { blockhash: bh2, lastValidBlockHeight: lvh2 } = await connection.getLatestBlockhash('confirmed')
                tx2.recentBlockhash = bh2
                tx2.feePayer = publicKey

                const sig2 = await sendTransaction(tx2, connection, { skipPreflight: false, preflightCommitment: 'confirmed' })
                await connection.confirmTransaction({ signature: sig2, blockhash: bh2, lastValidBlockHeight: lvh2 }, 'confirmed')

                console.log('🎯 Minted initial supply to:', tokenAccountAddress)
            }

            // Save created token info
            setCreatedToken({
                mint: mint.publicKey.toString(),
                signature,
                tokenAccount: tokenAccountAddress
            })

            toast.dismiss()
            toast.success('🎉 Token-2022 created successfully with Transfer Hook!')

        } catch (error: any) {
            console.error('❌ Error creating token:', error)
            toast.dismiss()

            if (error.message?.includes('User rejected')) {
                toast.error('Transaction was rejected')
            } else if (error.message?.includes('insufficient funds')) {
                toast.error('Insufficient SOL balance. Please get some devnet SOL.')
            } else {
                toast.error('Failed to create token: ' + (error.message || 'Unknown error'))
            }
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard!`)
    }

    const openInExplorer = (signature: string) => {
        window.open(`https://explorer.solana.com/tx/${signature}?cluster=devnet`, '_blank')
    }

    return (
        <div className="glass-card">
            <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                    <Coins className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-white">Create Token-2022</h2>
                    <p className="text-gray-400">Deploy a new token with transfer hook capabilities</p>
                </div>
            </div>

            {createdToken && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 mb-6">
                    <div className="flex items-center space-x-2 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                        <span className="text-green-400 font-semibold text-lg">Token Created Successfully!</span>
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-gray-400 mb-1">Mint Address:</p>
                            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
                                <span className="font-mono text-sm text-white flex-1">{createdToken.mint}</span>
                                <button
                                    onClick={() => copyToClipboard(createdToken.mint, 'Mint address')}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        {createdToken.tokenAccount && (
                            <div>
                                <p className="text-sm text-gray-400 mb-1">Your Token Account:</p>
                                <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
                                    <span className="font-mono text-sm text-white flex-1">{createdToken.tokenAccount}</span>
                                    <button
                                        onClick={() => copyToClipboard(createdToken.tokenAccount!, 'Token account')}
                                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                                    >
                                        <Copy className="w-4 h-4 text-gray-400" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-gray-400 mb-1">Transaction:</p>
                            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-3">
                                <span className="font-mono text-sm text-white flex-1">{createdToken.signature}</span>
                                <button
                                    onClick={() => copyToClipboard(createdToken.signature, 'Transaction signature')}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-gray-400" />
                                </button>
                                <button
                                    onClick={() => openInExplorer(createdToken.signature)}
                                    className="p-1 hover:bg-gray-700 rounded transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4 text-gray-400" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-sm text-blue-300">
                            🎯 <strong>Next Steps:</strong> Use this mint address to create a liquidity pool in the "Create Pool" tab,
                            or start trading in the "Swap" interface.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Token Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-field w-full"
                            placeholder="My RWA Token"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Symbol <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.symbol}
                            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                            className="input-field w-full"
                            placeholder="RWA"
                            maxLength={10}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Decimals</label>
                        <select
                            value={formData.decimals}
                            onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                            className="input-field w-full"
                            disabled={loading}
                        >
                            <option value={6}>6 decimals (recommended)</option>
                            <option value={9}>9 decimals</option>
                            <option value={8}>8 decimals</option>
                            <option value={2}>2 decimals</option>
                            <option value={0}>0 decimals</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Initial Supply</label>
                        <input
                            type="number"
                            value={formData.supply}
                            onChange={(e) => setFormData({ ...formData, supply: parseInt(e.target.value) || 0 })}
                            className="input-field w-full"
                            placeholder="1000000"
                            min="0"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Set to 0 if you want to mint tokens later
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-field w-full h-20 resize-none"
                            placeholder="Describe your token and its use case..."
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-blue-400 font-semibold mb-1">Transfer Hook Features</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                            <li>• Automatic compliance validation on every transfer</li>
                            <li>• Amount limits and transaction monitoring</li>
                            <li>• Perfect for RWA tokenization and regulated assets</li>
                            <li>• Extensible for KYC, whitelisting, and custom logic</li>
                            <li>• Fully compatible with our AMM trading system</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="text-yellow-400 font-semibold mb-1">Before You Start</h4>
                        <ul className="text-sm text-gray-300 space-y-1">
                            <li>• Make sure you have sufficient SOL for transaction fees (~0.01 SOL)</li>
                            <li>• This will create a Token-2022 mint on Solana Devnet</li>
                            <li>• Transfer hooks will be automatically enabled for compliance</li>
                            <li>• Save the mint address - you'll need it for creating pools</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="mt-8 flex justify-center">
                <button
                    onClick={createTokenWithHook}
                    disabled={loading || !publicKey || !formData.name || !formData.symbol}
                    className="btn-primary flex items-center space-x-2 min-w-[250px] justify-center h-12"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Creating Token...</span>
                        </>
                    ) : !publicKey ? (
                        <>
                            <Coins className="w-5 h-5" />
                            <span>Connect Wallet First</span>
                        </>
                    ) : (
                        <>
                            <Coins className="w-5 h-5" />
                            <span>Create Token-2022</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}