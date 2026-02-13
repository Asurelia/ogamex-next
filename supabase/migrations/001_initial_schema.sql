-- ============================================================================
-- OGameX Database Schema for Supabase
-- Complete recreation of the OGameX database structure
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    lang TEXT DEFAULT 'en',
    dark_matter INTEGER DEFAULT 0,
    character_class TEXT CHECK (character_class IN ('collector', 'general', 'discoverer')),
    vacation_mode BOOLEAN DEFAULT FALSE,
    vacation_mode_until TIMESTAMPTZ,
    alliance_id UUID,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PLANETS TABLE
-- ============================================================================
CREATE TABLE planets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Homeworld',
    galaxy INTEGER NOT NULL CHECK (galaxy >= 1 AND galaxy <= 9),
    system INTEGER NOT NULL CHECK (system >= 1 AND system <= 499),
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 15),
    planet_type TEXT NOT NULL DEFAULT 'planet' CHECK (planet_type IN ('planet', 'moon')),

    -- Planet characteristics
    diameter INTEGER DEFAULT 12800,
    fields_used INTEGER DEFAULT 0,
    fields_max INTEGER DEFAULT 163,
    temp_min INTEGER DEFAULT -40,
    temp_max INTEGER DEFAULT 50,

    -- Resources
    metal DOUBLE PRECISION DEFAULT 500,
    metal_per_hour INTEGER DEFAULT 30,
    metal_max DOUBLE PRECISION DEFAULT 10000,
    crystal DOUBLE PRECISION DEFAULT 500,
    crystal_per_hour INTEGER DEFAULT 15,
    crystal_max DOUBLE PRECISION DEFAULT 10000,
    deuterium DOUBLE PRECISION DEFAULT 0,
    deuterium_per_hour INTEGER DEFAULT 0,
    deuterium_max DOUBLE PRECISION DEFAULT 10000,
    energy_used INTEGER DEFAULT 0,
    energy_max INTEGER DEFAULT 0,

    -- Buildings (Resources)
    metal_mine INTEGER DEFAULT 0,
    crystal_mine INTEGER DEFAULT 0,
    deuterium_synthesizer INTEGER DEFAULT 0,
    solar_plant INTEGER DEFAULT 0,
    fusion_plant INTEGER DEFAULT 0,
    metal_storage INTEGER DEFAULT 0,
    crystal_storage INTEGER DEFAULT 0,
    deuterium_tank INTEGER DEFAULT 0,

    -- Buildings (Facilities)
    robot_factory INTEGER DEFAULT 0,
    nanite_factory INTEGER DEFAULT 0,
    shipyard INTEGER DEFAULT 0,
    research_lab INTEGER DEFAULT 0,
    terraformer INTEGER DEFAULT 0,
    alliance_depot INTEGER DEFAULT 0,
    missile_silo INTEGER DEFAULT 0,
    space_dock INTEGER DEFAULT 0,

    -- Buildings (Moon only)
    lunar_base INTEGER DEFAULT 0,
    sensor_phalanx INTEGER DEFAULT 0,
    jump_gate INTEGER DEFAULT 0,

    -- Ships
    light_fighter INTEGER DEFAULT 0,
    heavy_fighter INTEGER DEFAULT 0,
    cruiser INTEGER DEFAULT 0,
    battleship INTEGER DEFAULT 0,
    battlecruiser INTEGER DEFAULT 0,
    bomber INTEGER DEFAULT 0,
    destroyer INTEGER DEFAULT 0,
    deathstar INTEGER DEFAULT 0,
    small_cargo INTEGER DEFAULT 0,
    large_cargo INTEGER DEFAULT 0,
    colony_ship INTEGER DEFAULT 0,
    recycler INTEGER DEFAULT 0,
    espionage_probe INTEGER DEFAULT 0,
    solar_satellite INTEGER DEFAULT 0,
    crawler INTEGER DEFAULT 0,
    reaper INTEGER DEFAULT 0,
    pathfinder INTEGER DEFAULT 0,

    -- Defense
    rocket_launcher INTEGER DEFAULT 0,
    light_laser INTEGER DEFAULT 0,
    heavy_laser INTEGER DEFAULT 0,
    gauss_cannon INTEGER DEFAULT 0,
    ion_cannon INTEGER DEFAULT 0,
    plasma_turret INTEGER DEFAULT 0,
    small_shield_dome INTEGER DEFAULT 0,
    large_shield_dome INTEGER DEFAULT 0,
    anti_ballistic_missile INTEGER DEFAULT 0,
    interplanetary_missile INTEGER DEFAULT 0,

    -- Timestamps
    last_resource_update TIMESTAMPTZ DEFAULT NOW(),
    destroyed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint on coordinates (only one planet per position)
    UNIQUE (galaxy, system, position, planet_type)
);

