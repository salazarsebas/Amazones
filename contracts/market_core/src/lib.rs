#![no_std]

use amazones_shared::{Outcome, Position, SettleTradeRequest};
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, Address, BytesN, Env, Symbol,
};

const BPS_DENOMINATOR: i128 = 10_000;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    MarketId,
    CollateralAsset,
    CollateralBalance(Address),
    LockedCollateral(Address),
    YesShares(Address),
    NoShares(Address),
    SettlementUsed(BytesN<32>),
    PoolBalance,
    FeeTreasury,
    FinalOutcome,
    Redeemed(Address),
}

#[contract]
pub struct MarketCore;

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ColDep {
    #[topic]
    pub user: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ColWdr {
    #[topic]
    pub user: Address,
    pub amount: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TradeSet {
    #[topic]
    pub settlement_id: BytesN<32>,
    pub buyer: Address,
    pub seller: Address,
    pub side: Symbol,
    pub price_bps: u32,
    pub shares: i128,
    pub fee_bps: u32,
}

#[contractimpl]
impl MarketCore {
    pub fn __constructor(
        env: Env,
        admin: Address,
        market_id: BytesN<32>,
        collateral_asset: Address,
    ) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::MarketId, &market_id);
        env.storage()
            .instance()
            .set(&DataKey::CollateralAsset, &collateral_asset);
        env.storage().instance().set(&DataKey::PoolBalance, &0i128);
        env.storage().instance().set(&DataKey::FeeTreasury, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::FinalOutcome, &Outcome::Undetermined);
    }

    pub fn deposit_collateral(env: Env, user: Address, amount: i128) {
        user.require_auth();
        require_positive(amount);

        let current = get_i128(&env, DataKey::CollateralBalance(user.clone()));
        env.storage().persistent().set(
            &DataKey::CollateralBalance(user.clone()),
            &(current + amount),
        );

        let pool = get_pool(&env);
        env.storage()
            .instance()
            .set(&DataKey::PoolBalance, &(pool + amount));

        ColDep { user, amount }.publish(&env);
    }

    pub fn withdraw_unused_collateral(env: Env, user: Address, amount: i128) {
        user.require_auth();
        require_positive(amount);

        let available = get_i128(&env, DataKey::CollateralBalance(user.clone()));
        if available < amount {
            panic!("insufficient available collateral");
        }

        env.storage().persistent().set(
            &DataKey::CollateralBalance(user.clone()),
            &(available - amount),
        );

        let pool = get_pool(&env);
        env.storage()
            .instance()
            .set(&DataKey::PoolBalance, &(pool - amount));

        ColWdr { user, amount }.publish(&env);
    }

    pub fn settle_trade(env: Env, request: SettleTradeRequest) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if env
            .storage()
            .temporary()
            .has(&DataKey::SettlementUsed(request.settlement_id.clone()))
        {
            panic!("settlement already used");
        }
        if request.shares <= 0 {
            panic!("shares must be positive");
        }
        if request.price_bps == 0 || request.price_bps >= BPS_DENOMINATOR as u32 {
            panic!("price_bps out of range");
        }

        let gross_cost = request.shares * request.price_bps as i128 / BPS_DENOMINATOR;
        let seller_lock = request.shares - gross_cost;
        let fee = gross_cost * request.fee_bps as i128 / BPS_DENOMINATOR;
        let buyer_required = gross_cost + fee;

        let buyer_available = get_i128(&env, DataKey::CollateralBalance(request.buyer.clone()));
        let seller_available = get_i128(&env, DataKey::CollateralBalance(request.seller.clone()));
        if buyer_available < buyer_required {
            panic!("buyer collateral too low");
        }
        if seller_available < seller_lock {
            panic!("seller collateral too low");
        }

        env.storage().persistent().set(
            &DataKey::CollateralBalance(request.buyer.clone()),
            &(buyer_available - buyer_required),
        );
        env.storage().persistent().set(
            &DataKey::CollateralBalance(request.seller.clone()),
            &(seller_available - seller_lock),
        );

        let buyer_locked = get_i128(&env, DataKey::LockedCollateral(request.buyer.clone()));
        let seller_locked = get_i128(&env, DataKey::LockedCollateral(request.seller.clone()));
        env.storage().persistent().set(
            &DataKey::LockedCollateral(request.buyer.clone()),
            &(buyer_locked + gross_cost),
        );
        env.storage().persistent().set(
            &DataKey::LockedCollateral(request.seller.clone()),
            &(seller_locked + seller_lock),
        );

        if request.side == Symbol::new(&env, "yes") {
            add_shares(&env, request.buyer.clone(), true, request.shares);
            add_shares(&env, request.seller.clone(), false, request.shares);
        } else if request.side == Symbol::new(&env, "no") {
            add_shares(&env, request.buyer.clone(), false, request.shares);
            add_shares(&env, request.seller.clone(), true, request.shares);
        } else {
            panic!("side must be yes or no");
        }

        let pool = get_pool(&env);
        let treasury = get_i128(&env, DataKey::FeeTreasury);
        env.storage()
            .instance()
            .set(&DataKey::PoolBalance, &(pool - fee));
        env.storage()
            .instance()
            .set(&DataKey::FeeTreasury, &(treasury + fee));
        env.storage().temporary().set(
            &DataKey::SettlementUsed(request.settlement_id.clone()),
            &true,
        );

        TradeSet {
            settlement_id: request.settlement_id,
            buyer: request.buyer,
            seller: request.seller,
            side: request.side,
            price_bps: request.price_bps,
            shares: request.shares,
            fee_bps: request.fee_bps,
        }
        .publish(&env);
    }

    pub fn set_final_outcome(env: Env, outcome: Outcome) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage()
            .instance()
            .set(&DataKey::FinalOutcome, &outcome);
    }

    pub fn redeem(env: Env, user: Address) -> i128 {
        user.require_auth();

        let outcome: Outcome = env
            .storage()
            .instance()
            .get(&DataKey::FinalOutcome)
            .unwrap();
        if outcome == Outcome::Undetermined {
            panic!("market not resolved");
        }
        if env
            .storage()
            .persistent()
            .has(&DataKey::Redeemed(user.clone()))
        {
            panic!("already redeemed");
        }

        let yes = get_i128(&env, DataKey::YesShares(user.clone()));
        let no = get_i128(&env, DataKey::NoShares(user.clone()));
        let payout = match outcome {
            Outcome::Yes => yes,
            Outcome::No => no,
            Outcome::Invalid => yes + no,
            Outcome::Undetermined => 0,
        };

        let available = get_i128(&env, DataKey::CollateralBalance(user.clone()));
        let pool = get_pool(&env);
        if pool < payout {
            panic!("pool underfunded");
        }

        env.storage().persistent().set(
            &DataKey::CollateralBalance(user.clone()),
            &(available + payout),
        );
        env.storage()
            .instance()
            .set(&DataKey::PoolBalance, &(pool - payout));
        env.storage()
            .persistent()
            .set(&DataKey::Redeemed(user), &true);

        payout
    }

    pub fn get_position(env: Env, user: Address) -> Position {
        Position {
            yes_shares: get_i128(&env, DataKey::YesShares(user.clone())),
            no_shares: get_i128(&env, DataKey::NoShares(user.clone())),
            locked_collateral: get_i128(&env, DataKey::LockedCollateral(user.clone())),
            available_collateral: get_i128(&env, DataKey::CollateralBalance(user)),
        }
    }
}

