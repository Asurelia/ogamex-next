-- ============================================================================
-- OGameX Exploration System Migration
-- Creates fog of war, system connections, discoveries, and visibility functions
-- ============================================================================

-- ============================================================================
-- TABLE: system_connections (Hyperlanes between systems)
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_a_id UUID NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,
    system_b_id UUID NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL DEFAULT 'hyperlane' CHECK (connection_type IN (
        'hyperlane',      -- Standard connection
        'wormhole',       -- Temporary wormhole (rare)
        'jump_gate'       -- Player-built jump gate
    )),
    distance INTEGER NOT NULL DEFAULT 1 CHECK (distance >= 1),  -- In "jumps"
    is_stable BOOLEAN NOT NULL DEFAULT TRUE,                     -- Wormholes can be unstable
    expires_at TIMESTAMPTZ,                                      -- For temporary wormholes
    discovered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraint: no self-connection
    CONSTRAINT no_self_connection CHECK (system_a_id != system_b_id),

    -- Ensure consistent ordering for bidirectional lookup (smaller UUID first)
    CONSTRAINT ordered_system_ids CHECK (system_a_id < system_b_id)
);

-- Unique constraint to prevent duplicate connections
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_unique ON system_connections(system_a_id, system_b_id);

-- Indexes for bidirectional search
CREATE INDEX IF NOT EXISTS idx_connections_system_a ON system_connections(system_a_id);
CREATE INDEX IF NOT EXISTS idx_connections_system_b ON system_connections(system_b_id);
CREATE INDEX IF NOT EXISTS idx_connections_type ON system_connections(connection_type);
CREATE INDEX IF NOT EXISTS idx_connections_expires ON system_connections(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- TABLE: player_discoveries (Personal fog of war)
-- ============================================================================
CREATE TABLE IF NOT EXISTS player_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    solar_system_id UUID NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,

    -- Discovery level (progression)
    discovery_level TEXT NOT NULL DEFAULT 'detected' CHECK (discovery_level IN (
        'detected',     -- Position known, no details
        'scanned',      -- Basic scan (star type, planet count)
        'explored',     -- Full exploration (all planets visible)
        'mapped'        -- Cartographed (can create Data Card)
    )),

    -- How the system was discovered
    discovered_via TEXT NOT NULL CHECK (discovered_via IN (
        'probe',            -- Exploration probe
        'exploration_ship', -- Explorer vessel
        'data_card',        -- Purchased/traded card
        'technology',       -- Unlocked via technology
        'event',            -- Event/drop
        'starting'          -- Starting system
    )),

    -- Scan quality (affects visible info, 0-100)
    scan_quality INTEGER NOT NULL DEFAULT 0 CHECK (scan_quality >= 0 AND scan_quality <= 100),

    -- First discoverer flag (global hall of fame)
    is_first_discoverer BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timestamps
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint: one discovery record per user per system
    UNIQUE(user_id, solar_system_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_discoveries_user ON player_discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_system ON player_discoveries(solar_system_id);
CREATE INDEX IF NOT EXISTS idx_discoveries_level ON player_discoveries(discovery_level);
CREATE INDEX IF NOT EXISTS idx_discoveries_first ON player_discoveries(is_first_discoverer) WHERE is_first_discoverer = TRUE;

-- ============================================================================
-- TABLE: first_discoveries (Global hall of fame)
-- ============================================================================
CREATE TABLE IF NOT EXISTS first_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solar_system_id UUID NOT NULL UNIQUE REFERENCES solar_systems(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Bonus information for first discoverer
    discovery_bonus_claimed BOOLEAN NOT NULL DEFAULT FALSE,
    bonus_type TEXT,
    bonus_amount INTEGER,

    -- Additional metadata
    discovery_method TEXT,  -- How they discovered it
    system_rarity TEXT      -- Rarity of the system (for scoring)
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_first_discoveries_user ON first_discoveries(user_id);
CREATE INDEX IF NOT EXISTS idx_first_discoveries_date ON first_discoveries(discovered_at DESC);

-- ============================================================================
-- FUNCTION: generate_system_connections
-- Generates hyperlane connections for a solar system deterministically
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_system_connections(p_system_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_system RECORD;
    v_galaxy RECORD;
    v_star_type RECORD;
    v_system_seed BIGINT;
    v_connection_count INTEGER;
    v_max_connections INTEGER := 6;
    v_min_connections INTEGER := 1;
    v_black_hole_bonus INTEGER := 3;
    v_wormhole_chance DOUBLE PRECISION := 0.02;  -- 2% chance
    v_nearby_systems RECORD;
    v_target_system_id UUID;
    v_connection_type TEXT;
    v_ordered_a UUID;
    v_ordered_b UUID;
    v_created_count INTEGER := 0;
    v_rng_state BIGINT;
    v_max_search_range INTEGER := 50;  -- Search within 50 systems
    i INTEGER;
BEGIN
    -- Get system info
    SELECT ss.*, g.galaxy_index, g.seed AS galaxy_seed
    INTO v_system
    FROM solar_systems ss
    JOIN galaxies g ON ss.galaxy_id = g.id
    WHERE ss.id = p_system_id;

    IF v_system IS NULL THEN
        RAISE EXCEPTION 'Solar system not found: %', p_system_id;
    END IF;

    -- Check if connections already exist for this system
    IF EXISTS (
        SELECT 1 FROM system_connections
        WHERE system_a_id = p_system_id OR system_b_id = p_system_id
    ) THEN
        -- Already has connections, return existing count
        SELECT COUNT(*) INTO v_created_count
        FROM system_connections
        WHERE system_a_id = p_system_id OR system_b_id = p_system_id;
        RETURN v_created_count;
    END IF;

    -- Get star type info
    SELECT * INTO v_star_type FROM star_types WHERE id = v_system.star_type;

    -- Use system seed for deterministic random
    v_system_seed := v_system.seed;
    v_rng_state := v_system_seed;

    -- Calculate number of connections (1-6, bonus for black holes)
    v_connection_count := v_min_connections + (ABS(v_system_seed) % (v_max_connections - v_min_connections + 1))::INTEGER;

    -- Black hole bonus
    IF v_system.star_type = 'black_hole' THEN
        v_connection_count := v_connection_count + v_black_hole_bonus;
    END IF;

    -- Cap at max
    v_connection_count := LEAST(v_connection_count, v_max_connections + v_black_hole_bonus);

    -- Find nearby systems in the same galaxy and connect to them
    FOR i IN 1..v_connection_count LOOP
        -- Advance RNG state
        v_rng_state := (v_rng_state * 1103515245 + 12345) % 2147483648;

        -- Calculate target system index (nearby systems)
        -- Use a deterministic offset based on the seed
        DECLARE
            v_offset INTEGER;
            v_target_index INTEGER;
        BEGIN
            -- Generate offset: can be negative or positive, within search range
            v_offset := ((v_rng_state % (v_max_search_range * 2 + 1)) - v_max_search_range)::INTEGER;

            -- Avoid zero offset (would connect to self)
            IF v_offset = 0 THEN
                v_offset := 1;
            END IF;

            v_target_index := v_system.system_index + v_offset;

            -- Wrap around within valid range (1 to system_count)
            SELECT system_count INTO v_target_index
            FROM galaxies
            WHERE id = v_system.galaxy_id;

            v_target_index := v_system.system_index + v_offset;
            IF v_target_index < 1 THEN
                v_target_index := v_target_index + (SELECT system_count FROM galaxies WHERE id = v_system.galaxy_id);
            END IF;
            IF v_target_index > (SELECT system_count FROM galaxies WHERE id = v_system.galaxy_id) THEN
                v_target_index := v_target_index - (SELECT system_count FROM galaxies WHERE id = v_system.galaxy_id);
            END IF;

            -- Find or generate the target system
            SELECT id INTO v_target_system_id
            FROM solar_systems
            WHERE galaxy_id = v_system.galaxy_id AND system_index = v_target_index;

            -- If target system doesn't exist yet, generate it
            IF v_target_system_id IS NULL THEN
                v_target_system_id := generate_solar_system(v_system.galaxy_id, v_target_index);
            END IF;
        END;

        -- Skip if target is same as source (shouldn't happen but safety check)
        IF v_target_system_id = p_system_id THEN
            CONTINUE;
        END IF;

        -- Determine connection type (small chance for wormhole)
        v_rng_state := (v_rng_state * 1103515245 + 12345) % 2147483648;
        IF (v_rng_state % 100) / 100.0 < v_wormhole_chance THEN
            v_connection_type := 'wormhole';
        ELSE
            v_connection_type := 'hyperlane';
        END IF;

        -- Order system IDs for consistent storage
        IF p_system_id < v_target_system_id THEN
            v_ordered_a := p_system_id;
            v_ordered_b := v_target_system_id;
        ELSE
            v_ordered_a := v_target_system_id;
            v_ordered_b := p_system_id;
        END IF;

        -- Insert connection if it doesn't exist
        INSERT INTO system_connections (
            system_a_id,
            system_b_id,
            connection_type,
            distance,
            is_stable,
            expires_at
        ) VALUES (
            v_ordered_a,
            v_ordered_b,
            v_connection_type,
            1,  -- Base distance
            v_connection_type != 'wormhole',  -- Wormholes are unstable
            CASE
                WHEN v_connection_type = 'wormhole'
                THEN NOW() + INTERVAL '7 days' * (1 + (v_rng_state % 7))  -- 7-49 days
                ELSE NULL
            END
        )
        ON CONFLICT (system_a_id, system_b_id) DO NOTHING;

        IF FOUND THEN
            v_created_count := v_created_count + 1;
        END IF;
    END LOOP;

    RETURN v_created_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_connected_systems
-- Returns all systems connected to a given system
-- ============================================================================
CREATE OR REPLACE FUNCTION get_connected_systems(p_system_id UUID)
RETURNS TABLE (
    connected_system_id UUID,
    connection_type TEXT,
    distance INTEGER,
    is_stable BOOLEAN,
    expires_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        CASE
            WHEN sc.system_a_id = p_system_id THEN sc.system_b_id
            ELSE sc.system_a_id
        END AS connected_system_id,
        sc.connection_type,
        sc.distance,
        sc.is_stable,
        sc.expires_at
    FROM system_connections sc
    WHERE (sc.system_a_id = p_system_id OR sc.system_b_id = p_system_id)
      AND (sc.expires_at IS NULL OR sc.expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_visible_systems
-- Returns systems visible to a player (discovered + connected to discovered)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_visible_systems(p_user_id UUID)
RETURNS TABLE (
    solar_system_id UUID,
    galaxy_index INTEGER,
    system_index INTEGER,
    star_type TEXT,
    visibility_level TEXT,  -- 'detected', 'scanned', 'explored', 'mapped', 'connected'
    scan_quality INTEGER,
    discovered_at TIMESTAMPTZ,
    is_first_discoverer BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- Directly discovered systems
    SELECT DISTINCT
        pd.solar_system_id,
        g.galaxy_index,
        ss.system_index,
        ss.star_type,
        pd.discovery_level AS visibility_level,
        pd.scan_quality,
        pd.discovered_at,
        pd.is_first_discoverer
    FROM player_discoveries pd
    JOIN solar_systems ss ON pd.solar_system_id = ss.id
    JOIN galaxies g ON ss.galaxy_id = g.id
    WHERE pd.user_id = p_user_id

    UNION

    -- Systems connected to discovered systems (visible as 'detected')
    SELECT DISTINCT
        conn.connected_system_id AS solar_system_id,
        g.galaxy_index,
        ss.system_index,
        ss.star_type,
        'connected'::TEXT AS visibility_level,
        0 AS scan_quality,
        NULL::TIMESTAMPTZ AS discovered_at,
        FALSE AS is_first_discoverer
    FROM player_discoveries pd
    CROSS JOIN LATERAL get_connected_systems(pd.solar_system_id) conn
    JOIN solar_systems ss ON conn.connected_system_id = ss.id
    JOIN galaxies g ON ss.galaxy_id = g.id
    WHERE pd.user_id = p_user_id
      AND NOT EXISTS (
          -- Exclude systems already directly discovered
          SELECT 1 FROM player_discoveries pd2
          WHERE pd2.user_id = p_user_id
            AND pd2.solar_system_id = conn.connected_system_id
      );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: discover_system
-- Records a player's discovery of a system
-- ============================================================================
CREATE OR REPLACE FUNCTION discover_system(
    p_user_id UUID,
    p_system_id UUID,
    p_discovery_level TEXT DEFAULT 'detected',
    p_discovered_via TEXT DEFAULT 'probe',
    p_scan_quality INTEGER DEFAULT 50
)
RETURNS UUID AS $$
DECLARE
    v_discovery_id UUID;
    v_is_first BOOLEAN := FALSE;
    v_system RECORD;
    v_star_type RECORD;
    v_bonus_type TEXT;
    v_bonus_amount INTEGER;
BEGIN
    -- Get system info
    SELECT ss.*, st.id AS star_type_id, st.is_exotic
    INTO v_system
    FROM solar_systems ss
    JOIN star_types st ON ss.star_type = st.id
    WHERE ss.id = p_system_id;

    IF v_system IS NULL THEN
        RAISE EXCEPTION 'Solar system not found: %', p_system_id;
    END IF;

    -- Check if this is the first discovery globally
    IF NOT EXISTS (SELECT 1 FROM first_discoveries WHERE solar_system_id = p_system_id) THEN
        v_is_first := TRUE;

        -- Determine bonus based on star type rarity
        v_bonus_type := 'dark_matter';
        v_bonus_amount := CASE v_system.star_type_id
            WHEN 'black_hole' THEN 100
            WHEN 'neutron_star' THEN 50
            WHEN 'blue_giant' THEN 30
            WHEN 'white_giant' THEN 25
            WHEN 'red_giant' THEN 20
            WHEN 'white_dwarf' THEN 15
            ELSE 10
        END;

        -- Record first discovery
        INSERT INTO first_discoveries (
            solar_system_id,
            user_id,
            bonus_type,
            bonus_amount,
            discovery_method,
            system_rarity
        ) VALUES (
            p_system_id,
            p_user_id,
            v_bonus_type,
            v_bonus_amount,
            p_discovered_via,
            CASE
                WHEN v_system.is_exotic THEN 'exotic'
                WHEN v_system.star_type_id LIKE 'binary%' THEN 'binary'
                ELSE 'common'
            END
        );
    END IF;

    -- Insert or update player discovery
    INSERT INTO player_discoveries (
        user_id,
        solar_system_id,
        discovery_level,
        discovered_via,
        scan_quality,
        is_first_discoverer,
        discovered_at,
        last_scanned_at
    ) VALUES (
        p_user_id,
        p_system_id,
        p_discovery_level,
        p_discovered_via,
        p_scan_quality,
        v_is_first,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, solar_system_id) DO UPDATE
    SET
        discovery_level = CASE
            -- Only upgrade discovery level, never downgrade
            WHEN CASE player_discoveries.discovery_level
                WHEN 'detected' THEN 1
                WHEN 'scanned' THEN 2
                WHEN 'explored' THEN 3
                WHEN 'mapped' THEN 4
            END < CASE EXCLUDED.discovery_level
                WHEN 'detected' THEN 1
                WHEN 'scanned' THEN 2
                WHEN 'explored' THEN 3
                WHEN 'mapped' THEN 4
            END
            THEN EXCLUDED.discovery_level
            ELSE player_discoveries.discovery_level
        END,
        scan_quality = GREATEST(player_discoveries.scan_quality, EXCLUDED.scan_quality),
        last_scanned_at = NOW()
    RETURNING id INTO v_discovery_id;

    -- Generate connections for the discovered system
    PERFORM generate_system_connections(p_system_id);

    RETURN v_discovery_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: upgrade_discovery_level
-- Upgrades a player's discovery level for a system
-- ============================================================================
CREATE OR REPLACE FUNCTION upgrade_discovery_level(
    p_user_id UUID,
    p_system_id UUID,
    p_new_level TEXT,
    p_scan_quality INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_level TEXT;
    v_current_quality INTEGER;
    v_level_order INTEGER;
    v_new_level_order INTEGER;
BEGIN
    -- Get current discovery state
    SELECT discovery_level, scan_quality
    INTO v_current_level, v_current_quality
    FROM player_discoveries
    WHERE user_id = p_user_id AND solar_system_id = p_system_id;

    IF v_current_level IS NULL THEN
        -- No existing discovery, create new one
        PERFORM discover_system(p_user_id, p_system_id, p_new_level, 'exploration_ship', COALESCE(p_scan_quality, 50));
        RETURN TRUE;
    END IF;

    -- Convert levels to ordinals
    v_level_order := CASE v_current_level
        WHEN 'detected' THEN 1
        WHEN 'scanned' THEN 2
        WHEN 'explored' THEN 3
        WHEN 'mapped' THEN 4
    END;

    v_new_level_order := CASE p_new_level
        WHEN 'detected' THEN 1
        WHEN 'scanned' THEN 2
        WHEN 'explored' THEN 3
        WHEN 'mapped' THEN 4
    END;

    -- Only upgrade, never downgrade
    IF v_new_level_order > v_level_order THEN
        UPDATE player_discoveries
        SET
            discovery_level = p_new_level,
            scan_quality = GREATEST(scan_quality, COALESCE(p_scan_quality, scan_quality)),
            last_scanned_at = NOW()
        WHERE user_id = p_user_id AND solar_system_id = p_system_id;
        RETURN TRUE;
    END IF;

    -- Update scan quality even if level doesn't change
    IF p_scan_quality IS NOT NULL AND p_scan_quality > v_current_quality THEN
        UPDATE player_discoveries
        SET
            scan_quality = p_scan_quality,
            last_scanned_at = NOW()
        WHERE user_id = p_user_id AND solar_system_id = p_system_id;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE: get_or_generate_system to also generate connections
-- ============================================================================
CREATE OR REPLACE FUNCTION get_or_generate_system(p_galaxy_index INTEGER, p_system_index INTEGER)
RETURNS UUID AS $$
DECLARE
    v_galaxy_id UUID;
    v_system_id UUID;
BEGIN
    -- Get galaxy
    SELECT id INTO v_galaxy_id FROM galaxies WHERE galaxy_index = p_galaxy_index;
    IF v_galaxy_id IS NULL THEN
        RAISE EXCEPTION 'Galaxy % not found', p_galaxy_index;
    END IF;

    -- Generate or get system
    v_system_id := generate_solar_system(v_galaxy_id, p_system_index);

    -- Generate bodies if needed
    IF NOT (SELECT is_generated FROM solar_systems WHERE id = v_system_id) THEN
        PERFORM generate_celestial_bodies(v_system_id);
    END IF;

    -- Generate connections for the system
    PERFORM generate_system_connections(v_system_id);

    RETURN v_system_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Mark starting system as explored for new users
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_starting_system_explored()
RETURNS TRIGGER AS $$
DECLARE
    v_colony RECORD;
    v_system_id UUID;
BEGIN
    -- Get the user's homeworld colony
    SELECT pc.*, cb.solar_system_id
    INTO v_colony
    FROM player_colonies pc
    JOIN celestial_bodies cb ON pc.celestial_body_id = cb.id
    WHERE pc.user_id = NEW.id AND pc.is_homeworld = TRUE
    LIMIT 1;

    IF v_colony IS NOT NULL THEN
        -- Mark the starting system as explored
        PERFORM discover_system(
            NEW.id,
            v_colony.solar_system_id,
            'explored',
            'starting',
            100  -- Perfect scan quality for starting system
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to mark starting system (runs after colony creation)
-- Note: This needs to run AFTER create_initial_colony
CREATE OR REPLACE FUNCTION mark_starting_system_after_colony()
RETURNS TRIGGER AS $$
DECLARE
    v_system_id UUID;
BEGIN
    -- Get the system ID for the colony's celestial body
    SELECT cb.solar_system_id INTO v_system_id
    FROM celestial_bodies cb
    WHERE cb.id = NEW.celestial_body_id;

    IF v_system_id IS NOT NULL THEN
        -- Mark the system as explored for the user
        PERFORM discover_system(
            NEW.user_id,
            v_system_id,
            'explored',
            'starting',
            100
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on player_colonies table
DROP TRIGGER IF EXISTS on_colony_created_discover_system ON player_colonies;
CREATE TRIGGER on_colony_created_discover_system
    AFTER INSERT ON player_colonies
    FOR EACH ROW
    WHEN (NEW.is_homeworld = TRUE)
    EXECUTE FUNCTION mark_starting_system_after_colony();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE system_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_discoveries ENABLE ROW LEVEL SECURITY;

-- system_connections: Readable by all, writeable by system only
DROP POLICY IF EXISTS connections_select ON system_connections;
CREATE POLICY connections_select ON system_connections
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS connections_insert ON system_connections;
CREATE POLICY connections_insert ON system_connections
    FOR INSERT WITH CHECK (TRUE);  -- System-generated

DROP POLICY IF EXISTS connections_update ON system_connections;
CREATE POLICY connections_update ON system_connections
    FOR UPDATE USING (TRUE);  -- For wormhole expiration updates

-- player_discoveries: Users can manage their own
DROP POLICY IF EXISTS discoveries_select ON player_discoveries;
CREATE POLICY discoveries_select ON player_discoveries
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS discoveries_insert ON player_discoveries;
CREATE POLICY discoveries_insert ON player_discoveries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS discoveries_update ON player_discoveries;
CREATE POLICY discoveries_update ON player_discoveries
    FOR UPDATE USING (auth.uid() = user_id);

-- first_discoveries: Readable by all (hall of fame)
DROP POLICY IF EXISTS first_discoveries_select ON first_discoveries;
CREATE POLICY first_discoveries_select ON first_discoveries
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS first_discoveries_insert ON first_discoveries;
CREATE POLICY first_discoveries_insert ON first_discoveries
    FOR INSERT WITH CHECK (TRUE);  -- System-managed

-- ============================================================================
-- VIEW: player_galaxy_view (Galaxy view with fog of war applied)
-- ============================================================================
CREATE OR REPLACE VIEW player_galaxy_view AS
SELECT
    g.galaxy_index AS galaxy,
    ss.system_index AS system,
    cb.orbital_position AS position,
    cb.id AS celestial_body_id,
    pc.id AS colony_id,
    ss.id AS solar_system_id,

    -- System info (always visible if system is visible)
    ss.star_type,
    st.color AS star_color,
    st.name AS star_name,
    ss.planet_count,

    -- Fog of war: only show details based on discovery level
    pd.discovery_level,
    pd.scan_quality,
    pd.is_first_discoverer,
    pd.user_id AS discovered_by_user_id,

    -- Colony info (only visible if explored or higher)
    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN pc.id
        ELSE NULL
    END AS visible_colony_id,

    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN COALESCE(pc.name, cb.name)
        WHEN pd.discovery_level = 'scanned' THEN cb.name
        ELSE '???'
    END AS planet_name,

    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN cb.body_type::TEXT
        WHEN pd.discovery_level = 'scanned' THEN cb.body_type::TEXT
        ELSE 'unknown'
    END AS planet_type,

    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN pc.user_id
        ELSE NULL
    END AS owner_user_id,

    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN u.username
        ELSE NULL
    END AS owner_username,

    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN a.tag
        ELSE NULL
    END AS alliance_tag,

    -- Physical properties (visible based on scan quality)
    CASE
        WHEN pd.scan_quality >= 30 THEN cb.fields_max
        ELSE NULL
    END AS fields_max,

    CASE
        WHEN pd.scan_quality >= 50 THEN cb.diameter
        ELSE NULL
    END AS diameter,

    CASE
        WHEN pd.scan_quality >= 70 THEN cb.temperature_min
        ELSE NULL
    END AS temperature_min,

    CASE
        WHEN pd.scan_quality >= 70 THEN cb.temperature_max
        ELSE NULL
    END AS temperature_max,

    cb.is_colonizable,

    -- Moon info (only if explored)
    CASE
        WHEN pd.discovery_level IN ('explored', 'mapped') THEN EXISTS (
            SELECT 1 FROM celestial_bodies moon
            WHERE moon.parent_body_id = cb.id
        )
        ELSE FALSE
    END AS has_moon,

    -- Debris (always visible for discovered systems)
    COALESCE(df.metal, 0) AS debris_metal,
    COALESCE(df.crystal, 0) AS debris_crystal,

    -- Connection info
    (
        SELECT array_agg(json_build_object(
            'system_id', conn.connected_system_id,
            'type', conn.connection_type,
            'distance', conn.distance
        ))
        FROM get_connected_systems(ss.id) conn
    ) AS connections

FROM solar_systems ss
JOIN galaxies g ON ss.galaxy_id = g.id
JOIN star_types st ON ss.star_type = st.id
LEFT JOIN celestial_bodies cb ON cb.solar_system_id = ss.id AND cb.parent_body_id IS NULL
LEFT JOIN player_discoveries pd ON pd.solar_system_id = ss.id
LEFT JOIN player_colonies pc ON pc.celestial_body_id = cb.id AND pc.destroyed = FALSE
LEFT JOIN users u ON pc.user_id = u.id
LEFT JOIN alliances a ON u.alliance_id = a.id
LEFT JOIN debris_fields df ON df.galaxy = g.galaxy_index AND df.system = ss.system_index AND df.position = cb.orbital_position
WHERE cb.body_type NOT IN ('moon', 'asteroid_field')
ORDER BY g.galaxy_index, ss.system_index, cb.orbital_position;

-- ============================================================================
-- FUNCTION: get_system_exploration_status
-- Returns exploration status for a specific system and user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_system_exploration_status(
    p_user_id UUID,
    p_system_id UUID
)
RETURNS TABLE (
    is_discovered BOOLEAN,
    discovery_level TEXT,
    scan_quality INTEGER,
    is_first_discoverer BOOLEAN,
    discovered_at TIMESTAMPTZ,
    discovered_via TEXT,
    connected_systems JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pd.id IS NOT NULL AS is_discovered,
        COALESCE(pd.discovery_level, 'unknown') AS discovery_level,
        COALESCE(pd.scan_quality, 0) AS scan_quality,
        COALESCE(pd.is_first_discoverer, FALSE) AS is_first_discoverer,
        pd.discovered_at,
        pd.discovered_via,
        (
            SELECT json_agg(json_build_object(
                'system_id', conn.connected_system_id,
                'type', conn.connection_type,
                'distance', conn.distance,
                'is_stable', conn.is_stable
            ))
            FROM get_connected_systems(p_system_id) conn
        ) AS connected_systems
    FROM solar_systems ss
    LEFT JOIN player_discoveries pd ON pd.solar_system_id = ss.id AND pd.user_id = p_user_id
    WHERE ss.id = p_system_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: claim_first_discovery_bonus
-- Claims the bonus for being the first discoverer
-- ============================================================================
CREATE OR REPLACE FUNCTION claim_first_discovery_bonus(
    p_user_id UUID,
    p_system_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_bonus RECORD;
    v_result JSONB;
BEGIN
    -- Get and lock the first discovery record
    SELECT * INTO v_bonus
    FROM first_discoveries
    WHERE solar_system_id = p_system_id
      AND user_id = p_user_id
      AND discovery_bonus_claimed = FALSE
    FOR UPDATE;

    IF v_bonus IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'No unclaimed bonus found for this system'
        );
    END IF;

    -- Apply bonus based on type
    IF v_bonus.bonus_type = 'dark_matter' THEN
        UPDATE users
        SET dark_matter = dark_matter + v_bonus.bonus_amount
        WHERE id = p_user_id;
    END IF;

    -- Mark bonus as claimed
    UPDATE first_discoveries
    SET discovery_bonus_claimed = TRUE
    WHERE id = v_bonus.id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'bonus_type', v_bonus.bonus_type,
        'bonus_amount', v_bonus.bonus_amount,
        'system_rarity', v_bonus.system_rarity
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: cleanup_expired_wormholes
-- Removes expired wormhole connections
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_wormholes()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM system_connections
    WHERE connection_type = 'wormhole'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEX: Additional performance indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_solar_systems_star_type ON solar_systems(star_type);

-- ============================================================================
-- COMMENT: Document the tables
-- ============================================================================
COMMENT ON TABLE system_connections IS 'Hyperlane/wormhole connections between solar systems';
COMMENT ON TABLE player_discoveries IS 'Per-player fog of war tracking for discovered systems';
COMMENT ON TABLE first_discoveries IS 'Hall of fame for first discoverers of each system';
COMMENT ON FUNCTION generate_system_connections IS 'Deterministically generates hyperlane connections for a system based on its seed';
COMMENT ON FUNCTION get_visible_systems IS 'Returns all systems visible to a player including connected systems';
COMMENT ON FUNCTION discover_system IS 'Records a player discovery and handles first discoverer bonuses';
COMMENT ON VIEW player_galaxy_view IS 'Galaxy view with fog of war applied based on player discoveries';
