#![no_std]

use amazones_shared::{AgentProfile, AgentStatus};
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, Address, Env, String, Symbol,
};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    AgentProfile(Address),
    AgentCategoryScore(Address, Symbol),
    AgentVolume(Address),
}

#[contract]
pub struct AgentRegistry;

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgtReg {
    #[topic]
    pub agent_wallet: Address,
    pub owner: Address,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgtStatus {
    #[topic]
    pub agent_wallet: Address,
    pub status: AgentStatus,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AgtRep {
    #[topic]
    pub agent_wallet: Address,
    pub category: Symbol,
    pub score_delta: i64,
}

#[contractimpl]
impl AgentRegistry {
    pub fn __constructor(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    pub fn register_agent(
        env: Env,
        owner: Address,
        agent_wallet: Address,
        agent_type: Symbol,
        metadata_uri: String,
    ) {
        owner.require_auth();
        if env
            .storage()
            .persistent()
            .has(&DataKey::AgentProfile(agent_wallet.clone()))
        {
            panic!("agent already registered");
        }

        let profile = AgentProfile {
            owner: owner.clone(),
            agent_wallet: agent_wallet.clone(),
            agent_type,
            metadata_uri,
            status: AgentStatus::Draft,
        };

        env.storage()
            .persistent()
            .set(&DataKey::AgentProfile(agent_wallet.clone()), &profile);
        AgtReg {
            agent_wallet,
            owner,
        }
        .publish(&env);
    }

    pub fn set_agent_status(env: Env, agent_wallet: Address, status: AgentStatus) {
        let mut profile: AgentProfile = env
            .storage()
            .persistent()
            .get(&DataKey::AgentProfile(agent_wallet.clone()))
            .unwrap();
        profile.owner.require_auth();
        profile.status = status.clone();
        env.storage()
            .persistent()
            .set(&DataKey::AgentProfile(agent_wallet.clone()), &profile);
        AgtStatus {
            agent_wallet,
            status,
        }
        .publish(&env);
    }

    pub fn update_reputation(env: Env, agent_wallet: Address, category: Symbol, score_delta: i64) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let score_key = DataKey::AgentCategoryScore(agent_wallet.clone(), category.clone());
        let current_score: i64 = env.storage().persistent().get(&score_key).unwrap_or(0i64);
        env.storage()
            .persistent()
            .set(&score_key, &(current_score + score_delta));

        let volume_key = DataKey::AgentVolume(agent_wallet.clone());
        let current_volume: i128 = env.storage().persistent().get(&volume_key).unwrap_or(0i128);
        env.storage()
            .persistent()
            .set(&volume_key, &(current_volume + 1));

        AgtRep {
            agent_wallet,
            category,
            score_delta,
        }
        .publish(&env);
    }

    pub fn get_agent(env: Env, agent_wallet: Address) -> AgentProfile {
        env.storage()
            .persistent()
            .get(&DataKey::AgentProfile(agent_wallet))
            .unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address};

    #[test]
    fn registers_and_updates_agent() {
        let env = Env::default();
        env.mock_all_auths();
        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let agent = Address::generate(&env);

        let contract_id = env.register(AgentRegistry, (admin.clone(),));
        let client = AgentRegistryClient::new(&env, &contract_id);

        client.register_agent(
            &owner,
            &agent,
            &Symbol::new(&env, "trader"),
            &String::from_str(&env, "ipfs://agent"),
        );

        let profile = client.get_agent(&agent);
        assert_eq!(profile.owner, owner);
        assert_eq!(profile.status, AgentStatus::Draft);

        client.set_agent_status(&agent, &AgentStatus::Active);
        let updated = client.get_agent(&agent);
        assert_eq!(updated.status, AgentStatus::Active);

        client.update_reputation(&agent, &Symbol::new(&env, "crypto"), &5i64);
    }
}
