create extension if not exists pgcrypto;

create table if not exists auth_challenges (
    id uuid primary key,
    wallet_address text not null,
    challenge_text text not null,
    agent_name text,
    expires_at timestamptz not null,
    consumed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists auth_challenges_wallet_idx
    on auth_challenges (wallet_address, expires_at desc);

create table if not exists markets (
    id text primary key,
    contract_market_id text unique,
    market_core_contract_id text,
    resolution_contract_id text,
    creator_wallet text not null,
    title text not null,
    description text not null,
    category text not null,
    status text not null,
    collateral_asset text not null,
    close_time timestamptz not null,
    resolve_time timestamptz not null,
    resolution_policy jsonb not null,
    semantic_metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists markets_status_category_idx
    on markets (status, category, close_time desc);

create table if not exists agents (
    id uuid primary key default gen_random_uuid(),
    owner_wallet text not null,
    agent_wallet text not null unique,
    name text not null,
    description text not null,
    agent_type text not null,
    provider_kind text not null,
    provider_reference text,
    status text not null,
    config jsonb not null default '{}'::jsonb,
    risk_limits jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists agents_owner_status_idx
    on agents (owner_wallet, status, created_at desc);

create table if not exists orders (
    id uuid primary key default gen_random_uuid(),
    market_id text not null references markets (id),
    wallet_address text not null,
    agent_id uuid references agents (id),
    side text not null,
    action text not null,
    price numeric(20, 8) not null,
    shares numeric(30, 8) not null,
    status text not null,
    expires_at timestamptz not null,
    nonce text not null,
    signature text not null,
    order_hash text not null unique,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    cancelled_at timestamptz,
    rejection_reason_code text,
    rejection_details jsonb
);

create index if not exists orders_market_status_idx
    on orders (market_id, status, created_at desc);

create index if not exists orders_wallet_created_idx
    on orders (wallet_address, created_at desc);

create table if not exists fills (
    id uuid primary key default gen_random_uuid(),
    market_id text not null references markets (id),
    buy_order_id uuid references orders (id),
    sell_order_id uuid references orders (id),
    buyer_wallet text not null,
    seller_wallet text not null,
    side text not null,
    price numeric(20, 8) not null,
    shares numeric(30, 8) not null,
    settlement_id text not null unique,
    settlement_status text not null,
    settlement_tx_hash text,
    created_at timestamptz not null default now(),
    settled_at timestamptz
);

create index if not exists fills_market_created_idx
    on fills (market_id, created_at desc);

create table if not exists audit_logs (
    id uuid primary key default gen_random_uuid(),
    trace_id text not null,
    actor_type text not null,
    actor_id text not null,
    event_type text not null,
    entity_type text not null,
    entity_id text not null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists audit_logs_trace_idx
    on audit_logs (trace_id, created_at desc);
