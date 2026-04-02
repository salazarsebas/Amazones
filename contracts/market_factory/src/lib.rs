#![no_std]

use amazones_shared::{CreateMarketRequest, MarketRecord, MarketStatus};
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, BytesN, Env};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    NextMarketId,
    Market(BytesN<32>),
}

#[contract]
pub struct MarketFactory;

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MktCreated {
    #[topic]
    pub market_id: BytesN<32>,
    pub creator: Address,
    pub sequence: u64,
}

#[contractimpl]
impl MarketFactory {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::NextMarketId, &1u64);
    }

    pub fn create_market(env: Env, request: CreateMarketRequest) -> BytesN<32> {
        request.creator.require_auth();

        if request.close_time >= request.resolve_time {
            panic!("close_time must be before resolve_time");
        }
        if request.resolver_bond < 0 || request.challenger_bond < 0 {
            panic!("bond must be non-negative");
        }

        let next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextMarketId)
            .unwrap_or(1u64);
        let market_id = market_id_from_counter(&env, next_id);

        let record = MarketRecord {
            market_id: market_id.clone(),
            creator: request.creator.clone(),
            collateral_asset: request.collateral_asset,
            question: request.question,
            category: request.category,
            close_time: request.close_time,
            resolve_time: request.resolve_time,
            resolution_policy_uri: request.resolution_policy_uri,
            resolver_bond: request.resolver_bond,
            challenger_bond: request.challenger_bond,
            status: MarketStatus::Open,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Market(market_id.clone()), &record);
        env.storage()
            .instance()
            .set(&DataKey::NextMarketId, &(next_id + 1));

        MktCreated {
            market_id: market_id.clone(),
            creator: request.creator,
            sequence: next_id,
        }
        .publish(&env);

        market_id
    }

    pub fn get_market(env: Env, market_id: BytesN<32>) -> MarketRecord {
        env.storage()
            .persistent()
            .get(&DataKey::Market(market_id))
            .unwrap()
    }
}

fn market_id_from_counter(env: &Env, counter: u64) -> BytesN<32> {
    let mut raw = [0u8; 32];
    raw[24..32].copy_from_slice(&counter.to_be_bytes());
    BytesN::from_array(env, &raw)
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, String, Symbol};

    #[test]
    fn creates_market_and_stores_it() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let collateral = Address::generate(&env);

        let contract_id = env.register(MarketFactory, (admin.clone(),));
        let client = MarketFactoryClient::new(&env, &contract_id);

        let request = CreateMarketRequest {
            creator: creator.clone(),
            collateral_asset: collateral,
            question: String::from_str(&env, "Will BTC close above 100k?"),
            category: Symbol::new(&env, "crypto"),
            close_time: 100u64,
            resolve_time: 200u64,
            resolution_policy_uri: String::from_str(&env, "ipfs://policy"),
            resolver_bond: 10i128,
            challenger_bond: 20i128,
        };

        let market_id = client.create_market(&request);

        let market = client.get_market(&market_id);
        assert_eq!(market.creator, creator);
        assert_eq!(market.status, MarketStatus::Open);
        assert_eq!(market.resolve_time, 200u64);
    }
}
