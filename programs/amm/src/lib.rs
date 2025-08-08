use anchor_lang::prelude::*;
// For Anchor 0.29+, use token_interface accounts; token_2022 does not expose TokenAccount/Mint types
// use anchor_spl::token_2022::Token2022; // Not used currently
use anchor_spl::token_interface::{self, TokenInterface, Mint as InterfaceMint, TokenAccount as InterfaceTokenAccount};

declare_id!("8zuw1hrY3T3rPfv61Fko2645cjSq1w3mJgsDXRh4vpW3");

#[program]
pub mod amm {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        fee_rate: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        pool.authority = ctx.accounts.authority.key();
        pool.mint_a = ctx.accounts.mint_a.key();
        pool.mint_b = ctx.accounts.mint_b.key();
        pool.vault_a = ctx.accounts.vault_a.key();
        pool.vault_b = ctx.accounts.vault_b.key();
        pool.fee_rate = fee_rate;
        pool.reserve_a = 0;
        pool.reserve_b = 0;
        pool.bump = ctx.bumps.pool;
        
        emit!(PoolCreated {
            pool: pool.key(),
            mint_a: pool.mint_a,
            mint_b: pool.mint_b,
            fee_rate,
        });
        
        Ok(())
    }

    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        amount_a: u64,
        amount_b: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        // Transfer tokens from user to vaults
        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program_a.to_account_info(),
                token_interface::TransferChecked {
                    from: ctx.accounts.user_vault_a.to_account_info(),
                    mint: ctx.accounts.mint_a.to_account_info(),
                    to: ctx.accounts.vault_a.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_a,
            ctx.accounts.mint_a.decimals,
        )?;

        token_interface::transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program_b.to_account_info(),
                token_interface::TransferChecked {
                    from: ctx.accounts.user_vault_b.to_account_info(),
                    mint: ctx.accounts.mint_b.to_account_info(),
                    to: ctx.accounts.vault_b.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_b,
            ctx.accounts.mint_b.decimals,
        )?;

        pool.reserve_a += amount_a;
        pool.reserve_b += amount_b;

        emit!(LiquidityAdded {
            user: ctx.accounts.user.key(),
            amount_a,
            amount_b,
        });

        Ok(())
    }

    pub fn swap(
        ctx: Context<Swap>,
        amount_in: u64,
        minimum_amount_out: u64,
        a_to_b: bool,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        
        let (reserve_in, reserve_out) = if a_to_b {
            (pool.reserve_a, pool.reserve_b)
        } else {
            (pool.reserve_b, pool.reserve_a)
        };

        // Simple constant product formula: x * y = k
        let fee_amount = amount_in * pool.fee_rate / 10000;
        let amount_in_after_fee = amount_in - fee_amount;
        
        let amount_out = (amount_in_after_fee as u128 * reserve_out as u128) 
            / (reserve_in as u128 + amount_in_after_fee as u128);
        let amount_out = amount_out as u64;

        require!(amount_out >= minimum_amount_out, AmmError::SlippageExceeded);
        require!(amount_out < reserve_out, AmmError::InsufficientLiquidity);

        let seeds = &[
            b"pool",
            ctx.accounts.mint_a.to_account_info().key.as_ref(),
            ctx.accounts.mint_b.to_account_info().key.as_ref(),
            &[pool.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        if a_to_b {
            // Transfer A from user to vault
            token_interface::transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program_a.to_account_info(),
                    token_interface::TransferChecked {
                        from: ctx.accounts.user_vault_a.to_account_info(),
                        mint: ctx.accounts.mint_a.to_account_info(),
                        to: ctx.accounts.vault_a.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
                ctx.accounts.mint_a.decimals,
            )?;

            // Transfer B from vault to user
            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program_b.to_account_info(),
                    token_interface::TransferChecked {
                        from: ctx.accounts.vault_b.to_account_info(),
                        mint: ctx.accounts.mint_b.to_account_info(),
                        to: ctx.accounts.user_vault_b.to_account_info(),
                        authority: pool.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount_out,
                ctx.accounts.mint_b.decimals,
            )?;

            pool.reserve_a += amount_in;
            pool.reserve_b -= amount_out;
        } else {
            // B to A swap
            token_interface::transfer_checked(
                CpiContext::new(
                    ctx.accounts.token_program_b.to_account_info(),
                    token_interface::TransferChecked {
                        from: ctx.accounts.user_vault_b.to_account_info(),
                        mint: ctx.accounts.mint_b.to_account_info(),
                        to: ctx.accounts.vault_b.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount_in,
                ctx.accounts.mint_b.decimals,
            )?;

            token_interface::transfer_checked(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program_a.to_account_info(),
                    token_interface::TransferChecked {
                        from: ctx.accounts.vault_a.to_account_info(),
                        mint: ctx.accounts.mint_a.to_account_info(),
                        to: ctx.accounts.user_vault_a.to_account_info(),
                        authority: pool.to_account_info(),
                    },
                    signer_seeds,
                ),
                amount_out,
                ctx.accounts.mint_a.decimals,
            )?;

            pool.reserve_a -= amount_out;
            pool.reserve_b += amount_in;
        }

        emit!(SwapExecuted {
            user: ctx.accounts.user.key(),
            amount_in,
            amount_out,
            a_to_b,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Pool::INIT_SPACE,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    // Input mints (no init here)
    pub mint_a: InterfaceAccount<'info, InterfaceMint>,
    pub mint_b: InterfaceAccount<'info, InterfaceMint>,

    // Vault token accounts should be created client-side (ATA). We only take them as mut references.
    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, InterfaceTokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub mint_a: InterfaceAccount<'info, InterfaceMint>,
    pub mint_b: InterfaceAccount<'info, InterfaceMint>,

    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, InterfaceTokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, InterfaceTokenAccount>,

    #[account(mut)]
    pub user_vault_a: InterfaceAccount<'info, InterfaceTokenAccount>,
    #[account(mut)]
    pub user_vault_b: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        seeds = [b"pool", mint_a.key().as_ref(), mint_b.key().as_ref()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,

    pub mint_a: InterfaceAccount<'info, InterfaceMint>,
    pub mint_b: InterfaceAccount<'info, InterfaceMint>,

    #[account(mut)]
    pub vault_a: InterfaceAccount<'info, InterfaceTokenAccount>,
    #[account(mut)]
    pub vault_b: InterfaceAccount<'info, InterfaceTokenAccount>,

    #[account(mut)]
    pub user_vault_a: InterfaceAccount<'info, InterfaceTokenAccount>,
    #[account(mut)]
    pub user_vault_b: InterfaceAccount<'info, InterfaceTokenAccount>,

    pub token_program_a: Interface<'info, TokenInterface>,
    pub token_program_b: Interface<'info, TokenInterface>,
}

#[account]
#[derive(InitSpace)]
pub struct Pool {
    pub authority: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub vault_a: Pubkey,
    pub vault_b: Pubkey,
    pub fee_rate: u64,
    pub reserve_a: u64,
    pub reserve_b: u64,
    pub bump: u8,
}

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub mint_a: Pubkey,
    pub mint_b: Pubkey,
    pub fee_rate: u64,
}

#[event]
pub struct LiquidityAdded {
    pub user: Pubkey,
    pub amount_a: u64,
    pub amount_b: u64,
}

#[event]
pub struct SwapExecuted {
    pub user: Pubkey,
    pub amount_in: u64,
    pub amount_out: u64,
    pub a_to_b: bool,
}

#[error_code]
pub enum AmmError {
    #[msg("Slippage tolerance exceeded")]
    SlippageExceeded,
    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,
}