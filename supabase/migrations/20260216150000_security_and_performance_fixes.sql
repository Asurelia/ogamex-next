-- ============================================================================
-- MIGRATION: Security Fixes - RLS Policies and Performance Indexes
-- Date: 2026-02-16
-- Applied successfully
-- ============================================================================

-- ============================================================================
-- 1. FIX MISSING RLS POLICIES ON building_queue AND unit_queue
-- ============================================================================

DROP POLICY IF EXISTS building_queue_all ON building_queue;
DROP POLICY IF EXISTS unit_queue_all ON unit_queue;

-- Building Queue policies
CREATE POLICY building_queue_select ON building_queue FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = building_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

CREATE POLICY building_queue_insert ON building_queue FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = building_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

CREATE POLICY building_queue_update ON building_queue FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = building_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

CREATE POLICY building_queue_delete ON building_queue FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = building_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

-- Unit Queue policies
CREATE POLICY unit_queue_select ON unit_queue FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = unit_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

CREATE POLICY unit_queue_insert ON unit_queue FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = unit_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

CREATE POLICY unit_queue_update ON unit_queue FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = unit_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

CREATE POLICY unit_queue_delete ON unit_queue FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM player_colonies
        WHERE player_colonies.id = unit_queue.planet_id
        AND player_colonies.user_id = (SELECT auth.uid())
    ));

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_player_discoveries_user_system
ON player_discoveries(user_id, solar_system_id);

CREATE INDEX IF NOT EXISTS idx_player_discoveries_user_level
ON player_discoveries(user_id, discovery_level);

CREATE INDEX IF NOT EXISTS idx_player_discoveries_first
ON player_discoveries(user_id) WHERE is_first_discoverer = true;

CREATE INDEX IF NOT EXISTS idx_acs_participants_operation
ON acs_participants(acs_operation_id);

CREATE INDEX IF NOT EXISTS idx_acs_participants_user
ON acs_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_market_listings_active
ON market_listings(status, item_type)
WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_building_queue_completion
ON building_queue(ends_at)
WHERE ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fleet_missions_active
ON fleet_missions(user_id, arrives_at)
WHERE processed = false;

CREATE INDEX IF NOT EXISTS idx_system_connections_lookup
ON system_connections(system_a_id, system_b_id);

-- ============================================================================
-- 3. OPTIMIZED BATCH FUNCTION FOR CONNECTED SYSTEMS
-- Replaces N+1 pattern in ExplorationService.getConnectedSystems()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_connected_systems_batch(
    p_system_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    connected_system_id UUID,
    connection_type TEXT,
    distance FLOAT,
    is_stable BOOLEAN,
    system_index INTEGER,
    star_type TEXT,
    galaxy_id UUID,
    galaxy_index INTEGER,
    galaxy_name TEXT,
    discovery_level TEXT,
    scan_quality INTEGER,
    is_first_discoverer BOOLEAN,
    discovered_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        ss.system_index,
        ss.star_type,
        g.id AS galaxy_id,
        g.galaxy_index,
        g.name AS galaxy_name,
        pd.discovery_level,
        pd.scan_quality,
        pd.is_first_discoverer,
        pd.discovered_at
    FROM system_connections sc
    JOIN solar_systems ss ON ss.id = CASE
        WHEN sc.system_a_id = p_system_id THEN sc.system_b_id
        ELSE sc.system_a_id
    END
    JOIN galaxies g ON g.id = ss.galaxy_id
    LEFT JOIN player_discoveries pd ON pd.solar_system_id = ss.id
        AND (p_user_id IS NULL OR pd.user_id = p_user_id)
    WHERE sc.system_a_id = p_system_id OR sc.system_b_id = p_system_id;
END;
$$;

-- ============================================================================
-- 4. OPTIMIZED EXPLORATION STATS FUNCTION
-- Replaces 4 separate queries in ExplorationService.getExplorationStats()
-- ============================================================================

CREATE OR REPLACE FUNCTION get_exploration_stats_optimized(p_user_id UUID)
RETURNS TABLE (
    total_discovered INTEGER,
    total_explored INTEGER,
    total_mapped INTEGER,
    first_discoveries INTEGER,
    bonuses_claimed INTEGER,
    galaxies_explored JSONB,
    recent_discoveries JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    WITH discovery_stats AS (
        SELECT
            COUNT(*)::INTEGER AS total_discovered,
            COUNT(*) FILTER (WHERE discovery_level IN ('explored', 'mapped'))::INTEGER AS total_explored,
            COUNT(*) FILTER (WHERE discovery_level = 'mapped')::INTEGER AS total_mapped,
            COUNT(*) FILTER (WHERE is_first_discoverer)::INTEGER AS first_discoveries
        FROM player_discoveries
        WHERE user_id = p_user_id
    ),
    bonus_stats AS (
        SELECT COUNT(*)::INTEGER AS bonuses_claimed
        FROM first_discoveries
        WHERE user_id = p_user_id AND discovery_bonus_claimed = true
    ),
    galaxy_stats AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'galaxy_id', g.id,
                'galaxy_name', g.name,
                'systems_discovered', COUNT(pd.id)
            )
        ) AS galaxies
        FROM galaxies g
        LEFT JOIN solar_systems ss ON ss.galaxy_id = g.id
        LEFT JOIN player_discoveries pd ON pd.solar_system_id = ss.id AND pd.user_id = p_user_id
        GROUP BY g.id, g.name
        HAVING COUNT(pd.id) > 0
    ),
    recent AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'system_id', pd.solar_system_id,
                'discovery_level', pd.discovery_level,
                'discovered_at', pd.discovered_at,
                'is_first', pd.is_first_discoverer,
                'star_type', ss.star_type
            ) ORDER BY pd.discovered_at DESC
        ) AS discoveries
        FROM (
            SELECT * FROM player_discoveries
            WHERE user_id = p_user_id
            ORDER BY discovered_at DESC
            LIMIT 10
        ) pd
        JOIN solar_systems ss ON ss.id = pd.solar_system_id
    )
    SELECT
        ds.total_discovered,
        ds.total_explored,
        ds.total_mapped,
        ds.first_discoveries,
        bs.bonuses_claimed,
        COALESCE(gs.galaxies, '[]'::jsonb),
        COALESCE(r.discoveries, '[]'::jsonb)
    FROM discovery_stats ds
    CROSS JOIN bonus_stats bs
    LEFT JOIN galaxy_stats gs ON true
    LEFT JOIN recent r ON true;
END;
$$;

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_connected_systems_batch TO authenticated;
GRANT EXECUTE ON FUNCTION get_exploration_stats_optimized TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_connected_systems_batch IS
'Optimized batch function to get connected systems with discoveries.
Replaces N+1 query pattern - single query instead of 2n queries.';

COMMENT ON FUNCTION get_exploration_stats_optimized IS
'Optimized function to get exploration statistics.
Replaces 4 separate queries with single aggregated query.';
