-- ============================================================================
-- SCALABILITY INDEXES FOR 10,000+ SYSTEMS
-- ============================================================================
-- Migration: 20260216180000_scalability_indexes.sql
-- Purpose: Add missing indexes for optimal performance at scale
-- Target: Support 10,000+ solar systems with 5,000+ concurrent players
-- ============================================================================

-- ============================================================================
-- 1. MARKET / CARTOGRAPHY SYSTEM INDEXES
-- ============================================================================

-- Composite index for market listings queries (cartography system)
-- Optimizes: Filter by status + type + rarity, sort by price
CREATE INDEX IF NOT EXISTS idx_market_listings_composite
ON market_listings(status, item_type, item_rarity, price_metal)
WHERE status = 'active';

COMMENT ON INDEX idx_market_listings_composite IS
'Composite index for efficient market filtering by status, type, rarity with price sorting';

-- ============================================================================
-- 2. PLAYER DISCOVERY BATCH QUERIES
-- ============================================================================

-- Index for batch discovery queries (exploration system)
-- Optimizes: Get all discoveries for user sorted by level and date
CREATE INDEX IF NOT EXISTS idx_discoveries_batch
ON player_discoveries(user_id, discovery_level, discovered_at DESC);

COMMENT ON INDEX idx_discoveries_batch IS
'Batch discovery queries for exploration UI with level grouping';

-- Index for first discoverer queries and leaderboards
CREATE INDEX IF NOT EXISTS idx_first_discoveries_user
ON player_discoveries(user_id, is_first_discoverer, discovered_at DESC)
WHERE is_first_discoverer = TRUE;

COMMENT ON INDEX idx_first_discoveries_user IS
'First discovery leaderboard queries';

-- ============================================================================
-- 3. SOLAR SYSTEM GENERATION TRACKING
-- ============================================================================

-- Index for finding ungenerated systems in a galaxy
-- Optimizes: Batch generation jobs
CREATE INDEX IF NOT EXISTS idx_solar_systems_gen_status
ON solar_systems(galaxy_id, is_generated, system_index)
WHERE is_generated = FALSE;

COMMENT ON INDEX idx_solar_systems_gen_status IS
'Find ungenerated systems for batch processing';

-- ============================================================================
-- 4. SYSTEM CONNECTIONS OPTIMIZATION
-- ============================================================================

-- Index for connection type and stability queries
-- Optimizes: Gameplay queries for stable vs unstable connections
CREATE INDEX IF NOT EXISTS idx_connections_type_stable
ON system_connections(connection_type, is_stable)
WHERE expires_at IS NULL OR expires_at > NOW();

COMMENT ON INDEX idx_connections_type_stable IS
'Active connection queries by type and stability';

-- Bidirectional connection lookup
CREATE INDEX IF NOT EXISTS idx_connections_reverse
ON system_connections(system_b_id, system_a_id);

COMMENT ON INDEX idx_connections_reverse IS
'Reverse lookup for bidirectional connection queries';

-- ============================================================================
-- 5. COLONY RESOURCE UPDATES
-- ============================================================================

-- Index for batch resource processing
-- Optimizes: Scheduled resource calculation jobs
CREATE INDEX IF NOT EXISTS idx_colonies_resource_update
ON player_colonies(user_id, last_resource_update)
WHERE destroyed = FALSE;

COMMENT ON INDEX idx_colonies_resource_update IS
'Active colonies needing resource updates';

-- ============================================================================
-- 6. CELESTIAL BODIES SPATIAL QUERIES
-- ============================================================================

-- Index for colonizable bodies search
CREATE INDEX IF NOT EXISTS idx_celestial_bodies_colonizable_type
ON celestial_bodies(solar_system_id, body_type, is_colonizable)
WHERE is_colonizable = TRUE;

COMMENT ON INDEX idx_celestial_bodies_colonizable_type IS
'Find colonizable bodies by type in a system';

-- ============================================================================
-- 7. EXPLORATION MISSIONS OPTIMIZATION
-- ============================================================================

-- Active missions by player
CREATE INDEX IF NOT EXISTS idx_exploration_missions_player_active
ON exploration_missions(player_id, status, completes_at)
WHERE status = 'in_progress';

