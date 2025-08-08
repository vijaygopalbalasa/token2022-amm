use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, Mint};
use spl_transfer_hook_interface::instruction::TransferHookInstruction;

declare_id!("GFdqG3vfiLTRK1p9Hzusidf9n7EbVKudPnJcnitWmt7M");

#[program]
pub mod transfer_hook {
    use super::*;

    pub fn initialize_extra_account_meta_list(
        _ctx: Context<InitializeExtraAccountMetaList>,
    ) -> Result<()> {
        // PDA is initialized by Anchor via the `init` attribute on the account.
        // For simplicity, we're not requiring extra accounts for this hook in the demo.
        Ok(())
    }

    pub fn transfer_hook(ctx: Context<TransferHook>, amount: u64) -> Result<()> {
        // This is where the transfer hook logic runs
        // For this demo, we'll implement basic whitelisting and validation
        
        let source_account = &ctx.accounts.source_token;
        let destination_account = &ctx.accounts.destination_token;
        let mint = &ctx.accounts.mint;
        
        // Example validation: Check if transfer amount is within limits
        require!(amount > 0, TransferHookError::InvalidAmount);
        require!(amount <= 1_000_000 * 10_u64.pow(mint.decimals as u32), TransferHookError::AmountTooLarge);
        
        // Example: Basic KYC simulation (in real implementation, check against KYC registry)
        let source_owner = source_account.owner;
        let dest_owner = destination_account.owner;
        
        // For demo purposes, we'll allow all transfers
        // In production, you would check against whitelists, KYC status, etc.
        
        msg!("Transfer hook executed: {} tokens from {} to {}", 
             amount, source_owner, dest_owner);
        
        emit!(TransferValidated {
            mint: mint.key(),
            source: source_owner,
            destination: dest_owner,
            amount,
        });
        
        Ok(())
    }

    // Fallback function required by Transfer Hook Interface
    pub fn fallback<'info>(
        program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        data: &[u8],
    ) -> Result<()> {
        let instruction = TransferHookInstruction::unpack(data)?;
        
        match instruction {
            TransferHookInstruction::Execute { amount } => {
                let account_info_iter = &mut accounts.iter();
                let source_account_info = next_account_info(account_info_iter)?;
                let mint_info = next_account_info(account_info_iter)?;
                let destination_account_info = next_account_info(account_info_iter)?;
                let owner_info = next_account_info(account_info_iter)?;
                let extra_account_meta_list_info = next_account_info(account_info_iter)?;
                
                // Validate the transfer
                msg!("Executing transfer hook for amount: {}", amount);
                
                Ok(())
            }
            TransferHookInstruction::InitializeExtraAccountMetaList { .. } => {
                // Handled by the initialize_extra_account_meta_list entrypoint
                Ok(())
            }
            TransferHookInstruction::UpdateExtraAccountMetaList { .. } => {
                // Not implemented in this demo; accept no-op
                Ok(())
            }
        }
    }
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: ExtraAccountMetaList Account, must use these seeds
    #[account(
        init,
        payer = payer,
        space = 8 + 4, // discriminator + empty vec length
        seeds = [b"extra-account-metas", mint.key().as_ref()], 
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,

    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct TransferHook<'info> {
    #[account(
        token::mint = mint,
        token::authority = owner,
    )]
    pub source_token: InterfaceAccount<'info, TokenAccount>,
    
    pub mint: InterfaceAccount<'info, Mint>,
    
    #[account(
        token::mint = mint,
    )]
    pub destination_token: InterfaceAccount<'info, TokenAccount>,
    
    /// CHECK: The owner of the source account
    pub owner: UncheckedAccount<'info>,
    
    /// CHECK: ExtraAccountMetaList Account
    #[account(
        seeds = [b"extra-account-metas", mint.key().as_ref()], 
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
}

#[event]
pub struct TransferValidated {
    pub mint: Pubkey,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub amount: u64,
}

#[error_code]
pub enum TransferHookError {
    #[msg("Invalid transfer amount")]
    InvalidAmount,
    #[msg("Transfer amount too large")]
    AmountTooLarge,
    #[msg("Source account not whitelisted")]
    SourceNotWhitelisted,
    #[msg("Destination account not whitelisted")]
    DestinationNotWhitelisted,
}