-- ============================================================================
-- USER RESEARCH TABLE
-- ============================================================================
CREATE TABLE user_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Technologies
    energy_technology INTEGER DEFAULT 0,
    laser_technology INTEGER DEFAULT 0,
    ion_technology INTEGER DEFAULT 0,
    hyperspace_technology INTEGER DEFAULT 0,
    plasma_technology INTEGER DEFAULT 0,

    -- Drives
    combustion_drive INTEGER DEFAULT 0,
    impulse_drive INTEGER DEFAULT 0,
    hyperspace_drive INTEGER DEFAULT 0,

    -- Other research
    espionage_technology INTEGER DEFAULT 0,
    computer_technology INTEGER DEFAULT 0,
    astrophysics INTEGER DEFAULT 0,
    intergalactic_research_network INTEGER DEFAULT 0,
    graviton_technology INTEGER DEFAULT 0,

    -- Combat research
    weapons_technology INTEGER DEFAULT 0,
    shielding_technology INTEGER DEFAULT 0,
    armor_technology INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BUILDING QUEUE TABLE
-- ============================================================================
CREATE TABLE building_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    building_id INTEGER NOT NULL,
    target_level INTEGER NOT NULL,
    metal_cost DOUBLE PRECISION NOT NULL,
    crystal_cost DOUBLE PRECISION NOT NULL,
    deuterium_cost DOUBLE PRECISION NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RESEARCH QUEUE TABLE
-- ============================================================================
CREATE TABLE research_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    research_id INTEGER NOT NULL,
    target_level INTEGER NOT NULL,
    metal_cost DOUBLE PRECISION NOT NULL,
    crystal_cost DOUBLE PRECISION NOT NULL,
    deuterium_cost DOUBLE PRECISION NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- UNIT QUEUE TABLE (Ships & Defense)
-- ============================================================================
CREATE TABLE unit_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    planet_id UUID NOT NULL REFERENCES planets(id) ON DELETE CASCADE,
    unit_id INTEGER NOT NULL,
    unit_type TEXT NOT NULL CHECK (unit_type IN ('ship', 'defense')),
    amount INTEGER NOT NULL,
    amount_completed INTEGER DEFAULT 0,
    metal_cost DOUBLE PRECISION NOT NULL,
    crystal_cost DOUBLE PRECISION NOT NULL,
    deuterium_cost DOUBLE PRECISION NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FLEET MISSIONS TABLE
-- ============================================================================
CREATE TABLE fleet_missions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_planet_id UUID NOT NULL REFERENCES planets(id),
    origin_galaxy INTEGER NOT NULL,
    origin_system INTEGER NOT NULL,
    origin_position INTEGER NOT NULL,
    destination_galaxy INTEGER NOT NULL,
    destination_system INTEGER NOT NULL,
    destination_position INTEGER NOT NULL,
    destination_type TEXT DEFAULT 'planet' CHECK (destination_type IN ('planet', 'moon', 'debris')),
    mission_type TEXT NOT NULL CHECK (mission_type IN (
        'attack', 'acs_attack', 'transport', 'deployment', 'acs_defend',
        'espionage', 'colonization', 'recycle', 'moon_destruction', 'expedition'
    )),

    -- Ships
    light_fighter INTEGER DEFAULT 0,
    heavy_fighter INTEGER DEFAULT 0,
    cruiser INTEGER DEFAULT 0,
    battleship INTEGER DEFAULT 0,
    battlecruiser INTEGER DEFAULT 0,
    bomber INTEGER DEFAULT 0,
    destroyer INTEGER DEFAULT 0,
    deathstar INTEGER DEFAULT 0,
    small_cargo INTEGER DEFAULT 0,
    large_cargo INTEGER DEFAULT 0,
    colony_ship INTEGER DEFAULT 0,
    recycler INTEGER DEFAULT 0,
    espionage_probe INTEGER DEFAULT 0,
    reaper INTEGER DEFAULT 0,
    pathfinder INTEGER DEFAULT 0,

    -- Resources being transported
    metal DOUBLE PRECISION DEFAULT 0,
    crystal DOUBLE PRECISION DEFAULT 0,
    deuterium DOUBLE PRECISION DEFAULT 0,

    -- Timing
    departed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    arrives_at TIMESTAMPTZ NOT NULL,
    returns_at TIMESTAMPTZ,

    -- Status
    returning BOOLEAN DEFAULT FALSE,
    processed BOOLEAN DEFAULT FALSE,
    cancelled BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN (
        'espionage', 'battle', 'transport', 'expedition', 'alliance', 'player', 'system'
    )),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ESPIONAGE REPORTS TABLE
