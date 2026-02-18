-- ============================================================================
-- STANDARDIZE HOMEWORLD FOR ALL PLAYERS
-- All players start with the same planet characteristics:
-- - 20 fields (max normal)
-- - visual type: 'normal'
-- - visual variant: 1
-- ============================================================================

-- Update existing homeworlds to standard values
UPDATE celestial_bodies cb
SET
    fields_max = 20,
    planet_visual_type = 'normal',
    planet_visual_variant = 1
FROM player_colonies pc
WHERE pc.celestial_body_id = cb.id
  AND pc.is_homeworld = TRUE;

-- ============================================================================
-- UPDATE: Create Initial Colony Function with Standard Homeworld
-- ============================================================================
CREATE OR REPLACE FUNCTION create_initial_colony()
RETURNS TRIGGER AS $$
DECLARE
    v_galaxy_index INTEGER;
    v_system_index INTEGER;
    v_system_id UUID;
    v_body RECORD;
    v_attempts INTEGER := 0;
    v_max_attempts INTEGER := 100;
BEGIN
    -- Find an uncolonized planet in a random location
    LOOP
        v_attempts := v_attempts + 1;
        IF v_attempts > v_max_attempts THEN
            RAISE EXCEPTION 'Could not find available planet for new player';
        END IF;

        -- Random galaxy and system
        v_galaxy_index := 1 + (RANDOM() * 89)::INTEGER;
        v_system_index := 1 + (RANDOM() * 199)::INTEGER;

        -- Ensure system is generated
        v_system_id := get_or_generate_system(v_galaxy_index, v_system_index);

        -- Find an uncolonized habitable planet (positions 4-7 preferred)
        SELECT cb.* INTO v_body
        FROM celestial_bodies cb
        LEFT JOIN player_colonies pc ON pc.celestial_body_id = cb.id
        WHERE cb.solar_system_id = v_system_id
          AND cb.is_colonizable = TRUE
          AND cb.parent_body_id IS NULL
          AND pc.id IS NULL
          AND cb.orbital_position BETWEEN 4 AND 7
        ORDER BY cb.orbital_position
        LIMIT 1;

        IF v_body IS NOT NULL THEN
            EXIT;
        END IF;

        -- Try any position if no habitable zone planet available
        SELECT cb.* INTO v_body
        FROM celestial_bodies cb
        LEFT JOIN player_colonies pc ON pc.celestial_body_id = cb.id
        WHERE cb.solar_system_id = v_system_id
          AND cb.is_colonizable = TRUE
          AND cb.parent_body_id IS NULL
          AND pc.id IS NULL
        ORDER BY ABS(cb.orbital_position - 5)
        LIMIT 1;

        IF v_body IS NOT NULL THEN
            EXIT;
        END IF;
    END LOOP;

    -- STANDARDIZE HOMEWORLD: Set standard values for all new players
    UPDATE celestial_bodies
    SET
        fields_max = 20,
        planet_visual_type = 'normal',
        planet_visual_variant = 1,
        colonized_at = NOW()
    WHERE id = v_body.id;

    -- Create homeworld colony
    INSERT INTO player_colonies (
        user_id,
        celestial_body_id,
        name,
        is_homeworld,
        metal,
        crystal,
        deuterium
    ) VALUES (
        NEW.id,
        v_body.id,
        'Homeworld',
        TRUE,
        500,
        500,
        0
    );

    -- Create research record
    INSERT INTO user_research (user_id) VALUES (NEW.id);

    -- Create highscore record
    INSERT INTO highscores (user_id) VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_colony();
