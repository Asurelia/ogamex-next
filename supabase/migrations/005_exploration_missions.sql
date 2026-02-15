-- ============================================================================
-- OGameX Exploration Missions Migration
-- Adds exploration mission types, table, and processing functions
-- Sprint 2: Missions d'Exploration
-- ============================================================================

-- ============================================================================
-- ADD NEW MISSION TYPES
-- ============================================================================

-- Add new exploration mission types to the enum
-- Note: Using text column check constraint for mission_type instead of enum
-- because fleet_missions already uses text

-- ============================================================================
-- TABLE: exploration_missions (Tracks exploration mission details)
-- ============================================================================
CREATE TABLE exploration_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fleet_mission_id UUID REFERENCES fleet_missions(id) ON DELETE SET NULL,

    -- Target system
    target_system_id UUID NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,

    -- Mission type
    mission_type TEXT NOT NULL CHECK (mission_type IN (
        'quick_scan',       -- 1h scan, basic detection
        'deep_scan',        -- 4h scan, full exploration
        'cartography',      -- 8h scan, can create data card
        'satellite_deploy'  -- Permanent surveillance satellite
    )),

    -- Fleet composition bonuses
    probe_count INTEGER NOT NULL DEFAULT 0,
    explorer_count INTEGER NOT NULL DEFAULT 0,
    cartographer_equipped BOOLEAN NOT NULL DEFAULT FALSE,

    -- Research bonus
    exploration_tech_level INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    arrives_at TIMESTAMPTZ NOT NULL,
    scan_duration_seconds INTEGER NOT NULL,
    completes_at TIMESTAMPTZ NOT NULL,

    -- Status and results
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
        'in_progress',
        'completed',
        'failed',
        'intercepted'
    )),
    results JSONB,
    -- Example results: {
    --   "discovery_level": "explored",
    --   "scan_quality": 85,
    --   "systems_detected": ["uuid1", "uuid2"],
    --   "special_findings": ["ancient_ruins", "resource_deposit"],
    --   "is_first_discoverer": true,
    --   "bonus_claimed": { "type": "dark_matter", "amount": 50 }
    -- }

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_exploration_missions_user ON exploration_missions(user_id);
CREATE INDEX idx_exploration_missions_status ON exploration_missions(status);
CREATE INDEX idx_exploration_missions_completes ON exploration_missions(completes_at)
    WHERE status = 'in_progress';
CREATE INDEX idx_exploration_missions_fleet ON exploration_missions(fleet_mission_id)
    WHERE fleet_mission_id IS NOT NULL;
CREATE INDEX idx_exploration_missions_system ON exploration_missions(target_system_id);

-- ============================================================================
-- TABLE: deployed_satellites (Permanent surveillance)
-- ============================================================================
CREATE TABLE deployed_satellites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    solar_system_id UUID NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,

    -- Satellite capabilities
    sensor_range INTEGER NOT NULL DEFAULT 1,           -- Systems visible around this one
    scan_quality_bonus INTEGER NOT NULL DEFAULT 10,    -- +% to scan quality
    detection_bonus FLOAT NOT NULL DEFAULT 0.1,        -- +% chance to detect events

    -- Durability
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    health INTEGER NOT NULL DEFAULT 100,
    destroyed_at TIMESTAMPTZ,
    destroyed_by UUID REFERENCES users(id),

    -- Metadata
    deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_via UUID REFERENCES exploration_missions(id),

    -- One satellite per system per user
    UNIQUE(user_id, solar_system_id)
);