COMMENT ON INDEX idx_exploration_missions_player_active IS
'Active exploration missions per player';

-- ============================================================================
-- 8. CURSOR-BASED PAGINATION SUPPORT
-- ============================================================================

-- For efficient cursor-based pagination on systems
CREATE INDEX IF NOT EXISTS idx_solar_systems_cursor
ON solar_systems(galaxy_id, system_index, id);

COMMENT ON INDEX idx_solar_systems_cursor IS
'Cursor-based pagination for galaxy system lists';

-- For efficient cursor-based pagination on celestial bodies
CREATE INDEX IF NOT EXISTS idx_celestial_bodies_cursor
ON celestial_bodies(solar_system_id, orbital_position, id);

COMMENT ON INDEX idx_celestial_bodies_cursor IS
'Cursor-based pagination for system body lists';

-- ============================================================================
-- 9. VACUUM AND ANALYZE SETTINGS FOR HIGH-CHURN TABLES
-- ============================================================================

-- More aggressive autovacuum for high-write tables
ALTER TABLE solar_systems SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE player_discoveries SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);

ALTER TABLE exploration_missions SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE system_connections SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- ============================================================================
-- 10. HELPER FUNCTION FOR CURSOR PAGINATION
-- ============================================================================

-- Generic cursor-based pagination for solar systems
CREATE OR REPLACE FUNCTION get_systems_paginated(
  p_galaxy_id UUID,
  p_after_index INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  system_index INTEGER,
  star_type TEXT,
  position_x DOUBLE PRECISION,
  position_y DOUBLE PRECISION,
  position_z DOUBLE PRECISION,
  is_generated BOOLEAN,
  body_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    ss.id,
    ss.system_index,
    ss.star_type,
    ss.position_x,
    ss.position_y,
    ss.position_z,
    ss.is_generated,
    COALESCE(cb.body_count, 0) AS body_count
  FROM solar_systems ss
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as body_count
    FROM celestial_bodies
    WHERE solar_system_id = ss.id
  ) cb ON TRUE
  WHERE ss.galaxy_id = p_galaxy_id
    AND ss.system_index > p_after_index
  ORDER BY ss.system_index
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_systems_paginated IS
'Cursor-based pagination for solar systems with body count';

-- ============================================================================
-- 11. VIEWPORT-BASED LOADING FUNCTION
-- ============================================================================

-- Load systems within a viewport (for galaxy map)
CREATE OR REPLACE FUNCTION get_systems_in_viewport(
  p_galaxy_id UUID,
  p_center_x DOUBLE PRECISION,
  p_center_y DOUBLE PRECISION,
  p_radius DOUBLE PRECISION DEFAULT 50.0,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  system_index INTEGER,
  star_type TEXT,
  position_x DOUBLE PRECISION,
  position_y DOUBLE PRECISION,
  position_z DOUBLE PRECISION,
  discovery_level TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    ss.id,
    ss.system_index,
    ss.star_type,
    ss.position_x,
    ss.position_y,
    ss.position_z,
    COALESCE(pd.discovery_level, 'unknown') AS discovery_level
  FROM solar_systems ss
  LEFT JOIN player_discoveries pd ON pd.solar_system_id = ss.id AND pd.user_id = v_user_id
  WHERE ss.galaxy_id = p_galaxy_id
    AND ss.position_x BETWEEN (p_center_x - p_radius) AND (p_center_x + p_radius)
    AND ss.position_y BETWEEN (p_center_y - p_radius) AND (p_center_y + p_radius)
  ORDER BY
    -- Sort by distance from center for predictable results
    SQRT(POWER(ss.position_x - p_center_x, 2) + POWER(ss.position_y - p_center_y, 2))
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION get_systems_in_viewport IS
'Load systems within map viewport with fog of war status';

-- ============================================================================
-- ANALYZE TABLES AFTER INDEX CREATION
-- ============================================================================

ANALYZE solar_systems;
ANALYZE celestial_bodies;
ANALYZE player_discoveries;
ANALYZE system_connections;
ANALYZE exploration_missions;
ANALYZE player_colonies;
ANALYZE market_listings;