-- ============================================================================
CREATE TABLE espionage_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id),
    target_planet_id UUID NOT NULL REFERENCES planets(id),
    resources JSONB NOT NULL,
    buildings JSONB,
    research JSONB,
    ships JSONB,
    defense JSONB,
    counter_espionage_chance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- BATTLE REPORTS TABLE
-- ============================================================================
CREATE TABLE battle_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attacker_id UUID NOT NULL REFERENCES users(id),
    defender_id UUID NOT NULL REFERENCES users(id),
    planet_id UUID NOT NULL REFERENCES planets(id),
    coordinates TEXT NOT NULL,
    winner TEXT CHECK (winner IN ('attacker', 'defender', 'draw')),
    rounds INTEGER DEFAULT 0,
    attacker_losses DOUBLE PRECISION DEFAULT 0,
    defender_losses DOUBLE PRECISION DEFAULT 0,
    loot_metal DOUBLE PRECISION DEFAULT 0,
    loot_crystal DOUBLE PRECISION DEFAULT 0,
    loot_deuterium DOUBLE PRECISION DEFAULT 0,
    debris_metal DOUBLE PRECISION DEFAULT 0,
    debris_crystal DOUBLE PRECISION DEFAULT 0,
    moon_created BOOLEAN DEFAULT FALSE,
    report_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ALLIANCES TABLE
-- ============================================================================
CREATE TABLE alliances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    tag TEXT UNIQUE NOT NULL CHECK (LENGTH(tag) <= 8),
    founder_id UUID NOT NULL REFERENCES users(id),
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to users for alliance
ALTER TABLE users ADD FOREIGN KEY (alliance_id) REFERENCES alliances(id) ON DELETE SET NULL;

-- ============================================================================
-- DEBRIS FIELDS TABLE
-- ============================================================================
CREATE TABLE debris_fields (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    galaxy INTEGER NOT NULL,
    system INTEGER NOT NULL,
    position INTEGER NOT NULL,
    metal DOUBLE PRECISION DEFAULT 0,
    crystal DOUBLE PRECISION DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (galaxy, system, position)
);

-- ============================================================================
-- HIGHSCORES TABLE
-- ============================================================================
CREATE TABLE highscores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_points DOUBLE PRECISION DEFAULT 0,
    economy_points DOUBLE PRECISION DEFAULT 0,
    research_points DOUBLE PRECISION DEFAULT 0,
    military_points DOUBLE PRECISION DEFAULT 0,
    rank INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- API TOKENS TABLE (for AI agents)
-- ============================================================================
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    abilities JSONB DEFAULT '["*"]'::jsonb,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_planets_user ON planets(user_id);
CREATE INDEX idx_planets_coordinates ON planets(galaxy, system, position);
CREATE INDEX idx_fleet_user ON fleet_missions(user_id);
CREATE INDEX idx_fleet_status ON fleet_missions(processed, returning);
CREATE INDEX idx_fleet_arrival ON fleet_missions(arrives_at);
CREATE INDEX idx_messages_user ON messages(user_id, deleted, read);
CREATE INDEX idx_building_queue_planet ON building_queue(planet_id);
CREATE INDEX idx_building_queue_end ON building_queue(ends_at);
CREATE INDEX idx_research_queue_user ON research_queue(user_id);
CREATE INDEX idx_unit_queue_planet ON unit_queue(planet_id);
CREATE INDEX idx_highscores_rank ON highscores(rank);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE planets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE espionage_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY users_select ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update ON users FOR UPDATE USING (auth.uid() = id);

-- Planets: users can manage their own, read all (for galaxy view)
CREATE POLICY planets_select ON planets FOR SELECT USING (true);
CREATE POLICY planets_insert ON planets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY planets_update ON planets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY planets_delete ON planets FOR DELETE USING (auth.uid() = user_id);

-- Research: users can manage their own
CREATE POLICY research_all ON user_research FOR ALL USING (auth.uid() = user_id);

-- Queues: users can manage their own
CREATE POLICY building_queue_all ON building_queue FOR ALL
    USING (EXISTS (SELECT 1 FROM planets WHERE planets.id = planet_id AND planets.user_id = auth.uid()));
