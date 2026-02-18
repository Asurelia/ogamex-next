-- Inventory System
-- Defines containers and items within them.

CREATE TABLE IF NOT EXISTS public.containers (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text,
    max_capacity numeric DEFAULT 0, -- 0 = unlimited
    location_id bigint, -- Referential ID to station/planet/moon/ship
    flag int DEFAULT 0, -- Type of container (Hangar, Cargo, etc.)
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    container_id bigint REFERENCES public.containers(id) ON DELETE CASCADE,
    type_id int NOT NULL,
    quantity bigint NOT NULL DEFAULT 1,
    flag int DEFAULT 4, -- Hangar by default
    singleton boolean DEFAULT false,
    attributes jsonb DEFAULT '{}', -- Custom attributes for unique items
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Market System
-- Defines buy/sell orders and trade history.

CREATE TABLE IF NOT EXISTS public.market_orders (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    character_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type_id int NOT NULL,
    region_id int NOT NULL,
    station_id int NOT NULL,
    is_buy_order boolean NOT NULL DEFAULT false, -- true = Buy, false = Sell
    price numeric NOT NULL,
    volume_total bigint NOT NULL,
    volume_remaining bigint NOT NULL,
    min_volume bigint DEFAULT 1,
    duration int DEFAULT 90, -- days
    issued_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    state int DEFAULT 0, -- 0=Open, 1=Fulfilled, 2=Expired, 3=Cancelled
    escrow numeric DEFAULT 0 -- For buy orders
);

CREATE TABLE IF NOT EXISTS public.market_history (
    id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    region_id int NOT NULL,
    type_id int NOT NULL,
    date date NOT NULL,
    average_price numeric NOT NULL,
    highest_price numeric NOT NULL,
    lowest_price numeric NOT NULL,
    volume bigint NOT NULL,
    order_count int NOT NULL,
    UNIQUE(region_id, type_id, date)
);

-- Realtime subscriptions
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.market_orders;