CREATE INDEX idx_satellites_user ON deployed_satellites(user_id);
CREATE INDEX idx_satellites_system ON deployed_satellites(solar_system_id);
CREATE INDEX idx_satellites_active ON deployed_satellites(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- FUNCTION: calculate_scan_quality
-- Calculates scan quality based on fleet composition and tech level
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_scan_quality(
    p_probe_count INTEGER,
    p_explorer_count INTEGER,
    p_cartographer_equipped BOOLEAN,
    p_exploration_tech_level INTEGER,
    p_mission_type TEXT
)
RETURNS INTEGER AS $$
DECLARE
    v_base_quality INTEGER;
    v_quality INTEGER;
BEGIN
    -- Base quality by mission type
    v_base_quality := CASE p_mission_type
        WHEN 'quick_scan' THEN 20
        WHEN 'deep_scan' THEN 50
        WHEN 'cartography' THEN 80
        WHEN 'satellite_deploy' THEN 30
        ELSE 10
    END;

    -- Add probe bonus (+2 per probe, max +20)
    v_quality := v_base_quality + LEAST(p_probe_count * 2, 20);

    -- Add explorer bonus (+5 per explorer, max +25)
    v_quality := v_quality + LEAST(p_explorer_count * 5, 25);

    -- Add cartographer bonus (+15 if equipped)
    IF p_cartographer_equipped THEN
        v_quality := v_quality + 15;
    END IF;

    -- Add tech level bonus (+2 per level)
    v_quality := v_quality + (p_exploration_tech_level * 2);

    -- Cap at 100
    RETURN LEAST(v_quality, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: calculate_scan_duration
-- Calculates scan duration based on mission type and bonuses
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_scan_duration(
    p_mission_type TEXT,
    p_exploration_tech_level INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_base_duration INTEGER;
    v_reduction_factor FLOAT;
BEGIN
    -- Base duration in seconds
    v_base_duration := CASE p_mission_type
        WHEN 'quick_scan' THEN 3600        -- 1 hour
        WHEN 'deep_scan' THEN 14400        -- 4 hours
        WHEN 'cartography' THEN 28800      -- 8 hours
        WHEN 'satellite_deploy' THEN 7200  -- 2 hours (deployment time)
        ELSE 3600
    END;

    -- Tech level reduces duration (3% per level, max 30%)
    v_reduction_factor := GREATEST(0.7, 1.0 - (p_exploration_tech_level * 0.03));

    RETURN FLOOR(v_base_duration * v_reduction_factor);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- FUNCTION: create_exploration_mission
-- Creates a new exploration mission linked to a fleet mission
-- ============================================================================
CREATE OR REPLACE FUNCTION create_exploration_mission(
    p_user_id UUID,
    p_fleet_mission_id UUID,
    p_target_system_id UUID,
    p_mission_type TEXT,
    p_probe_count INTEGER DEFAULT 0,
    p_explorer_count INTEGER DEFAULT 0,
    p_cartographer_equipped BOOLEAN DEFAULT FALSE,
    p_exploration_tech_level INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    v_fleet_mission RECORD;
    v_scan_duration INTEGER;
    v_exploration_id UUID;
BEGIN
    -- Get fleet mission details
    SELECT * INTO v_fleet_mission
    FROM fleet_missions
    WHERE id = p_fleet_mission_id AND user_id = p_user_id;

    IF v_fleet_mission IS NULL THEN
        RAISE EXCEPTION 'Fleet mission not found: %', p_fleet_mission_id;
    END IF;

    -- Calculate scan duration
    v_scan_duration := calculate_scan_duration(p_mission_type, p_exploration_tech_level);

    -- Create exploration mission
    INSERT INTO exploration_missions (
        user_id,
        fleet_mission_id,
        target_system_id,
        mission_type,
        probe_count,
        explorer_count,
        cartographer_equipped,
        exploration_tech_level,
        started_at,
        arrives_at,
        scan_duration_seconds,
        completes_at
    ) VALUES (
        p_user_id,
        p_fleet_mission_id,
        p_target_system_id,
        p_mission_type,
        p_probe_count,
        p_explorer_count,
        p_cartographer_equipped,
        p_exploration_tech_level,
        NOW(),
        v_fleet_mission.arrives_at,
        v_scan_duration,
        v_fleet_mission.arrives_at + (v_scan_duration * INTERVAL '1 second')
    )
    RETURNING id INTO v_exploration_id;

    RETURN v_exploration_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: complete_exploration_mission
-- Completes an exploration mission and applies discoveries
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_exploration_mission(p_exploration_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_mission RECORD;
    v_scan_quality INTEGER;
    v_discovery_level TEXT;
    v_discovery_id UUID;
    v_is_first BOOLEAN := FALSE;
    v_connected_systems UUID[];
    v_results JSONB;
    v_special_findings TEXT[] := '{}';
BEGIN
    -- Get mission details
    SELECT * INTO v_mission
    FROM exploration_missions
    WHERE id = p_exploration_id AND status = 'in_progress'
    FOR UPDATE;

    IF v_mission IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Mission not found or already completed'
        );
    END IF;

    -- Calculate scan quality
    v_scan_quality := calculate_scan_quality(
        v_mission.probe_count,
        v_mission.explorer_count,
        v_mission.cartographer_equipped,
        v_mission.exploration_tech_level,
        v_mission.mission_type
    );

    -- Determine discovery level based on mission type
    v_discovery_level := CASE v_mission.mission_type
        WHEN 'quick_scan' THEN 'detected'
        WHEN 'deep_scan' THEN 'explored'
        WHEN 'cartography' THEN 'mapped'
        WHEN 'satellite_deploy' THEN 'scanned'
        ELSE 'detected'
    END;

    -- Apply discovery
    v_discovery_id := discover_system(
        v_mission.user_id,
        v_mission.target_system_id,
        v_discovery_level,
        'exploration_ship',
        v_scan_quality
    );

    -- Check if first discoverer
    SELECT is_first_discoverer INTO v_is_first
    FROM player_discoveries
    WHERE id = v_discovery_id;

    -- Get connected systems (also mark as detected)
    SELECT array_agg(connected_system_id) INTO v_connected_systems
    FROM get_connected_systems(v_mission.target_system_id);

    -- Auto-detect connected systems
    IF v_connected_systems IS NOT NULL THEN
        FOR i IN 1..array_length(v_connected_systems, 1) LOOP
            PERFORM discover_system(
                v_mission.user_id,
                v_connected_systems[i],
                'detected',
                'technology',
                LEAST(v_scan_quality / 3, 30)  -- Connected systems get lower quality
            );
        END LOOP;
    END IF;

    -- Roll for special findings (based on scan quality)
    IF random() < (v_scan_quality / 200.0) THEN
        v_special_findings := array_append(v_special_findings, 'ancient_ruins');
    END IF;
    IF random() < (v_scan_quality / 250.0) THEN
        v_special_findings := array_append(v_special_findings, 'resource_deposit');
    END IF;
    IF random() < (v_scan_quality / 300.0) THEN
        v_special_findings := array_append(v_special_findings, 'wormhole_signature');
    END IF;

    -- Handle satellite deployment
    IF v_mission.mission_type = 'satellite_deploy' THEN
        INSERT INTO deployed_satellites (
            user_id,
            solar_system_id,
            sensor_range,
            scan_quality_bonus,
            detection_bonus,
            deployed_via
        ) VALUES (
            v_mission.user_id,
            v_mission.target_system_id,
            1 + (v_mission.exploration_tech_level / 5),
            v_scan_quality / 10,
            0.05 + (v_mission.exploration_tech_level * 0.01),
            p_exploration_id
        )
        ON CONFLICT (user_id, solar_system_id) DO UPDATE
        SET
            sensor_range = GREATEST(deployed_satellites.sensor_range, EXCLUDED.sensor_range),
            scan_quality_bonus = GREATEST(deployed_satellites.scan_quality_bonus, EXCLUDED.scan_quality_bonus),
            detection_bonus = GREATEST(deployed_satellites.detection_bonus, EXCLUDED.detection_bonus),
            is_active = TRUE,
            health = 100;
    END IF;

    -- Build results
    v_results := jsonb_build_object(
        'discovery_level', v_discovery_level,
        'scan_quality', v_scan_quality,
        'systems_detected', v_connected_systems,
        'special_findings', v_special_findings,
        'is_first_discoverer', v_is_first,
        'satellite_deployed', v_mission.mission_type = 'satellite_deploy'
    );

    -- Update mission status
    UPDATE exploration_missions
    SET
        status = 'completed',
        results = v_results,
        updated_at = NOW()
    WHERE id = p_exploration_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'results', v_results
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_pending_exploration_missions
-- Gets exploration missions ready for completion
-- ============================================================================
CREATE OR REPLACE FUNCTION get_pending_exploration_missions(p_limit INTEGER DEFAULT 100)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    target_system_id UUID,
    mission_type TEXT,
    completes_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        em.id,
        em.user_id,
        em.target_system_id,
        em.mission_type,
        em.completes_at
    FROM exploration_missions em
    WHERE em.status = 'in_progress'
      AND em.completes_at <= NOW()
    ORDER BY em.completes_at ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_user_exploration_missions
-- Gets all exploration missions for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_exploration_missions(
    p_user_id UUID,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    fleet_mission_id UUID,
    target_system_id UUID,
    mission_type TEXT,
    status TEXT,
    probe_count INTEGER,
    explorer_count INTEGER,
    started_at TIMESTAMPTZ,
    arrives_at TIMESTAMPTZ,
    completes_at TIMESTAMPTZ,
    results JSONB,
    -- Additional computed fields
    galaxy_index INTEGER,
    system_index INTEGER,
    star_type TEXT,
    time_remaining_seconds INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        em.id,
        em.fleet_mission_id,
        em.target_system_id,
        em.mission_type,
        em.status,
        em.probe_count,
        em.explorer_count,
        em.started_at,
        em.arrives_at,
        em.completes_at,
        em.results,
        g.galaxy_index,
        ss.system_index,
        ss.star_type,
        CASE
            WHEN em.status = 'in_progress' AND em.completes_at > NOW()
            THEN EXTRACT(EPOCH FROM (em.completes_at - NOW()))::INTEGER
            ELSE 0
        END AS time_remaining_seconds
    FROM exploration_missions em
    JOIN solar_systems ss ON em.target_system_id = ss.id
    JOIN galaxies g ON ss.galaxy_id = g.id
    WHERE em.user_id = p_user_id
      AND (p_status IS NULL OR em.status = p_status)
    ORDER BY em.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: get_user_satellites
-- Gets all deployed satellites for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_satellites(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    solar_system_id UUID,
    galaxy_index INTEGER,
    system_index INTEGER,
    star_type TEXT,
    sensor_range INTEGER,
    scan_quality_bonus INTEGER,
    detection_bonus FLOAT,
    is_active BOOLEAN,
    health INTEGER,
    deployed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ds.id,
        ds.solar_system_id,
        g.galaxy_index,
        ss.system_index,
        ss.star_type,
        ds.sensor_range,
        ds.scan_quality_bonus,
        ds.detection_bonus,
        ds.is_active,
        ds.health,
        ds.deployed_at
    FROM deployed_satellites ds
    JOIN solar_systems ss ON ds.solar_system_id = ss.id
    JOIN galaxies g ON ss.galaxy_id = g.id
    WHERE ds.user_id = p_user_id
    ORDER BY ds.deployed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE exploration_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployed_satellites ENABLE ROW LEVEL SECURITY;

-- exploration_missions: Users can view/manage their own
CREATE POLICY exploration_missions_select ON exploration_missions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY exploration_missions_insert ON exploration_missions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY exploration_missions_update ON exploration_missions
    FOR UPDATE USING (auth.uid() = user_id);

-- deployed_satellites: Users can view their own, others can see position only
CREATE POLICY satellites_select_own ON deployed_satellites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY satellites_insert ON deployed_satellites
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY satellites_update ON deployed_satellites
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE exploration_missions IS 'Tracks exploration mission progress and results';
COMMENT ON TABLE deployed_satellites IS 'Permanent surveillance satellites deployed in systems';
COMMENT ON FUNCTION calculate_scan_quality IS 'Calculates scan quality based on fleet composition and tech';
COMMENT ON FUNCTION calculate_scan_duration IS 'Calculates scan duration based on mission type and tech';
COMMENT ON FUNCTION create_exploration_mission IS 'Creates a new exploration mission linked to a fleet';
COMMENT ON FUNCTION complete_exploration_mission IS 'Completes an exploration mission and applies discoveries';
