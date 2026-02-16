-- ============================================================================
-- MIGRATION: Hierarchical Synchronization Functions
-- Date: 2026-02-16
-- Purpose: Batch operations and hierarchical data aggregation
-- ============================================================================

-- ============================================================================
-- 1. BATCH RESOURCE PRODUCTION UPDATE
-- Updates multiple planets' resources in a single atomic transaction
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_update_planet_resources(
    p_updates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_update JSONB;
    v_planet_id UUID;
    v_metal BIGINT;
    v_crystal BIGINT;
    v_deuterium BIGINT;
    v_last_update TIMESTAMPTZ;
    v_processed INT := 0;
    v_errors JSONB := '[]'::JSONB;
BEGIN
    -- Process each update in the batch
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_planet_id := (v_update->>'planet_id')::UUID;
        v_metal := (v_update->>'metal')::BIGINT;
        v_crystal := (v_update->>'crystal')::BIGINT;
        v_deuterium := (v_update->>'deuterium')::BIGINT;
        v_last_update := COALESCE((v_update->>'last_resource_update')::TIMESTAMPTZ, NOW());

        BEGIN
            UPDATE player_colonies
            SET
                metal = LEAST(v_metal, metal_storage_capacity),
                crystal = LEAST(v_crystal, crystal_storage_capacity),
                deuterium = LEAST(v_deuterium, deuterium_storage_capacity),
                last_resource_update = v_last_update
            WHERE id = v_planet_id;

            v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'planet_id', v_planet_id,
                'error', SQLERRM
            );
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'processed', v_processed,
        'errors', v_errors
    );
END;
$$;

