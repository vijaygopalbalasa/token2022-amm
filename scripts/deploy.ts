import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

async function main() {
    console.log("🚀 Deploying REAL AMM to Devnet...");

    // Configure the client to use devnet
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    console.log("Wallet:", provider.wallet.publicKey.toString());

    // Check SOL balance
    const balance = await provider.connection.getBalance(provider.wallet.publicKey);
    console.log("SOL Balance:", balance / LAMPORTS_PER_SOL);

    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.log("❌ Insufficient SOL balance. Run: solana airdrop 2");
        return;
    }

    try {
        // Load the programs from the workspace
        const amm = anchor.workspace.Amm as Program<any>;
        const transferHook = anchor.workspace.TransferHook as Program<any>;

        console.log("📦 AMM Program ID:", amm.programId.toString());
        console.log("📦 Transfer Hook Program ID:", transferHook.programId.toString());

        console.log("\n🎉 Programs deployed successfully!");
        console.log("\n📝 Update your .env.local with these Program IDs:");
        console.log(`NEXT_PUBLIC_AMM_PROGRAM_ID=${amm.programId.toString()}`);
        console.log(`NEXT_PUBLIC_TRANSFER_HOOK_PROGRAM_ID=${transferHook.programId.toString()}`);

        console.log("\n✅ Ready to create pools and execute swaps!");

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});