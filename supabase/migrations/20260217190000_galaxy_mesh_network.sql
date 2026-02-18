-- ============================================================================
-- GALAXY MESH NETWORK & GALACTIC CENTER
-- ============================================================================
-- This migration adds:
-- 1. Galactic center support (central black hole)
-- 2. Proper mesh network connections (1-5 per system)
-- 3. Connection generation function
-- 4. Event system for procedural events
-- ============================================================================

-- ============================================================================
-- 1. ADD GALACTIC CENTER MARKER TO SOLAR SYSTEMS
-- ============================================================================

ALTER TABLE solar_systems
ADD COLUMN IF NOT EXISTS is_galactic_center BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distance_from_center DOUBLE PRECISION DEFAULT 0;

COMMENT ON COLUMN solar_systems.is_galactic_center IS 'True if this is the central black hole system';
COMMENT ON COLUMN solar_systems.distance_from_center IS 'Pre-calculated distance from galactic center for fast lookups';

-- Index for galactic center queries
CREATE INDEX IF NOT EXISTS idx_solar_systems_galactic_center
ON solar_systems(galaxy_id, is_galactic_center)
WHERE is_galactic_center = TRUE;

-- ============================================================================
-- 2. PROCEDURAL EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS galaxy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    galaxy_id UUID NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
    solar_system_id UUID REFERENCES solar_systems(id) ON DELETE CASCADE,

    -- Event type and data
    event_type TEXT NOT NULL CHECK (event_type IN (
        'pirate_attack',      -- Pirates attacking ships
        'derelict_ship',      -- Abandoned ship with loot
        'asteroid_storm',     -- Temporary danger
        'wormhole_spawn',     -- New connection appears
        'supernova_warning',  -- System about to explode
        'merchant_convoy',    -- Trade opportunity
        'distress_signal',    -- Rescue mission
        'anomaly_detected',   -- Research opportunity
        'resource_deposit',   -- Bonus resources available
        'alien_artifact'      -- Special discovery
    )),

    -- Event timing
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_hours INTEGER NOT NULL DEFAULT 2,

    -- Event data
    title TEXT NOT NULL,
    description TEXT,
    rewards JSONB DEFAULT '{}',
    requirements JSONB DEFAULT '{}',
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 10),

    -- Participation tracking
    max_participants INTEGER DEFAULT 1,
    current_participants INTEGER DEFAULT 0,
    completed_by UUID[] DEFAULT '{}',

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for event queries
CREATE INDEX idx_galaxy_events_active ON galaxy_events(galaxy_id, status, expires_at) WHERE status = 'active';
CREATE INDEX idx_galaxy_events_system ON galaxy_events(solar_system_id, status) WHERE status = 'active';

COMMENT ON TABLE galaxy_events IS 'Procedural events that spawn in the galaxy';