-- ============================================================================
-- 2. BATCH BUILDING COMPLETION
-- Processes multiple building completions atomically
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_complete_buildings(
    p_planet_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_building RECORD;
    v_completed_count INT := 0;
    v_building_updates JSONB := '{}'::JSONB;
    v_fields_added INT := 0;
    v_completed_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    -- Get all completed buildings for this planet
    FOR v_building IN
        SELECT id, building_id, target_level
        FROM building_queue
        WHERE planet_id = p_planet_id
        AND ends_at <= NOW()
        ORDER BY ends_at ASC
    LOOP
        -- Track the building update
        v_building_updates := v_building_updates || jsonb_build_object(
            'building_' || v_building.building_id::TEXT, v_building.target_level
        );
        v_fields_added := v_fields_added + 1;
        v_completed_count := v_completed_count + 1;
        v_completed_ids := array_append(v_completed_ids, v_building.id);
    END LOOP;

    -- If no buildings to complete, return early
    IF v_completed_count = 0 THEN
        RETURN jsonb_build_object(
            'completed', 0,
            'updates', '{}'::JSONB,
            'deleted_ids', '[]'::JSONB
        );
    END IF;

    -- Delete all completed buildings at once
    DELETE FROM building_queue
    WHERE id = ANY(v_completed_ids);

    -- Update planet fields_used
    UPDATE player_colonies
    SET fields_used = fields_used + v_fields_added
    WHERE id = p_planet_id;

    RETURN jsonb_build_object(
        'completed', v_completed_count,
        'updates', v_building_updates,
        'deleted_ids', to_jsonb(v_completed_ids),
        'fields_added', v_fields_added
    );
END;
$$;

-- ============================================================================
-- 3. BATCH UNIT COMPLETION
-- Processes multiple unit completions atomically
-- ============================================================================

CREATE OR REPLACE FUNCTION batch_complete_units(
    p_planet_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_unit RECORD;
    v_completed_count INT := 0;
    v_unit_updates JSONB := '{}'::JSONB;
    v_completed_ids UUID[] := ARRAY[]::UUID[];
    v_amount_to_add INT;
BEGIN
    -- Get all completed units for this planet
    FOR v_unit IN
        SELECT id, unit_id, unit_type, amount, COALESCE(amount_completed, 0) as amount_completed
        FROM unit_queue
        WHERE planet_id = p_planet_id
        AND ends_at <= NOW()
        ORDER BY ends_at ASC
    LOOP
        v_amount_to_add := v_unit.amount - v_unit.amount_completed;

        -- Track the unit update
        v_unit_updates := v_unit_updates || jsonb_build_object(
            v_unit.unit_type || '_' || v_unit.unit_id::TEXT, v_amount_to_add
        );
        v_completed_count := v_completed_count + 1;
        v_completed_ids := array_append(v_completed_ids, v_unit.id);
    END LOOP;

    -- If no units to complete, return early
    IF v_completed_count = 0 THEN
        RETURN jsonb_build_object(
            'completed', 0,
            'updates', '{}'::JSONB,
            'deleted_ids', '[]'::JSONB
        );
    END IF;

    -- Delete all completed units at once
    DELETE FROM unit_queue
    WHERE id = ANY(v_completed_ids);

    RETURN jsonb_build_object(
        'completed', v_completed_count,
        'updates', v_unit_updates,
        'deleted_ids', to_jsonb(v_completed_ids)
    );
END;
$$;

-- ============================================================================
-- 4. AGGREGATE USER STATISTICS
-- Calculates user totals from all planets
-- ============================================================================

CREATE OR REPLACE FUNCTION aggregate_user_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_metal', COALESCE(SUM(metal), 0),
        'total_crystal', COALESCE(SUM(crystal), 0),
        'total_deuterium', COALESCE(SUM(deuterium), 0),
        'total_planets', COUNT(*),
        'total_fields_used', COALESCE(SUM(fields_used), 0),
        'total_fields_max', COALESCE(SUM(fields_max), 0),
        'total_metal_production', COALESCE(SUM(metal_per_hour), 0),
        'total_crystal_production', COALESCE(SUM(crystal_per_hour), 0),
        'total_deuterium_production', COALESCE(SUM(deuterium_per_hour), 0)
    ) INTO v_result
    FROM player_colonies
    WHERE user_id = p_user_id;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 5. GET SYSTEM OVERVIEW
-- Aggregates planet data for a solar system view
-- ============================================================================

CREATE OR REPLACE FUNCTION get_system_overview(
    p_system_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'system_id', ss.id,
        'system_index', ss.system_index,
        'star_type', ss.star_type,
        'galaxy_id', ss.galaxy_id,
        'planets', COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', cb.id,
                    'name', cb.name,
                    'orbital_position', cb.orbital_position,
                    'body_type', cb.body_type,
                    'owner_id', pc.user_id,
                    'owner_name', CASE WHEN pc.user_id IS NOT NULL THEN u.username ELSE NULL END,
                    'is_owned_by_user', CASE WHEN p_user_id IS NOT NULL THEN pc.user_id = p_user_id ELSE FALSE END
                ) ORDER BY cb.orbital_position
            ) FILTER (WHERE cb.id IS NOT NULL),
            '[]'::JSONB
        ),
        'total_colonies', COUNT(pc.id),
        'user_has_colony', BOOL_OR(pc.user_id = p_user_id)
    ) INTO v_result
    FROM solar_systems ss
    LEFT JOIN celestial_bodies cb ON cb.solar_system_id = ss.id
    LEFT JOIN player_colonies pc ON pc.celestial_body_id = cb.id
    LEFT JOIN users u ON u.id = pc.user_id
    WHERE ss.id = p_system_id
    GROUP BY ss.id, ss.system_index, ss.star_type, ss.galaxy_id;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. GET GALAXY OVERVIEW
-- Aggregates system data for a galaxy view
-- ============================================================================

