-- ============================================================================
-- OGameX Procedural Galaxy System Migration
-- Creates universe, galaxies, solar_systems, and celestial_bodies tables
-- Replaces the static planets table with a procedural generation system
-- ============================================================================

-- ============================================================================
-- UNIVERSE CONFIGURATION TABLE
-- ============================================================================
CREATE TABLE universe_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_seed BIGINT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Universe Alpha',
    galaxy_count INTEGER NOT NULL DEFAULT 90 CHECK (galaxy_count >= 80 AND galaxy_count <= 100),
    systems_per_galaxy_min INTEGER NOT NULL DEFAULT 100,
    systems_per_galaxy_max INTEGER NOT NULL DEFAULT 200,
    universe_speed INTEGER NOT NULL DEFAULT 1,
    fleet_speed INTEGER NOT NULL DEFAULT 1,
    resource_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GALAXIES TABLE (Pre-generated metadata)
-- ============================================================================
CREATE TABLE galaxies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    galaxy_index INTEGER NOT NULL UNIQUE CHECK (galaxy_index >= 1 AND galaxy_index <= 100),
    name TEXT NOT NULL,
    seed BIGINT NOT NULL,
    galaxy_type TEXT NOT NULL CHECK (galaxy_type IN ('spiral', 'elliptical', 'irregular', 'barred_spiral')),
    system_count INTEGER NOT NULL CHECK (system_count >= 100 AND system_count <= 200),
    center_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    center_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    center_z DOUBLE PRECISION NOT NULL DEFAULT 0,
    rotation_angle DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STAR TYPES REFERENCE TABLE
-- ============================================================================
CREATE TABLE star_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    probability DOUBLE PRECISION NOT NULL,
    color TEXT NOT NULL,
    temperature_kelvin INTEGER NOT NULL,
    luminosity DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    is_binary BOOLEAN NOT NULL DEFAULT FALSE,
    is_exotic BOOLEAN NOT NULL DEFAULT FALSE,
    colonizable BOOLEAN NOT NULL DEFAULT TRUE,
    metal_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    crystal_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    deuterium_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    energy_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    expedition_bonus DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    fleet_damage_chance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    fleet_loss_chance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    description TEXT
);

-- Insert star types with probabilities and effects
INSERT INTO star_types (id, name, probability, color, temperature_kelvin, luminosity, is_binary, is_exotic, colonizable, metal_multiplier, crystal_multiplier, deuterium_multiplier, energy_multiplier, expedition_bonus, fleet_damage_chance, fleet_loss_chance, description) VALUES
    ('yellow_dwarf', 'Yellow Dwarf (G-type)', 0.25, '#ffdd44', 5800, 1.0, FALSE, FALSE, TRUE, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 'A stable main-sequence star similar to our Sun'),
    ('red_dwarf', 'Red Dwarf (M-type)', 0.25, '#ff6644', 3500, 0.4, FALSE, FALSE, TRUE, 0.9, 0.9, 1.1, 0.9, 1.0, 0.0, 0.0, 'The most common star type with reduced energy output'),
    ('orange_dwarf', 'Orange Dwarf (K-type)', 0.10, '#ffaa44', 4800, 0.6, FALSE, FALSE, TRUE, 1.0, 1.0, 1.0, 0.95, 1.0, 0.0, 0.0, 'A stable star slightly cooler than the Sun'),
    ('white_dwarf', 'White Dwarf', 0.05, '#ffffff', 15000, 0.01, FALSE, FALSE, TRUE, 0.8, 1.2, 0.9, 1.1, 1.2, 0.01, 0.0, 'A stellar remnant with unusual radiation patterns'),
    ('red_giant', 'Red Giant', 0.03, '#ff4422', 4000, 100.0, FALSE, FALSE, TRUE, 1.3, 0.9, 0.8, 0.8, 1.1, 0.02, 0.0, 'An evolved star with expanded outer layers'),
    ('blue_giant', 'Blue Giant (O/B-type)', 0.02, '#4488ff', 25000, 10000.0, FALSE, FALSE, TRUE, 0.9, 0.9, 1.3, 1.5, 1.3, 0.05, 0.0, 'A massive hot star with intense radiation'),
    ('binary_yellow', 'Binary Yellow', 0.08, '#ffee44', 5800, 2.0, TRUE, FALSE, TRUE, 1.0, 1.0, 1.0, 1.15, 1.1, 0.01, 0.0, 'Two yellow stars in gravitational dance'),
    ('binary_red', 'Binary Red', 0.07, '#ff5533', 3500, 0.8, TRUE, FALSE, TRUE, 0.95, 0.95, 1.05, 0.95, 1.05, 0.01, 0.0, 'Two red dwarfs orbiting each other'),
    ('binary_mixed', 'Binary Mixed', 0.05, '#ffaa77', 4500, 1.5, TRUE, FALSE, TRUE, 1.0, 1.1, 1.1, 1.05, 1.15, 0.02, 0.0, 'A pair of different star types'),
    ('neutron_star', 'Neutron Star', 0.05, '#88aaff', 1000000, 0.001, FALSE, TRUE, TRUE, 0.7, 0.8, 2.0, 0.5, 1.5, 0.05, 0.01, 'An ultra-dense stellar remnant with extreme conditions'),
    ('black_hole', 'Black Hole', 0.03, '#220033', 0, 0.0, FALSE, TRUE, FALSE, 0.0, 0.0, 0.0, 0.0, 3.0, 0.10, 0.10, 'A gravitational singularity - extremely dangerous'),
    ('white_giant', 'White Giant', 0.02, '#eeeeff', 10000, 1000.0, FALSE, FALSE, TRUE, 0.9, 1.4, 0.9, 1.2, 1.2, 0.02, 0.0, 'A luminous evolved star rich in heavy elements');