fn get_i128(env: &Env, key: DataKey) -> i128 {
    env.storage().persistent().get(&key).unwrap_or(0i128)
}

fn get_pool(env: &Env) -> i128 {
    env.storage()
        .instance()
        .get(&DataKey::PoolBalance)
        .unwrap_or(0i128)
}

fn require_positive(amount: i128) {
    if amount <= 0 {
        panic!("amount must be positive");
    }
}

fn add_shares(env: &Env, user: Address, yes_side: bool, shares: i128) {
    let key = if yes_side {
        DataKey::YesShares(user.clone())
    } else {
        DataKey::NoShares(user.clone())
    };

    let current = get_i128(env, key.clone());
    env.storage().persistent().set(&key, &(current + shares));
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, BytesN};

    fn setup() -> (Env, MarketCoreClient<'static>, Address, Address, Address) {
        let env = Env::default();
        let admin = Address::generate(&env);
        let market_id = BytesN::from_array(&env, &[0; 32]);
        let collateral = Address::generate(&env);
        let contract_id = env.register(MarketCore, (admin.clone(), market_id, collateral));
        let client = MarketCoreClient::new(&env, &contract_id);
        let buyer = Address::generate(&env);
        let seller = Address::generate(&env);
        (env, client, admin, buyer, seller)
    }

    #[test]
    fn deposits_and_withdraws() {
        let (env, client, _admin, buyer, _seller) = setup();
        env.mock_all_auths();

        client.deposit_collateral(&buyer, &1_000i128);
        let position = client.get_position(&buyer);
        assert_eq!(position.available_collateral, 1_000);

        client.withdraw_unused_collateral(&buyer, &400i128);
        let position = client.get_position(&buyer);
        assert_eq!(position.available_collateral, 600);
    }

    #[test]
    fn settles_trade_once_and_updates_positions() {
        let (env, client, admin, buyer, seller) = setup();
        env.mock_all_auths();
        client.deposit_collateral(&buyer, &1_000i128);
        client.deposit_collateral(&seller, &1_000i128);

        let settlement_id = BytesN::from_array(&env, &[1; 32]);
        let request = SettleTradeRequest {
            settlement_id,
            buyer: buyer.clone(),
            seller: seller.clone(),
            side: Symbol::new(&env, "yes"),
            price_bps: 6_000u32,
            shares: 100i128,
            fee_bps: 100u32,
        };
        client.settle_trade(&request);

        let buyer_position = client.get_position(&buyer);
        let seller_position = client.get_position(&seller);
        assert_eq!(buyer_position.yes_shares, 100);
        assert_eq!(seller_position.no_shares, 100);
        assert!(buyer_position.locked_collateral > 0);
        assert!(seller_position.locked_collateral > 0);

        let _ = admin;
    }
}