CREATE OR REPLACE FUNCTION get_galaxy_overview(
    p_galaxy_id UUID,
    p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'galaxy_id', g.id,
        'galaxy_index', g.galaxy_index,
        'name', g.name,
        'total_systems', COUNT(DISTINCT ss.id),
        'colonized_systems', COUNT(DISTINCT CASE WHEN pc.id IS NOT NULL THEN ss.id END),
        'user_systems', COUNT(DISTINCT CASE WHEN pc.user_id = p_user_id THEN ss.id END),
        'user_planets', COUNT(CASE WHEN pc.user_id = p_user_id THEN 1 END),
        'discovery_info', (
            SELECT jsonb_build_object(
                'discovered_systems', COUNT(*),
                'mapped_systems', COUNT(*) FILTER (WHERE discovery_level = 'mapped'),
                'explored_systems', COUNT(*) FILTER (WHERE discovery_level = 'explored')
            )
            FROM player_discoveries pd
            JOIN solar_systems ss2 ON ss2.id = pd.solar_system_id
            WHERE ss2.galaxy_id = g.id AND pd.user_id = p_user_id
        )
    ) INTO v_result
    FROM galaxies g
    LEFT JOIN solar_systems ss ON ss.galaxy_id = g.id
    LEFT JOIN celestial_bodies cb ON cb.solar_system_id = ss.id
    LEFT JOIN player_colonies pc ON pc.celestial_body_id = cb.id
    WHERE g.id = p_galaxy_id
    GROUP BY g.id, g.galaxy_index, g.name;

    RETURN v_result;
END;
$$;

-- ============================================================================
-- 7. SYNC PLANET HIERARCHY
-- Full hierarchical sync from planet to user level
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_planet_hierarchy(
    p_planet_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_system_id UUID;
    v_galaxy_id UUID;
    v_planet_stats JSONB;
    v_user_stats JSONB;
BEGIN
    -- Get hierarchy IDs
    SELECT
        pc.user_id,
        cb.solar_system_id,
        ss.galaxy_id
    INTO v_user_id, v_system_id, v_galaxy_id
    FROM player_colonies pc
    JOIN celestial_bodies cb ON cb.id = pc.celestial_body_id
    JOIN solar_systems ss ON ss.id = cb.solar_system_id
    WHERE pc.id = p_planet_id;

    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Planet not found');
    END IF;

    -- Get planet stats
    SELECT jsonb_build_object(
        'metal', metal,
        'crystal', crystal,
        'deuterium', deuterium,
        'metal_per_hour', metal_per_hour,
        'crystal_per_hour', crystal_per_hour,
        'deuterium_per_hour', deuterium_per_hour
    ) INTO v_planet_stats
    FROM player_colonies
    WHERE id = p_planet_id;

    -- Get aggregated user stats
    v_user_stats := aggregate_user_stats(v_user_id);

    RETURN jsonb_build_object(
        'planet_id', p_planet_id,
        'user_id', v_user_id,
        'system_id', v_system_id,
        'galaxy_id', v_galaxy_id,
        'planet_stats', v_planet_stats,
        'user_totals', v_user_stats,
        'synced_at', NOW()
    );
END;
$$;

-- ============================================================================
-- 8. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION batch_update_planet_resources TO authenticated;
GRANT EXECUTE ON FUNCTION batch_complete_buildings TO authenticated;
GRANT EXECUTE ON FUNCTION batch_complete_units TO authenticated;
GRANT EXECUTE ON FUNCTION aggregate_user_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_galaxy_overview TO authenticated;
GRANT EXECUTE ON FUNCTION sync_planet_hierarchy TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION batch_update_planet_resources IS
'Batch updates multiple planets resources in a single atomic transaction.
Input: JSON array of {planet_id, metal, crystal, deuterium, last_resource_update}
Returns: {processed: count, errors: []}';

COMMENT ON FUNCTION batch_complete_buildings IS
'Processes all completed buildings for a planet atomically.
Deletes queue entries and returns building updates to apply.';

COMMENT ON FUNCTION batch_complete_units IS
'Processes all completed units for a planet atomically.
Deletes queue entries and returns unit counts to add.';

COMMENT ON FUNCTION aggregate_user_stats IS
'Aggregates resource totals and production across all user planets.';

COMMENT ON FUNCTION get_system_overview IS
'Returns aggregated view of a solar system including planets and owners.';

COMMENT ON FUNCTION get_galaxy_overview IS
'Returns aggregated view of a galaxy with system and discovery stats.';

COMMENT ON FUNCTION sync_planet_hierarchy IS
'Performs full hierarchical sync from planet to user level.
Returns current state at all levels of hierarchy.';