-- ============================================================================
-- 3. FUNCTION TO GENERATE MESH CONNECTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_system_connections(
    p_galaxy_id UUID,
    p_min_connections INTEGER DEFAULT 1,
    p_max_connections INTEGER DEFAULT 5
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_system RECORD;
    v_target RECORD;
    v_connection_count INTEGER;
    v_target_count INTEGER;
    v_new_connections INTEGER := 0;
    v_existing_count INTEGER;
    v_distance DOUBLE PRECISION;
    v_max_distance DOUBLE PRECISION := 100.0; -- Max connection distance
BEGIN
    -- Loop through all systems in the galaxy
    FOR v_system IN
        SELECT id, position_x, position_y, position_z, star_type
        FROM solar_systems
        WHERE galaxy_id = p_galaxy_id
    LOOP
        -- Count existing connections for this system
        SELECT COUNT(*) INTO v_existing_count
        FROM system_connections
        WHERE system_a_id = v_system.id OR system_b_id = v_system.id;

        -- Skip if already has enough connections
        IF v_existing_count >= p_max_connections THEN
            CONTINUE;
        END IF;

        -- Determine how many connections to add (1-5 total, minus existing)
        v_target_count := LEAST(
            p_max_connections - v_existing_count,
            p_min_connections + (RANDOM() * (p_max_connections - p_min_connections))::INTEGER
        );

        IF v_target_count <= 0 THEN
            CONTINUE;
        END IF;

        v_connection_count := 0;

        -- Find nearest systems to connect to
        FOR v_target IN
            SELECT
                ss.id,
                ss.position_x,
                ss.position_y,
                ss.position_z,
                SQRT(
                    POWER(ss.position_x - v_system.position_x, 2) +
                    POWER(ss.position_y - v_system.position_y, 2) +
                    POWER(ss.position_z - v_system.position_z, 2)
                ) as distance
            FROM solar_systems ss
            WHERE ss.galaxy_id = p_galaxy_id
              AND ss.id != v_system.id
              -- Not already connected
              AND NOT EXISTS (
                  SELECT 1 FROM system_connections sc
                  WHERE (sc.system_a_id = v_system.id AND sc.system_b_id = ss.id)
                     OR (sc.system_a_id = ss.id AND sc.system_b_id = v_system.id)
              )
              -- Within max distance
              AND SQRT(
                  POWER(ss.position_x - v_system.position_x, 2) +
                  POWER(ss.position_y - v_system.position_y, 2) +
                  POWER(ss.position_z - v_system.position_z, 2)
              ) <= v_max_distance
            ORDER BY distance
            LIMIT v_target_count
        LOOP
            -- Calculate actual distance
            v_distance := SQRT(
                POWER(v_target.position_x - v_system.position_x, 2) +
                POWER(v_target.position_y - v_system.position_y, 2) +
                POWER(v_target.position_z - v_system.position_z, 2)
            );

            -- Create connection
            INSERT INTO system_connections (
                system_a_id,
                system_b_id,
                connection_type,
                distance,
                is_stable
            ) VALUES (
                LEAST(v_system.id, v_target.id),
                GREATEST(v_system.id, v_target.id),
                'hyperlane',
                CEIL(v_distance / 10)::INTEGER,
                TRUE
            )
            ON CONFLICT DO NOTHING;

            v_connection_count := v_connection_count + 1;
            v_new_connections := v_new_connections + 1;

            IF v_connection_count >= v_target_count THEN
                EXIT;
            END IF;
        END LOOP;
    END LOOP;

    RETURN v_new_connections;
END;
$$;

COMMENT ON FUNCTION generate_system_connections IS
'Generates mesh network connections between systems (1-5 per system)';

-- ============================================================================
-- 4. FUNCTION TO CREATE GALACTIC CENTER
-- ============================================================================

CREATE OR REPLACE FUNCTION create_galactic_center(
    p_galaxy_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_galaxy RECORD;
    v_center_id UUID;
BEGIN
    -- Get galaxy info
    SELECT * INTO v_galaxy FROM galaxies WHERE id = p_galaxy_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Galaxy not found: %', p_galaxy_id;
    END IF;

    -- Check if center already exists
    SELECT id INTO v_center_id
    FROM solar_systems
    WHERE galaxy_id = p_galaxy_id AND is_galactic_center = TRUE
    LIMIT 1;

    IF v_center_id IS NOT NULL THEN
        RETURN v_center_id;
    END IF;

    -- Create the galactic center system (at 0,0,0)
    INSERT INTO solar_systems (
        galaxy_id,
        system_index,
        seed,
        star_type,
        secondary_star_type,
        planet_count,
        position_x,
        position_y,
        position_z,
        is_galactic_center,
        distance_from_center,
        is_generated
    ) VALUES (
        p_galaxy_id,
        0, -- Special index for center
        FLOOR(RANDOM() * 9223372036854775807)::BIGINT,
        'black_hole',
        NULL,
        0, -- Black holes have no planets
        0, -- Center X
        0, -- Center Y
        0, -- Center Z
        TRUE,
        0,
        TRUE
    )
    RETURNING id INTO v_center_id;

    -- Update distance_from_center for all systems
    UPDATE solar_systems
    SET distance_from_center = SQRT(
        POWER(position_x, 2) +
        POWER(position_y, 2) +
        POWER(position_z, 2)
    )
    WHERE galaxy_id = p_galaxy_id;

    RETURN v_center_id;
END;
$$;

COMMENT ON FUNCTION create_galactic_center IS
'Creates the central black hole system for a galaxy';

-- ============================================================================
-- 5. FUNCTION TO GET SYSTEM CONNECTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_system_connections(
    p_system_ids UUID[]
)
RETURNS TABLE (
    from_id UUID,
    to_id UUID,
    connection_type TEXT,
    distance INTEGER,
    is_stable BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.system_a_id as from_id,
        sc.system_b_id as to_id,
        sc.connection_type,
        sc.distance,
        sc.is_stable
    FROM system_connections sc
    WHERE sc.system_a_id = ANY(p_system_ids)
       OR sc.system_b_id = ANY(p_system_ids);
END;
$$;

COMMENT ON FUNCTION get_system_connections IS
'Get all connections for a list of system IDs';

-- ============================================================================
-- 6. FUNCTION TO SPAWN PROCEDURAL EVENT
-- ============================================================================

CREATE OR REPLACE FUNCTION spawn_galaxy_event(
    p_galaxy_id UUID,
    p_event_type TEXT,
    p_duration_hours INTEGER DEFAULT 2
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_system RECORD;
    v_event_id UUID;
    v_title TEXT;
    v_description TEXT;
    v_rewards JSONB;
    v_difficulty INTEGER;
BEGIN
    -- Select a random system in the galaxy
    SELECT * INTO v_system
    FROM solar_systems
    WHERE galaxy_id = p_galaxy_id
      AND is_galactic_center = FALSE
      AND star_type != 'black_hole'
    ORDER BY RANDOM()
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No suitable system found for event';
    END IF;

    -- Generate event details based on type
    CASE p_event_type
        WHEN 'pirate_attack' THEN
            v_title := 'Pirate Raid';
            v_description := 'A merchant vessel is under attack by pirates!';
            v_rewards := '{"metal": 5000, "crystal": 2000, "reputation": 10}';
            v_difficulty := 3;
        WHEN 'derelict_ship' THEN
            v_title := 'Derelict Ship Detected';
            v_description := 'An abandoned ship has been detected. Salvage operation available.';
            v_rewards := '{"metal": 3000, "crystal": 1500, "deuterium": 500}';
            v_difficulty := 2;
        WHEN 'wormhole_spawn' THEN
            v_title := 'Wormhole Detected';
            v_description := 'An unstable wormhole has appeared. Unknown destination.';
            v_rewards := '{"exploration_points": 100}';
            v_difficulty := 5;
        WHEN 'merchant_convoy' THEN
            v_title := 'Merchant Convoy';
            v_description := 'A merchant convoy is offering trading opportunities.';
            v_rewards := '{"trade_discount": 20}';
            v_difficulty := 1;
        WHEN 'distress_signal' THEN
            v_title := 'Distress Signal';
            v_description := 'A distress signal has been received. Rescue mission available.';
            v_rewards := '{"metal": 2000, "crystal": 1000, "reputation": 25}';
            v_difficulty := 4;
        WHEN 'anomaly_detected' THEN
            v_title := 'Space Anomaly';
            v_description := 'An unusual energy signature has been detected.';
            v_rewards := '{"research_points": 500}';
            v_difficulty := 3;
        WHEN 'resource_deposit' THEN
            v_title := 'Rich Asteroid Field';
            v_description := 'A dense asteroid field with valuable resources.';
            v_rewards := '{"metal": 10000, "crystal": 5000}';
            v_difficulty := 2;
        WHEN 'alien_artifact' THEN
            v_title := 'Alien Artifact';
            v_description := 'Sensors detect an artifact of unknown origin.';
            v_rewards := '{"dark_matter": 50, "research_points": 1000}';
            v_difficulty := 6;
        ELSE
            v_title := 'Unknown Event';
            v_description := 'Something unusual is happening.';
            v_rewards := '{}';
            v_difficulty := 1;
    END CASE;

    -- Create the event
    INSERT INTO galaxy_events (
        galaxy_id,
        solar_system_id,
        event_type,
        starts_at,
        expires_at,
        duration_hours,
        title,
        description,
        rewards,
        difficulty
    ) VALUES (
        p_galaxy_id,
        v_system.id,
        p_event_type,
        NOW(),
        NOW() + (p_duration_hours || ' hours')::INTERVAL,
        p_duration_hours,
        v_title,
        v_description,
        v_rewards,
        v_difficulty
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION spawn_galaxy_event IS
'Spawns a procedural event in a random system';

-- ============================================================================
-- 7. RPC TO GET CONNECTIONS FOR VISIBLE SYSTEMS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_connections_for_systems(
    p_system_ids UUID[]
)
RETURNS TABLE (
    system_a_id UUID,
    system_b_id UUID,
    connection_type TEXT,
    distance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sc.system_a_id,
        sc.system_b_id,
        sc.connection_type,
        sc.distance
    FROM system_connections sc
    WHERE (sc.system_a_id = ANY(p_system_ids) AND sc.system_b_id = ANY(p_system_ids))
      AND (sc.expires_at IS NULL OR sc.expires_at > NOW())
      AND sc.is_stable = TRUE;
END;
$$;

-- ============================================================================
-- 8. CREATE GALACTIC CENTER AND CONNECTIONS FOR EXISTING GALAXIES
-- ============================================================================

-- Create galactic center for galaxy 1
DO $$
DECLARE
    v_galaxy_id UUID;
    v_center_id UUID;
    v_connections INTEGER;
BEGIN
    -- Get galaxy 1
    SELECT id INTO v_galaxy_id FROM galaxies WHERE galaxy_index = 1;

    IF v_galaxy_id IS NOT NULL THEN
        -- Create galactic center
        v_center_id := create_galactic_center(v_galaxy_id);
        RAISE NOTICE 'Created galactic center: %', v_center_id;

        -- Generate mesh connections
        v_connections := generate_system_connections(v_galaxy_id, 1, 5);
        RAISE NOTICE 'Generated % connections', v_connections;
    END IF;
END $$;

-- ============================================================================
-- 9. AUTO-DISCOVER CONNECTED SYSTEMS FOR PLAYERS
-- ============================================================================

-- When a player explores a system, automatically reveal connected systems as "detected"
CREATE OR REPLACE FUNCTION auto_detect_connected_systems()
RETURNS TRIGGER AS $$
DECLARE
    v_connected_id UUID;
BEGIN
    -- Only trigger when discovery level changes to 'explored' or higher
    IF NEW.discovery_level IN ('explored', 'mapped') AND
       (OLD.discovery_level IS NULL OR OLD.discovery_level IN ('unknown', 'detected', 'scanned')) THEN

        -- Find all connected systems
        FOR v_connected_id IN
            SELECT CASE
                WHEN system_a_id = NEW.solar_system_id THEN system_b_id
                ELSE system_a_id
            END
            FROM system_connections
            WHERE system_a_id = NEW.solar_system_id OR system_b_id = NEW.solar_system_id
        LOOP
            -- Insert or update discovery for connected system as 'detected'
            INSERT INTO player_discoveries (
                user_id,
                solar_system_id,
                discovery_level,
                discovery_method
            ) VALUES (
                NEW.user_id,
                v_connected_id,
                'detected',
                'connection_reveal'
            )
            ON CONFLICT (user_id, solar_system_id)
            DO NOTHING; -- Don't downgrade existing discoveries
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_system_explored ON player_discoveries;
CREATE TRIGGER on_system_explored
    AFTER INSERT OR UPDATE ON player_discoveries
    FOR EACH ROW
    EXECUTE FUNCTION auto_detect_connected_systems();

-- ============================================================================
-- ANALYZE UPDATED TABLES
-- ============================================================================

ANALYZE solar_systems;
ANALYZE system_connections;
ANALYZE galaxy_events;