-- ============================================================================
-- SOLAR SYSTEMS TABLE (Lazy-loaded)
-- ============================================================================
CREATE TABLE solar_systems (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    galaxy_id UUID NOT NULL REFERENCES galaxies(id) ON DELETE CASCADE,
    system_index INTEGER NOT NULL CHECK (system_index >= 1 AND system_index <= 200),
    seed BIGINT NOT NULL,
    star_type TEXT NOT NULL REFERENCES star_types(id),
    secondary_star_type TEXT REFERENCES star_types(id),
    planet_count INTEGER NOT NULL CHECK (planet_count >= 1 AND planet_count <= 9),
    habitable_zone_inner INTEGER NOT NULL DEFAULT 4,
    habitable_zone_outer INTEGER NOT NULL DEFAULT 7,
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_z DOUBLE PRECISION NOT NULL DEFAULT 0,
    is_generated BOOLEAN NOT NULL DEFAULT FALSE,
    generated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (galaxy_id, system_index)
);

-- ============================================================================
-- CELESTIAL BODY TYPES ENUM
-- ============================================================================
CREATE TYPE celestial_body_type AS ENUM (
    'rocky_planet',
    'gas_giant',
    'ice_giant',
    'dwarf_planet',
    'moon',
    'asteroid_field'
);

-- ============================================================================
-- CELESTIAL BODIES TABLE
-- ============================================================================
CREATE TABLE celestial_bodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solar_system_id UUID NOT NULL REFERENCES solar_systems(id) ON DELETE CASCADE,
    parent_body_id UUID REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    body_type celestial_body_type NOT NULL,
    orbital_position INTEGER NOT NULL CHECK (orbital_position >= 1 AND orbital_position <= 15),
    name TEXT NOT NULL,

    -- Physical characteristics
    diameter INTEGER NOT NULL CHECK (diameter > 0),
    fields_max INTEGER NOT NULL CHECK (fields_max >= 0 AND fields_max <= 30),
    moon_capacity INTEGER NOT NULL DEFAULT 0 CHECK (moon_capacity >= 0 AND moon_capacity <= 8),
    temperature_min INTEGER NOT NULL,
    temperature_max INTEGER NOT NULL,
    atmosphere_type TEXT DEFAULT 'none',

    -- Visual properties (procedurally derived)
    seed BIGINT NOT NULL,
    planet_visual_type TEXT NOT NULL DEFAULT 'normal',
    planet_visual_variant INTEGER NOT NULL DEFAULT 1 CHECK (planet_visual_variant >= 1 AND planet_visual_variant <= 10),
    has_rings BOOLEAN NOT NULL DEFAULT FALSE,
    ring_color TEXT,

    -- Resource multipliers (stacks with star effects)
    metal_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    crystal_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    deuterium_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    -- Colonization state
    is_colonizable BOOLEAN NOT NULL DEFAULT TRUE,
    colonized_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (solar_system_id, orbital_position, parent_body_id)
);