CREATE POLICY research_queue_all ON research_queue FOR ALL USING (auth.uid() = user_id);
CREATE POLICY unit_queue_all ON unit_queue FOR ALL
    USING (EXISTS (SELECT 1 FROM planets WHERE planets.id = planet_id AND planets.user_id = auth.uid()));

-- Fleet: users can manage their own
CREATE POLICY fleet_all ON fleet_missions FOR ALL USING (auth.uid() = user_id);

-- Messages: users can manage their own
CREATE POLICY messages_all ON messages FOR ALL USING (auth.uid() = user_id);

-- Reports: users can read reports they're involved in
CREATE POLICY espionage_read ON espionage_reports FOR SELECT
    USING (auth.uid() = user_id OR auth.uid() = target_user_id);
CREATE POLICY battle_read ON battle_reports FOR SELECT
    USING (auth.uid() = attacker_id OR auth.uid() = defender_id);

-- API tokens: users can manage their own
CREATE POLICY tokens_all ON api_tokens FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update resources on a planet
CREATE OR REPLACE FUNCTION update_planet_resources(p_planet_id UUID)
RETURNS void AS $$
DECLARE
    planet_record RECORD;
    seconds_elapsed INTEGER;
BEGIN
    SELECT * INTO planet_record FROM planets WHERE id = p_planet_id;

    IF planet_record IS NULL THEN
        RETURN;
    END IF;

    seconds_elapsed := EXTRACT(EPOCH FROM (NOW() - planet_record.last_resource_update));

    IF seconds_elapsed > 0 THEN
        UPDATE planets SET
            metal = LEAST(metal + (metal_per_hour::DOUBLE PRECISION / 3600 * seconds_elapsed), metal_max),
            crystal = LEAST(crystal + (crystal_per_hour::DOUBLE PRECISION / 3600 * seconds_elapsed), crystal_max),
            deuterium = LEAST(deuterium + (deuterium_per_hour::DOUBLE PRECISION / 3600 * seconds_elapsed), deuterium_max),
            last_resource_update = NOW(),
            updated_at = NOW()
        WHERE id = p_planet_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create initial planet for new user
CREATE OR REPLACE FUNCTION create_initial_planet()
RETURNS TRIGGER AS $$
DECLARE
    random_galaxy INTEGER;
    random_system INTEGER;
    random_position INTEGER;
    planet_temp INTEGER;
BEGIN
    -- Find a random empty position
    random_galaxy := FLOOR(RANDOM() * 9) + 1;
    random_system := FLOOR(RANDOM() * 499) + 1;

    -- Find first available position
    SELECT position INTO random_position
    FROM generate_series(4, 12) AS position
    WHERE NOT EXISTS (
        SELECT 1 FROM planets
        WHERE galaxy = random_galaxy
        AND system = random_system
        AND planets.position = position
    )
    LIMIT 1;

    IF random_position IS NULL THEN
        random_position := 8; -- Fallback
    END IF;

    -- Calculate temperature based on position
    planet_temp := 130 - (random_position * 15);

    -- Create homeworld
    INSERT INTO planets (
        user_id, name, galaxy, system, position,
        diameter, fields_max, temp_min, temp_max,
        metal, crystal, deuterium
    ) VALUES (
        NEW.id, 'Homeworld', random_galaxy, random_system, random_position,
        12800, 163, planet_temp - 40, planet_temp,
        500, 500, 0
    );

    -- Create research record
    INSERT INTO user_research (user_id) VALUES (NEW.id);

    -- Create highscore record
    INSERT INTO highscores (user_id) VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create planet on user creation
CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_planet();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Galaxy view for browsing
CREATE OR REPLACE VIEW galaxy_view AS
SELECT
    p.galaxy,
    p.system,
    p.position,
    p.id AS planet_id,
    p.name AS planet_name,
    p.planet_type,
    p.user_id,
    u.username,
    a.tag AS alliance_tag,
    EXISTS (
        SELECT 1 FROM planets moon
        WHERE moon.galaxy = p.galaxy
        AND moon.system = p.system
        AND moon.position = p.position
        AND moon.planet_type = 'moon'
    ) AS has_moon,
    COALESCE(d.metal, 0) AS debris_metal,
    COALESCE(d.crystal, 0) AS debris_crystal
FROM planets p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN alliances a ON u.alliance_id = a.id
LEFT JOIN debris_fields d ON p.galaxy = d.galaxy AND p.system = d.system AND p.position = d.position
WHERE p.planet_type = 'planet' AND p.destroyed = FALSE;
