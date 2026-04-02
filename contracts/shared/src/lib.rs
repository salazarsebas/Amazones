#![no_std]

use soroban_sdk::{contracttype, Address, BytesN, String, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MarketStatus {
    Draft,
    Open,
    Closed,
    Resolving,
    Resolved,
    Invalid,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Outcome {
    Undetermined,
    Yes,
    No,
    Invalid,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AgentStatus {
    Draft,
    Active,
    Paused,
    Archived,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MarketRecord {
    pub market_id: BytesN<32>,
    pub creator: Address,
    pub collateral_asset: Address,
    pub question: String,
    pub category: Symbol,
    pub close_time: u64,
    pub resolve_time: u64,
    pub resolution_policy_uri: String,
    pub resolver_bond: i128,
    pub challenger_bond: i128,
    pub status: MarketStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Position {
    pub yes_shares: i128,
    pub no_shares: i128,
    pub locked_collateral: i128,
    pub available_collateral: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResolutionState {
    pub outcome: Outcome,
    pub challenged: bool,
    pub challenge_deadline: u64,
    pub proposed_by: Address,
    pub evidence_uri: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgentProfile {
    pub owner: Address,
    pub agent_wallet: Address,
    pub agent_type: Symbol,
    pub metadata_uri: String,
    pub status: AgentStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CreateMarketRequest {
    pub creator: Address,
    pub collateral_asset: Address,
    pub question: String,
    pub category: Symbol,
    pub close_time: u64,
    pub resolve_time: u64,
    pub resolution_policy_uri: String,
    pub resolver_bond: i128,
    pub challenger_bond: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SettleTradeRequest {
    pub settlement_id: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub side: Symbol,
    pub price_bps: u32,
    pub shares: i128,
    pub fee_bps: u32,
}
