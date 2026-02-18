-- Fleet Missions
CREATE TABLE IF NOT EXISTS public.fleet_missions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Origin
    origin_planet_id bigint, -- Can be null for now if we don't strict link
    origin_galaxy int NOT NULL,
    origin_system int NOT NULL,
    origin_position int NOT NULL,

    -- Destination
    destination_galaxy int NOT NULL,
    destination_system int NOT NULL,
    destination_position int NOT NULL,
    destination_type text NOT NULL, -- 'Planet', 'Moon', 'Debris'

    -- Mission Details
    mission_type text NOT NULL, -- 'Attack', 'Transport', etc.
    ships jsonb NOT NULL DEFAULT '{}',
    cargo_resources jsonb NOT NULL DEFAULT '{"metal": 0, "crystal": 0, "deuterium": 0}',

    -- Timing
    departed_at timestamptz DEFAULT now(),
    arrives_at timestamptz NOT NULL,
    returns_at timestamptz,

    -- Status
    is_returning boolean DEFAULT false,
    processed boolean DEFAULT false,
    cancelled boolean DEFAULT false,
    
    created_at timestamptz DEFAULT now()
);

-- Realtime
alter publication supabase_realtime add table public.fleet_missions;
