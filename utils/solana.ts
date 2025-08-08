import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { getAccount, getMint } from '@solana/spl-token'

// Devnet connection
export const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')

// Program IDs - read from env to avoid invalid placeholder errors
export const getAmmProgramId = (): PublicKey => {
    const id = process.env.NEXT_PUBLIC_AMM_PROGRAM_ID
    if (!id) throw new Error('AMM program ID not configured. Set NEXT_PUBLIC_AMM_PROGRAM_ID')
    return new PublicKey(id)
}

export const getTransferHookProgramId = (): PublicKey => {
    const id = process.env.NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID
    if (!id) throw new Error('Transfer Hook program ID not configured. Set NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID')
    return new PublicKey(id)
}

// Utility functions for real implementation
export const utils = {
    // Check if a mint is a valid Token-2022
    async isToken2022Mint(mintAddress: string): Promise<boolean> {
        try {
            const mint = await getMint(
                connection,
                new PublicKey(mintAddress),
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )
            return true
        } catch (error) {
            return false
        }
    },

    // Get mint information
    async getMintInfo(mintAddress: string) {
        try {
            const mint = await getMint(
                connection,
                new PublicKey(mintAddress),
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )
            return mint
        } catch (error) {
            console.error('Error fetching mint info:', error)
            throw error
        }
    },

    // Get token account balance
    async getTokenBalance(tokenAccountAddress: string): Promise<number> {
        try {
            const account = await getAccount(
                connection,
                new PublicKey(tokenAccountAddress),
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )
            return Number(account.amount)
        } catch (error) {
            console.error('Error fetching token balance:', error)
            return 0
        }
    },

    // Format token amount for display
    formatTokenAmount(amount: number | bigint, decimals: number): string {
        const divisor = Math.pow(10, decimals)
        const formatted = Number(amount) / divisor
        return formatted.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: Math.min(decimals, 6)
        })
    },

    // Parse token amount from user input
    parseTokenAmount(input: string, decimals: number): number {
        const parsed = parseFloat(input) || 0
        return Math.floor(parsed * Math.pow(10, decimals))
    },

    // Validate Solana address
    isValidSolanaAddress(address: string): boolean {
        try {
            new PublicKey(address)
            return true
        } catch {
            return false
        }
    },

    // Get SOL balance
    async getSolBalance(publicKey: PublicKey): Promise<number> {
        try {
            const balance = await connection.getBalance(publicKey)
            return balance / 1e9 // Convert lamports to SOL
        } catch (error) {
            console.error('Error fetching SOL balance:', error)
            return 0
        }
    },

    // Request devnet SOL airdrop
    async requestAirdrop(publicKey: PublicKey): Promise<string> {
        try {
            const signature = await connection.requestAirdrop(publicKey, 2 * 1e9) // 2 SOL
            await connection.confirmTransaction(signature, 'confirmed')
            return signature
        } catch (error) {
            console.error('Airdrop failed:', error)
            throw error
        }
    }
}

// Common token addresses on devnet
export const COMMON_TOKENS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // Devnet USDC
}

// Pool finder utility
export const findPoolAddress = (tokenA: PublicKey, tokenB: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from('pool'),
            tokenA.toBuffer(),
            tokenB.toBuffer(),
        ],
        getAmmProgramId()
    )
}

// Error handling utility
export const handleSolanaError = (error: any): string => {
    if (error.message?.includes('User rejected')) {
        return 'Transaction was rejected by user'
    }
    if (error.message?.includes('insufficient funds')) {
        return 'Insufficient SOL balance for transaction'
    }
    if (error.message?.includes('blockhash not found')) {
        return 'Network error - please try again'
    }
    if (error.message?.includes('Invalid public key')) {
        return 'Invalid token address provided'
    }

    return error.message || 'An unknown error occurred'
}