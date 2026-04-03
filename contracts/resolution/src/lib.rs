#![no_std]

use amazones_shared::{Outcome, ResolutionState};
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    ChallengePeriod,
    State,
    FinalOutcome,
}

#[contract]
pub struct Resolution;

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResProp {
    #[topic]
    pub resolver: Address,
    pub outcome: Outcome,
    pub challenge_deadline: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResChal {
    #[topic]
    pub challenger: Address,
    pub challenge_deadline: u64,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ResFin {
    pub outcome: Outcome,
}

#[contractimpl]
impl Resolution {
    pub fn __constructor(env: Env, admin: Address, challenge_period: u64) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::ChallengePeriod, &challenge_period);
        env.storage()
            .instance()
            .set(&DataKey::FinalOutcome, &Outcome::Undetermined);
    }

    pub fn propose_resolution(env: Env, resolver: Address, outcome: Outcome, evidence_uri: String) {
        resolver.require_auth();
        let final_outcome: Outcome = env
            .storage()
            .instance()
            .get(&DataKey::FinalOutcome)
            .unwrap();
        if final_outcome != Outcome::Undetermined {
            panic!("already finalized");
        }
        if env.storage().persistent().has(&DataKey::State) {
            panic!("proposal already exists");
        }

        let challenge_period: u64 = env
            .storage()
            .instance()
            .get(&DataKey::ChallengePeriod)
            .unwrap();
        let now = env.ledger().timestamp();
        let state = ResolutionState {
            outcome: outcome.clone(),
            challenged: false,
            challenge_deadline: now + challenge_period,
            proposed_by: resolver.clone(),
            evidence_uri,
        };

        env.storage().persistent().set(&DataKey::State, &state);
        ResProp {
            resolver,
            outcome,
            challenge_deadline: now + challenge_period,
        }
        .publish(&env);
    }

    pub fn challenge_resolution(env: Env, challenger: Address, evidence_uri: String) {
        challenger.require_auth();
        let mut state: ResolutionState = env.storage().persistent().get(&DataKey::State).unwrap();
        if env.ledger().timestamp() > state.challenge_deadline {
            panic!("challenge window closed");
        }
        if state.challenged {
            panic!("already challenged");
        }

        state.challenged = true;
        state.evidence_uri = evidence_uri;
        env.storage().persistent().set(&DataKey::State, &state);
        ResChal {
            challenger,
            challenge_deadline: state.challenge_deadline,
        }
        .publish(&env);
    }

    pub fn finalize_resolution(env: Env) -> Outcome {
        let state: ResolutionState = env.storage().persistent().get(&DataKey::State).unwrap();
        if state.challenged {
            panic!("challenged proposal requires manual adjudication");
        }
        if env.ledger().timestamp() < state.challenge_deadline {
            panic!("challenge window still open");
        }

        env.storage()
            .instance()
            .set(&DataKey::FinalOutcome, &state.outcome);
        ResFin {
            outcome: state.outcome.clone(),
        }
        .publish(&env);

        state.outcome
    }

    pub fn get_state(env: Env) -> ResolutionState {
        env.storage().persistent().get(&DataKey::State).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::{Address as _, Ledger, LedgerInfo},
        Address,
    };

    #[test]
    fn proposes_and_finalizes_after_window() {
        let env = Env::default();
        env.mock_all_auths();
        env.ledger().set(LedgerInfo {
            protocol_version: 25,
            sequence_number: 1,
            timestamp: 100,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000,
        });

        let admin = Address::generate(&env);
        let resolver = Address::generate(&env);
        let contract_id = env.register(Resolution, (admin, 50u64));
        let client = ResolutionClient::new(&env, &contract_id);

        client.propose_resolution(
            &resolver,
            &Outcome::Yes,
            &String::from_str(&env, "ipfs://proof"),
        );

        env.ledger().set(LedgerInfo {
            protocol_version: 25,
            sequence_number: 2,
            timestamp: 151,
            network_id: Default::default(),
            base_reserve: 10,
            min_temp_entry_ttl: 16,
            min_persistent_entry_ttl: 16,
            max_entry_ttl: 1_000,
        });

        let outcome = client.finalize_resolution();
        assert_eq!(outcome, Outcome::Yes);
    }
}