-- ============================================================================
-- PLAYER COLONIES TABLE (Replaces old planets table foreign keys)
-- ============================================================================
CREATE TABLE player_colonies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    celestial_body_id UUID NOT NULL REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Colony',
    is_homeworld BOOLEAN NOT NULL DEFAULT FALSE,

    -- Resources (stored per colony)
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

    -- Building levels
    fields_used INTEGER DEFAULT 0,
    metal_mine INTEGER DEFAULT 0,
    crystal_mine INTEGER DEFAULT 0,
    deuterium_synthesizer INTEGER DEFAULT 0,
    solar_plant INTEGER DEFAULT 0,
    fusion_plant INTEGER DEFAULT 0,
    metal_storage INTEGER DEFAULT 0,
    crystal_storage INTEGER DEFAULT 0,
    deuterium_tank INTEGER DEFAULT 0,
    robot_factory INTEGER DEFAULT 0,
    nanite_factory INTEGER DEFAULT 0,
    shipyard INTEGER DEFAULT 0,
    research_lab INTEGER DEFAULT 0,
    terraformer INTEGER DEFAULT 0,
    alliance_depot INTEGER DEFAULT 0,
    missile_silo INTEGER DEFAULT 0,
    space_dock INTEGER DEFAULT 0,

    -- Moon-only buildings (when body_type = 'moon')
    lunar_base INTEGER DEFAULT 0,
    sensor_phalanx INTEGER DEFAULT 0,
    jump_gate INTEGER DEFAULT 0,
    jump_gate_cooldown TIMESTAMPTZ,

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

    UNIQUE (celestial_body_id)
);

-- ============================================================================
-- STAR EFFECTS TABLE (Cached gameplay effects per system)
-- ============================================================================
CREATE TABLE star_effects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solar_system_id UUID NOT NULL UNIQUE REFERENCES solar_systems(id) ON DELETE CASCADE,

    -- Combined multipliers (from primary + secondary star)
    metal_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    crystal_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    deuterium_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    energy_multiplier DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    -- Risk factors
    expedition_bonus DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    fleet_damage_chance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    fleet_loss_chance DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    -- Flags
    is_colonizable BOOLEAN NOT NULL DEFAULT TRUE,
    has_radiation_hazard BOOLEAN NOT NULL DEFAULT FALSE,
    has_gravitational_anomaly BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_galaxies_index ON galaxies(galaxy_index);
CREATE INDEX idx_solar_systems_galaxy ON solar_systems(galaxy_id);
CREATE INDEX idx_solar_systems_index ON solar_systems(galaxy_id, system_index);
CREATE INDEX idx_solar_systems_generated ON solar_systems(is_generated);
CREATE INDEX idx_celestial_bodies_system ON celestial_bodies(solar_system_id);
CREATE INDEX idx_celestial_bodies_parent ON celestial_bodies(parent_body_id);
CREATE INDEX idx_celestial_bodies_position ON celestial_bodies(solar_system_id, orbital_position);
CREATE INDEX idx_celestial_bodies_colonizable ON celestial_bodies(is_colonizable, colonized_at);
CREATE INDEX idx_player_colonies_user ON player_colonies(user_id);
CREATE INDEX idx_player_colonies_body ON player_colonies(celestial_body_id);
CREATE INDEX idx_star_effects_system ON star_effects(solar_system_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE universe_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE galaxies ENABLE ROW LEVEL SECURITY;
ALTER TABLE solar_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE celestial_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_colonies ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE star_types ENABLE ROW LEVEL SECURITY;

-- Universe config and galaxies: read-only for all authenticated users
CREATE POLICY universe_config_select ON universe_config FOR SELECT USING (true);
CREATE POLICY galaxies_select ON galaxies FOR SELECT USING (true);
CREATE POLICY star_types_select ON star_types FOR SELECT USING (true);

-- Solar systems: read for all, write for system (lazy generation)
CREATE POLICY solar_systems_select ON solar_systems FOR SELECT USING (true);
CREATE POLICY solar_systems_insert ON solar_systems FOR INSERT WITH CHECK (true);
CREATE POLICY solar_systems_update ON solar_systems FOR UPDATE USING (true);

-- Celestial bodies: read for all (galaxy view), system can insert during generation
CREATE POLICY celestial_bodies_select ON celestial_bodies FOR SELECT USING (true);
CREATE POLICY celestial_bodies_insert ON celestial_bodies FOR INSERT WITH CHECK (true);
CREATE POLICY celestial_bodies_update ON celestial_bodies FOR UPDATE USING (true);

-- Star effects: read for all
CREATE POLICY star_effects_select ON star_effects FOR SELECT USING (true);
CREATE POLICY star_effects_insert ON star_effects FOR INSERT WITH CHECK (true);

-- Player colonies: users can manage their own
CREATE POLICY colonies_select ON player_colonies FOR SELECT USING (true);
CREATE POLICY colonies_insert ON player_colonies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY colonies_update ON player_colonies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY colonies_delete ON player_colonies FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- GALAXY VIEW (Updated to use new tables)
-- ============================================================================
DROP VIEW IF EXISTS galaxy_view;

CREATE OR REPLACE VIEW galaxy_view AS
SELECT
    g.galaxy_index AS galaxy,
    ss.system_index AS system,
    cb.orbital_position AS position,
    cb.id AS celestial_body_id,
    pc.id AS colony_id,
    COALESCE(pc.name, cb.name) AS planet_name,
    cb.body_type::TEXT AS planet_type,
    pc.user_id,
    u.username,
    a.tag AS alliance_tag,
    cb.fields_max,
    COALESCE(pc.fields_used, 0) AS fields_used,
    cb.diameter,
    cb.temperature_min,
    cb.temperature_max,
    ss.star_type,
    ss.secondary_star_type,
    st.color AS star_color,
    cb.is_colonizable,
    EXISTS (
        SELECT 1 FROM celestial_bodies moon
        WHERE moon.parent_body_id = cb.id
    ) AS has_moon,
    COALESCE(df.metal, 0) AS debris_metal,
    COALESCE(df.crystal, 0) AS debris_crystal
FROM celestial_bodies cb
JOIN solar_systems ss ON cb.solar_system_id = ss.id
JOIN galaxies g ON ss.galaxy_id = g.id
JOIN star_types st ON ss.star_type = st.id
LEFT JOIN player_colonies pc ON pc.celestial_body_id = cb.id AND pc.destroyed = FALSE
LEFT JOIN users u ON pc.user_id = u.id
LEFT JOIN alliances a ON u.alliance_id = a.id
LEFT JOIN debris_fields df ON df.galaxy = g.galaxy_index AND df.system = ss.system_index AND df.position = cb.orbital_position
WHERE cb.parent_body_id IS NULL
  AND cb.body_type NOT IN ('moon', 'asteroid_field');

-- ============================================================================
-- FUNCTION: Generate Initial Galaxies
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_initial_galaxies(p_master_seed BIGINT, p_galaxy_count INTEGER DEFAULT 90)
RETURNS void AS $$
DECLARE
    i INTEGER;
    galaxy_seed BIGINT;
    galaxy_type TEXT;
    system_count INTEGER;
    type_roll DOUBLE PRECISION;
    galaxy_names TEXT[] := ARRAY[
        'Andromeda', 'Pegasus', 'Orion', 'Centaurus', 'Draco',
        'Phoenix', 'Sculptor', 'Fornax', 'Cetus', 'Eridanus',
        'Hydra', 'Virgo', 'Corvus', 'Crater', 'Vela',
        'Carina', 'Puppis', 'Pyxis', 'Antlia', 'Columba',
        'Caelum', 'Horologium', 'Reticulum', 'Pictor', 'Dorado',
        'Volans', 'Mensa', 'Chamaeleon', 'Musca', 'Crux',
        'Circinus', 'Norma', 'Lupus', 'Ara', 'Corona',
        'Serpens', 'Ophiuchus', 'Scutum', 'Sagittarius', 'Capricornus',
        'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini',
        'Cancer', 'Leo', 'Libra', 'Scorpius', 'Aquila',
        'Cygnus', 'Lyra', 'Delphinus', 'Equuleus', 'Sagitta',
        'Vulpecula', 'Lacerta', 'Cassiopeia', 'Cepheus', 'Perseus',
        'Auriga', 'Lynx', 'Ursa Minor', 'Ursa Major', 'Canes',
        'Bootes', 'Hercules', 'Triangulum', 'Canis Major', 'Canis Minor',
        'Monoceros', 'Lepus', 'Grus', 'Tucana', 'Pavo',
        'Indus', 'Microscopium', 'Telescopium', 'Octans', 'Apus',
        'Aether', 'Nebula Prime', 'Void Walker', 'Star Forge', 'Dark Matter',
        'Quantum', 'Singularity', 'Event Horizon', 'Cosmic Web', 'Stellar'
    ];
BEGIN
    FOR i IN 1..p_galaxy_count LOOP
        -- Derive galaxy seed from master seed
        galaxy_seed := p_master_seed # (i * 1000000);

        -- Determine galaxy type using weighted random
        type_roll := ((galaxy_seed % 1000) / 1000.0);
        IF type_roll < 0.50 THEN
            galaxy_type := 'spiral';
        ELSIF type_roll < 0.75 THEN
            galaxy_type := 'barred_spiral';
        ELSIF type_roll < 0.90 THEN
            galaxy_type := 'elliptical';
        ELSE
            galaxy_type := 'irregular';
        END IF;

        -- Determine system count (100-200)
        system_count := 100 + ((galaxy_seed % 101)::INTEGER);

        INSERT INTO galaxies (
            galaxy_index,
            name,
            seed,
            galaxy_type,
            system_count,
            center_x,
            center_y,
            center_z,
            rotation_angle
        ) VALUES (
            i,
            galaxy_names[((i - 1) % array_length(galaxy_names, 1)) + 1] || ' ' ||
                CASE WHEN i > array_length(galaxy_names, 1) THEN 'II' ELSE '' END,
            galaxy_seed,
            galaxy_type,
            system_count,
            SIN(galaxy_seed::DOUBLE PRECISION / 1000000) * 1000,
            COS(galaxy_seed::DOUBLE PRECISION / 1000000) * 500,
            ((galaxy_seed % 200) - 100)::DOUBLE PRECISION,
            (galaxy_seed % 360)::DOUBLE PRECISION
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Initialize Universe
-- ============================================================================
CREATE OR REPLACE FUNCTION initialize_universe(p_seed BIGINT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_universe_id UUID;
    v_master_seed BIGINT;
    v_galaxy_count INTEGER;
BEGIN
    -- Use provided seed or generate random
    v_master_seed := COALESCE(p_seed, (EXTRACT(EPOCH FROM NOW()) * 1000000)::BIGINT);
    v_galaxy_count := 80 + (v_master_seed % 21)::INTEGER; -- 80-100 galaxies

    -- Create universe config
    INSERT INTO universe_config (master_seed, galaxy_count)
    VALUES (v_master_seed, v_galaxy_count)
    RETURNING id INTO v_universe_id;

    -- Generate galaxies
    PERFORM generate_initial_galaxies(v_master_seed, v_galaxy_count);

    RETURN v_universe_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Generate Solar System (Lazy)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_solar_system(p_galaxy_id UUID, p_system_index INTEGER)
RETURNS UUID AS $$
DECLARE
    v_galaxy RECORD;
    v_system_id UUID;
    v_system_seed BIGINT;
    v_star_type TEXT;
    v_secondary_star TEXT;
    v_planet_count INTEGER;
    v_type_roll DOUBLE PRECISION;
    v_binary_roll DOUBLE PRECISION;
BEGIN
    -- Get galaxy info
    SELECT * INTO v_galaxy FROM galaxies WHERE id = p_galaxy_id;
    IF v_galaxy IS NULL THEN
        RAISE EXCEPTION 'Galaxy not found: %', p_galaxy_id;
    END IF;

    -- Check if system already exists
    SELECT id INTO v_system_id FROM solar_systems
    WHERE galaxy_id = p_galaxy_id AND system_index = p_system_index;

    IF v_system_id IS NOT NULL THEN
        RETURN v_system_id;
    END IF;

    -- Derive system seed
    v_system_seed := v_galaxy.seed # (p_system_index * 1000);

    -- Determine star type using weighted probabilities
    v_type_roll := ((v_system_seed % 10000) / 10000.0);
    v_binary_roll := (((v_system_seed / 10000) % 100) / 100.0);

    -- Select star type based on cumulative probability
    SELECT id INTO v_star_type FROM (
        SELECT id, SUM(probability) OVER (ORDER BY probability DESC) AS cum_prob
        FROM star_types
        WHERE NOT is_binary
    ) sub WHERE cum_prob >= v_type_roll
    ORDER BY cum_prob LIMIT 1;

    -- Check for binary system
    IF v_binary_roll < 0.20 THEN -- 20% chance of binary
        SELECT id INTO v_secondary_star FROM star_types
        WHERE is_binary
        ORDER BY RANDOM() LIMIT 1;

        IF v_secondary_star IS NOT NULL THEN
            v_star_type := v_secondary_star;
        END IF;
    END IF;

    -- Fallback to yellow dwarf
    IF v_star_type IS NULL THEN
        v_star_type := 'yellow_dwarf';
    END IF;

    -- Determine planet count (1-9, weighted towards middle values)
    v_planet_count := 1 + ((v_system_seed % 9)::INTEGER);
    -- Adjust: more likely to have 4-7 planets
    IF v_planet_count < 3 AND (v_system_seed % 2) = 0 THEN
        v_planet_count := v_planet_count + 3;
    END IF;

    -- Create solar system
    INSERT INTO solar_systems (
        galaxy_id,
        system_index,
        seed,
        star_type,
        secondary_star_type,
        planet_count,
        habitable_zone_inner,
        habitable_zone_outer,
        position_x,
        position_y,
        position_z,
        is_generated
    ) VALUES (
        p_galaxy_id,
        p_system_index,
        v_system_seed,
        v_star_type,
        CASE WHEN v_star_type LIKE 'binary%' THEN
            (SELECT id FROM star_types WHERE NOT is_binary ORDER BY RANDOM() LIMIT 1)
        ELSE NULL END,
        v_planet_count,
        4,
        7,
        SIN(v_system_seed::DOUBLE PRECISION / 1000) * p_system_index,
        COS(v_system_seed::DOUBLE PRECISION / 1000) * p_system_index * 0.5,
        ((v_system_seed % 100) - 50)::DOUBLE PRECISION,
        FALSE
    )
    RETURNING id INTO v_system_id;

    -- Create star effects record
    INSERT INTO star_effects (solar_system_id, metal_multiplier, crystal_multiplier, deuterium_multiplier, energy_multiplier, expedition_bonus, fleet_damage_chance, fleet_loss_chance, is_colonizable, has_radiation_hazard, has_gravitational_anomaly)
    SELECT
        v_system_id,
        st.metal_multiplier,
        st.crystal_multiplier,
        st.deuterium_multiplier,
        st.energy_multiplier,
        st.expedition_bonus,
        st.fleet_damage_chance,
        st.fleet_loss_chance,
        st.colonizable,
        st.is_exotic AND st.id = 'neutron_star',
        st.id = 'black_hole'
    FROM star_types st
    WHERE st.id = v_star_type;

    RETURN v_system_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Generate Celestial Bodies for a System
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_celestial_bodies(p_system_id UUID)
RETURNS void AS $$
DECLARE
    v_system RECORD;
    v_star RECORD;
    v_body_seed BIGINT;
    v_body_type celestial_body_type;
    v_diameter INTEGER;
    v_fields INTEGER;
    v_moon_capacity INTEGER;
    v_temp_base INTEGER;
    v_temp_min INTEGER;
    v_temp_max INTEGER;
    v_visual_type TEXT;
    v_visual_types TEXT[] := ARRAY['desert', 'dry', 'gas', 'ice', 'jungle', 'normal', 'water'];
    i INTEGER;
    v_body_id UUID;
    j INTEGER;
    v_moon_count INTEGER;
    v_moon_seed BIGINT;
    v_moon_diameter INTEGER;
    v_moon_fields INTEGER;
BEGIN
    -- Get system info
    SELECT * INTO v_system FROM solar_systems WHERE id = p_system_id;
    IF v_system IS NULL OR v_system.is_generated THEN
        RETURN;
    END IF;

    -- Get star info
    SELECT * INTO v_star FROM star_types WHERE id = v_system.star_type;

    -- Generate each planet
    FOR i IN 1..v_system.planet_count LOOP
        v_body_seed := v_system.seed # (i * 10);

        -- Determine body type based on position
        IF i <= 3 THEN
            -- Inner planets: rocky, smaller
            v_body_type := 'rocky_planet';
            v_diameter := 4000 + (v_body_seed % 8000)::INTEGER;
            v_fields := 8 + (v_body_seed % 5)::INTEGER;
            v_temp_base := 200 - (i * 40);
        ELSIF i <= 7 THEN
            -- Middle zone: habitable rocky planets
            v_body_type := 'rocky_planet';
            v_diameter := 8000 + (v_body_seed % 12000)::INTEGER;
            v_fields := 12 + (v_body_seed % 9)::INTEGER;
            v_temp_base := 80 - ((i - 4) * 25);
        ELSIF i <= 10 THEN
            -- Outer zone: gas/ice giants
            IF (v_body_seed % 2) = 0 THEN
                v_body_type := 'gas_giant';
                v_diameter := 50000 + (v_body_seed % 100000)::INTEGER;
                v_fields := 0; -- Gas giants not colonizable
            ELSE
                v_body_type := 'ice_giant';
                v_diameter := 20000 + (v_body_seed % 40000)::INTEGER;
                v_fields := 6 + (v_body_seed % 10)::INTEGER;
            END IF;
            v_temp_base := -50 - ((i - 7) * 30);
        ELSE
            -- Far outer: dwarf planets
            v_body_type := 'dwarf_planet';
            v_diameter := 1000 + (v_body_seed % 4000)::INTEGER;
            v_fields := 4 + (v_body_seed % 5)::INTEGER;
            v_temp_base := -150 - ((i - 10) * 20);
        END IF;

        -- Calculate moon capacity based on diameter
        IF v_diameter < 5000 THEN
            v_moon_capacity := 0;
        ELSIF v_diameter < 8000 THEN
            v_moon_capacity := 1;
        ELSIF v_diameter < 12000 THEN
            v_moon_capacity := 2;
        ELSIF v_diameter < 20000 THEN
            v_moon_capacity := 3;
        ELSIF v_diameter < 50000 THEN
            v_moon_capacity := 5;
        ELSIF v_diameter < 100000 THEN
            v_moon_capacity := 6;
        ELSE
            v_moon_capacity := 8;
        END IF;

        -- Temperature variation
        v_temp_min := v_temp_base - 20 - (v_body_seed % 20)::INTEGER;
        v_temp_max := v_temp_base + 10 + (v_body_seed % 15)::INTEGER;

        -- Visual type
        IF v_body_type = 'gas_giant' THEN
            v_visual_type := 'gas';
        ELSIF v_body_type = 'ice_giant' THEN
            v_visual_type := 'ice';
        ELSIF v_temp_base > 100 THEN
            v_visual_type := CASE WHEN (v_body_seed % 2) = 0 THEN 'desert' ELSE 'dry' END;
        ELSIF v_temp_base < -100 THEN
            v_visual_type := 'ice';
        ELSE
            v_visual_type := v_visual_types[1 + (v_body_seed % 7)::INTEGER];
        END IF;

        -- Insert celestial body
        INSERT INTO celestial_bodies (
            solar_system_id,
            body_type,
            orbital_position,
            name,
            diameter,
            fields_max,
            moon_capacity,
            temperature_min,
            temperature_max,
            seed,
            planet_visual_type,
            planet_visual_variant,
            has_rings,
            metal_multiplier,
            crystal_multiplier,
            deuterium_multiplier,
            is_colonizable
        ) VALUES (
            p_system_id,
            v_body_type,
            i,
            'Planet ' || i,
            v_diameter,
            v_fields,
            v_moon_capacity,
            v_temp_min,
            v_temp_max,
            v_body_seed,
            v_visual_type,
            1 + (v_body_seed % 10)::INTEGER,
            v_body_type = 'gas_giant' AND (v_body_seed % 3) = 0,
            CASE
                WHEN i <= 3 THEN 1.2 -- Inner: more metal
                WHEN i >= 8 THEN 0.8 -- Outer: less metal
                ELSE 1.0
            END,
            CASE
                WHEN i <= 3 THEN 0.9
                ELSE 1.0
            END,
            CASE
                WHEN i >= 8 THEN 1.5 -- Outer: more deuterium
                WHEN i <= 3 THEN 0.5 -- Inner: less deuterium
                ELSE 1.0
            END,
            v_body_type NOT IN ('gas_giant', 'asteroid_field') AND v_star.colonizable
        )
        RETURNING id INTO v_body_id;

        -- Generate moons for larger planets
        IF v_moon_capacity > 0 THEN
            v_moon_count := (v_body_seed % (v_moon_capacity + 1))::INTEGER;
            FOR j IN 1..v_moon_count LOOP
                v_moon_seed := v_body_seed # (j * 100);
                v_moon_diameter := 500 + (v_moon_seed % 3000)::INTEGER;
                v_moon_fields := LEAST(10, GREATEST(3, 3 + (v_moon_diameter / 1000)::INTEGER + (v_moon_seed % 3)::INTEGER));

                INSERT INTO celestial_bodies (
                    solar_system_id,
                    parent_body_id,
                    body_type,
                    orbital_position,
                    name,
                    diameter,
                    fields_max,
                    moon_capacity,
                    temperature_min,
                    temperature_max,
                    seed,
                    planet_visual_type,
                    planet_visual_variant,
                    metal_multiplier,
                    crystal_multiplier,
                    deuterium_multiplier,
                    is_colonizable
                ) VALUES (
                    p_system_id,
                    v_body_id,
                    'moon',
                    j,
                    'Moon ' || j,
                    v_moon_diameter,
                    v_moon_fields,
                    0,
                    v_temp_min - 10,
                    v_temp_max - 5,
                    v_moon_seed,
                    'normal',
                    1 + (v_moon_seed % 10)::INTEGER,
                    0.8,
                    0.8,
                    0.9,
                    v_star.colonizable
                );
            END LOOP;
        END IF;
    END LOOP;

    -- Mark system as generated
    UPDATE solar_systems SET is_generated = TRUE, generated_at = NOW() WHERE id = p_system_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get or Generate System with Bodies
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

    RETURN v_system_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATED: Create Initial Planet for New User
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

    -- Mark body as colonized
    UPDATE celestial_bodies SET colonized_at = NOW() WHERE id = v_body.id;

    -- Create research record
    INSERT INTO user_research (user_id) VALUES (NEW.id);

    -- Create highscore record
    INSERT INTO highscores (user_id) VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger and create new one
DROP TRIGGER IF EXISTS on_user_created ON users;
CREATE TRIGGER on_user_created
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_initial_colony();

-- ============================================================================
-- DROP OLD PLANETS TABLE (replaced by player_colonies + celestial_bodies)
-- ============================================================================
DROP TABLE IF EXISTS planets CASCADE;

-- ============================================================================
-- CREATE COMPATIBILITY VIEW (maps new schema to old planets interface)
-- ============================================================================
CREATE OR REPLACE VIEW planets_compat AS
SELECT
    pc.id,
    pc.user_id,
    pc.name,
    g.galaxy_index AS galaxy,
    ss.system_index AS system,
    cb.orbital_position AS position,
    cb.body_type::TEXT AS planet_type,
    cb.diameter,
    pc.fields_used,
    cb.fields_max,
    cb.temperature_min AS temp_min,
    cb.temperature_max AS temp_max,
    pc.metal,
    pc.metal_per_hour,
    pc.metal_max,
    pc.crystal,
    pc.crystal_per_hour,
    pc.crystal_max,
    pc.deuterium,
    pc.deuterium_per_hour,
    pc.deuterium_max,
    pc.energy_used,
    pc.energy_max,
    pc.metal_mine,
    pc.crystal_mine,
    pc.deuterium_synthesizer,
    pc.solar_plant,
    pc.fusion_plant,
    pc.metal_storage,
    pc.crystal_storage,
    pc.deuterium_tank,
    pc.robot_factory,
    pc.nanite_factory,
    pc.shipyard,
    pc.research_lab,
    pc.terraformer,
    pc.alliance_depot,
    pc.missile_silo,
    pc.space_dock,
    pc.lunar_base,
    pc.sensor_phalanx,
    pc.jump_gate,
    pc.jump_gate_cooldown,
    pc.light_fighter,
    pc.heavy_fighter,
    pc.cruiser,
    pc.battleship,
    pc.battlecruiser,
    pc.bomber,
    pc.destroyer,
    pc.deathstar,
    pc.small_cargo,
    pc.large_cargo,
    pc.colony_ship,
    pc.recycler,
    pc.espionage_probe,
    pc.solar_satellite,
    pc.crawler,
    pc.reaper,
    pc.pathfinder,
    pc.rocket_launcher,
    pc.light_laser,
    pc.heavy_laser,
    pc.gauss_cannon,
    pc.ion_cannon,
    pc.plasma_turret,
    pc.small_shield_dome,
    pc.large_shield_dome,
    pc.anti_ballistic_missile,
    pc.interplanetary_missile,
    pc.last_resource_update,
    pc.destroyed,
    pc.created_at,
    pc.updated_at
FROM player_colonies pc
JOIN celestial_bodies cb ON pc.celestial_body_id = cb.id
JOIN solar_systems ss ON cb.solar_system_id = ss.id
JOIN galaxies g ON ss.galaxy_id = g.id;

-- ============================================================================
-- INITIALIZE UNIVERSE WITH DEFAULT SEED
-- ============================================================================
-- SELECT initialize_universe(42424242424242);
