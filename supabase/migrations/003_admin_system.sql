-- ============================================================================
-- OGameX Admin System Migration
-- Creates admin roles, audit logging, game config, boost types, currencies
-- ============================================================================

-- ============================================================================
-- ADMIN ROLES TABLE
-- ============================================================================
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'game_master', 'support', 'readonly')),
    permissions JSONB DEFAULT '[]'::jsonb,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Role descriptions:
-- super_admin: Full access to everything, can manage other admins
-- game_master: Can modify game config, entities, give boosts, manage players (no admin management)
-- support: Can view player data, give resources/boosts, but cannot modify game config
-- readonly: Can only view admin panel data, no modifications

-- ============================================================================
-- ADMIN AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    admin_username TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GAME CONFIG TABLE
-- Stores dynamic game configuration that can be changed without redeployment
-- ============================================================================
CREATE TABLE game_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'production', 'construction', 'research', 'combat', 'fleet',
        'economy', 'universe', 'features', 'limits', 'formulas'
    )),
    value_type TEXT NOT NULL CHECK (value_type IN ('number', 'string', 'boolean', 'json', 'formula')),
    default_value JSONB NOT NULL,
    min_value JSONB,
    max_value JSONB,
    description TEXT,
    requires_restart BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GAME BOOST TYPES TABLE
-- Defines available boost types that players can activate
-- ============================================================================
CREATE TABLE game_boost_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#00ffcc',
    glow_color TEXT DEFAULT 'rgba(0, 255, 204, 0.5)',
    multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    energy_cost INTEGER NOT NULL DEFAULT 20,
    scope TEXT NOT NULL DEFAULT 'global' CHECK (scope IN ('global', 'planet', 'fleet')),
    stackable BOOLEAN DEFAULT FALSE,
    max_stacks INTEGER DEFAULT 1,
    cooldown_minutes INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GAME CURRENCIES TABLE
-- Defines available currencies in the game
-- ============================================================================
CREATE TABLE game_currencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    color TEXT DEFAULT '#ffffff',
    is_premium BOOLEAN DEFAULT FALSE,
    regen_rate DECIMAL(10,4) DEFAULT 0,
    regen_interval_seconds INTEGER DEFAULT 3600,
    max_amount INTEGER DEFAULT NULL,
    default_amount INTEGER DEFAULT 0,
    can_be_traded BOOLEAN DEFAULT FALSE,
    can_be_gifted BOOLEAN DEFAULT FALSE,
    enabled BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_admin_roles_user ON admin_roles(user_id);
CREATE INDEX idx_admin_roles_active ON admin_roles(active);
CREATE INDEX idx_admin_audit_admin ON admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_entity ON admin_audit_log(entity_type, entity_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX idx_game_config_category ON game_config(category);
CREATE INDEX idx_game_config_key ON game_config(key);
CREATE INDEX idx_boost_types_enabled ON game_boost_types(enabled);
CREATE INDEX idx_currencies_enabled ON game_currencies(enabled);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_boost_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_currencies ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_roles
        WHERE user_id = check_user_id
        AND active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check admin permission level
CREATE OR REPLACE FUNCTION get_admin_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM admin_roles
    WHERE user_id = check_user_id
    AND active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    ORDER BY
        CASE role
            WHEN 'super_admin' THEN 1
            WHEN 'game_master' THEN 2
            WHEN 'support' THEN 3
            WHEN 'readonly' THEN 4
        END
    LIMIT 1;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin roles policies
CREATE POLICY admin_roles_select ON admin_roles
    FOR SELECT USING (
        auth.uid() = user_id OR
        is_admin(auth.uid())
    );

CREATE POLICY admin_roles_insert ON admin_roles
    FOR INSERT WITH CHECK (
        get_admin_role(auth.uid()) = 'super_admin'
    );

CREATE POLICY admin_roles_update ON admin_roles
    FOR UPDATE USING (
        get_admin_role(auth.uid()) = 'super_admin'
    );

CREATE POLICY admin_roles_delete ON admin_roles
    FOR DELETE USING (
        get_admin_role(auth.uid()) = 'super_admin'
    );

-- Audit log policies (only admins can read, system inserts)
CREATE POLICY audit_log_select ON admin_audit_log
    FOR SELECT USING (
        is_admin(auth.uid())
    );

CREATE POLICY audit_log_insert ON admin_audit_log
    FOR INSERT WITH CHECK (
        is_admin(auth.uid())
    );

-- Game config policies
CREATE POLICY game_config_select ON game_config
    FOR SELECT USING (TRUE); -- Everyone can read config

CREATE POLICY game_config_insert ON game_config
    FOR INSERT WITH CHECK (
        get_admin_role(auth.uid()) IN ('super_admin', 'game_master')
    );

CREATE POLICY game_config_update ON game_config
    FOR UPDATE USING (
        get_admin_role(auth.uid()) IN ('super_admin', 'game_master')
    );

CREATE POLICY game_config_delete ON game_config
    FOR DELETE USING (
        get_admin_role(auth.uid()) = 'super_admin'
    );

-- Boost types policies
CREATE POLICY boost_types_select ON game_boost_types
    FOR SELECT USING (TRUE); -- Everyone can read

CREATE POLICY boost_types_modify ON game_boost_types
    FOR ALL USING (
        get_admin_role(auth.uid()) IN ('super_admin', 'game_master')
    );

-- Currencies policies
CREATE POLICY currencies_select ON game_currencies
    FOR SELECT USING (TRUE); -- Everyone can read

CREATE POLICY currencies_modify ON game_currencies
    FOR ALL USING (
        get_admin_role(auth.uid()) IN ('super_admin', 'game_master')
    );

-- ============================================================================
-- INSERT DEFAULT BOOST TYPES (migrate from hardcoded)
-- ============================================================================
INSERT INTO game_boost_types (key, name, description, icon, color, glow_color, multiplier, duration_minutes, energy_cost, scope) VALUES
('production', 'Production Boost', 'Increases resource production on all planets', '⛏️', '#00ff88', 'rgba(0, 255, 136, 0.5)', 1.5, 60, 20, 'global'),
('construction', 'Construction Boost', 'Speeds up building construction', '🏗️', '#ffaa00', 'rgba(255, 170, 0, 0.5)', 1.25, 30, 15, 'global'),
('research', 'Research Boost', 'Speeds up research completion', '🔬', '#aa88ff', 'rgba(170, 136, 255, 0.5)', 1.25, 30, 15, 'global'),
('expedition', 'Expedition Boost', 'Increases expedition rewards', '🚀', '#00ccff', 'rgba(0, 204, 255, 0.5)', 1.5, 120, 25, 'global'),
('attack', 'Combat Boost', 'Increases fleet attack power', '⚔️', '#ff4444', 'rgba(255, 68, 68, 0.5)', 1.2, 30, 30, 'fleet');

-- ============================================================================
-- INSERT DEFAULT CURRENCIES
-- ============================================================================
INSERT INTO game_currencies (key, name, description, icon, color, is_premium, regen_rate, regen_interval_seconds, max_amount, default_amount) VALUES
('dark_matter', 'Dark Matter', 'Premium currency for special features', '💎', '#aa88ff', TRUE, 0, 0, NULL, 0),
('boost_energy', 'Boost Energy', 'Energy used to activate boosts', '⚡', '#00ffcc', FALSE, 1, 600, 100, 50),
('alliance_points', 'Alliance Points', 'Points earned through alliance activities', '🏛️', '#ffaa00', FALSE, 0, 0, NULL, 0),
('honor_points', 'Honor Points', 'Points earned through combat', '⚔️', '#ff4444', FALSE, 0, 0, NULL, 0);

-- ============================================================================
-- INSERT DEFAULT GAME CONFIG
-- ============================================================================
INSERT INTO game_config (key, value, category, value_type, default_value, min_value, max_value, description) VALUES
-- Production
('production_speed', '1', 'production', 'number', '1', '0.1', '10', 'Global production speed multiplier'),
('metal_base_production', '30', 'production', 'number', '30', '1', '1000', 'Base metal production per hour'),
('crystal_base_production', '15', 'production', 'number', '15', '1', '1000', 'Base crystal production per hour'),
('deuterium_base_production', '0', 'production', 'number', '0', '0', '1000', 'Base deuterium production per hour'),

-- Construction
('construction_speed', '1', 'construction', 'number', '1', '0.1', '10', 'Global construction speed multiplier'),
('building_queue_size', '5', 'construction', 'number', '5', '1', '20', 'Maximum buildings in queue'),

-- Research
('research_speed', '1', 'research', 'number', '1', '0.1', '10', 'Global research speed multiplier'),
('research_queue_size', '1', 'research', 'number', '1', '1', '10', 'Maximum research in queue'),

-- Combat
('fleet_speed', '1', 'fleet', 'number', '1', '0.1', '10', 'Global fleet speed multiplier'),
('debris_ratio', '0.3', 'combat', 'number', '0.3', '0', '1', 'Ratio of destroyed ships converted to debris'),
('debris_defense_ratio', '0', 'combat', 'number', '0', '0', '1', 'Ratio of destroyed defense converted to debris'),
('defense_repair_ratio', '0.7', 'combat', 'number', '0.7', '0', '1', 'Ratio of destroyed defense that gets repaired'),

-- Universe
('galaxy_count', '9', 'universe', 'number', '9', '1', '20', 'Number of galaxies'),
('system_count', '499', 'universe', 'number', '499', '100', '999', 'Number of systems per galaxy'),
('planet_slots', '15', 'universe', 'number', '15', '10', '20', 'Number of planet slots per system'),

-- Features
('acs_enabled', 'true', 'features', 'boolean', 'true', NULL, NULL, 'Allied Combat System enabled'),
('expeditions_enabled', 'true', 'features', 'boolean', 'true', NULL, NULL, 'Expeditions enabled'),
('vacation_mode_enabled', 'true', 'features', 'boolean', 'true', NULL, NULL, 'Vacation mode enabled'),

-- Limits
('max_planets_per_user', '9', 'limits', 'number', '9', '1', '20', 'Maximum planets per user'),
('max_fleet_slots', '15', 'limits', 'number', '15', '1', '30', 'Maximum fleet slots per user'),
('max_expeditions', '3', 'limits', 'number', '3', '1', '10', 'Maximum concurrent expeditions'),

-- Formulas
('metal_mine_formula', 'Math.floor(30 * level * Math.pow(1.1, level))', 'formulas', 'formula', 'Math.floor(30 * level * Math.pow(1.1, level))', NULL, NULL, 'Metal mine production formula'),
('crystal_mine_formula', 'Math.floor(20 * level * Math.pow(1.1, level))', 'formulas', 'formula', 'Math.floor(20 * level * Math.pow(1.1, level))', NULL, NULL, 'Crystal mine production formula'),
('deuterium_synth_formula', 'Math.floor(10 * level * Math.pow(1.1, level) * (1.44 - 0.004 * planetTemp))', 'formulas', 'formula', 'Math.floor(10 * level * Math.pow(1.1, level) * (1.44 - 0.004 * planetTemp))', NULL, NULL, 'Deuterium synthesizer production formula');

-- ============================================================================
-- ADD BOOST ENERGY FIELDS TO USERS TABLE IF NOT EXISTS
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'boost_energy') THEN
        ALTER TABLE users ADD COLUMN boost_energy INTEGER DEFAULT 50;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'boost_energy_max') THEN
        ALTER TABLE users ADD COLUMN boost_energy_max INTEGER DEFAULT 100;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'boost_energy_last_regen') THEN
        ALTER TABLE users ADD COLUMN boost_energy_last_regen TIMESTAMPTZ DEFAULT NOW();
    END IF;
END$$;

-- ============================================================================
-- USER ACTIVE BOOSTS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_active_boosts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    boost_type TEXT NOT NULL,
    multiplier DECIMAL(5,2) NOT NULL,
    planet_id UUID REFERENCES planets(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_active_boosts_user ON user_active_boosts(user_id);
CREATE INDEX IF NOT EXISTS idx_active_boosts_ends ON user_active_boosts(ends_at);

ALTER TABLE user_active_boosts ENABLE ROW LEVEL SECURITY;

-- Users can see and manage their own boosts
DROP POLICY IF EXISTS active_boosts_select ON user_active_boosts;
CREATE POLICY active_boosts_select ON user_active_boosts
    FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS active_boosts_insert ON user_active_boosts;
CREATE POLICY active_boosts_insert ON user_active_boosts
    FOR INSERT WITH CHECK (auth.uid() = user_id OR is_admin(auth.uid()));

DROP POLICY IF EXISTS active_boosts_delete ON user_active_boosts;
CREATE POLICY active_boosts_delete ON user_active_boosts
    FOR DELETE USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- ============================================================================
-- AUDIT LOG FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action TEXT,
    p_entity_type TEXT DEFAULT NULL,
    p_entity_id TEXT DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
    admin_name TEXT;
BEGIN
    SELECT username INTO admin_name FROM users WHERE id = p_admin_id;

    INSERT INTO admin_audit_log (admin_id, admin_username, action, entity_type, entity_id, old_value, new_value, metadata)
    VALUES (p_admin_id, admin_name, p_action, p_entity_type, p_entity_id, p_old_value, p_new_value, p_metadata)
    RETURNING id INTO log_id;

    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT ADMIN ROLE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION grant_admin_role(
    target_user_id UUID,
    role_name TEXT,
    granted_by_id UUID,
    expires TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_role_id UUID;
    granter_role TEXT;
BEGIN
    -- Check if granter is super_admin
    granter_role := get_admin_role(granted_by_id);
    IF granter_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super_admin can grant admin roles';
    END IF;

    -- Insert or update role
    INSERT INTO admin_roles (user_id, role, granted_by, expires_at)
    VALUES (target_user_id, role_name, granted_by_id, expires)
    ON CONFLICT (user_id, role)
    DO UPDATE SET
        active = TRUE,
        granted_by = granted_by_id,
        expires_at = expires,
        updated_at = NOW()
    RETURNING id INTO new_role_id;

    -- Log action
    PERFORM log_admin_action(
        granted_by_id,
        'grant_admin_role',
        'admin_role',
        new_role_id::TEXT,
        NULL,
        jsonb_build_object('user_id', target_user_id, 'role', role_name, 'expires_at', expires)
    );

    RETURN new_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- REVOKE ADMIN ROLE FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION revoke_admin_role(
    target_user_id UUID,
    role_name TEXT,
    revoked_by_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    revoker_role TEXT;
BEGIN
    -- Check if revoker is super_admin
    revoker_role := get_admin_role(revoked_by_id);
    IF revoker_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super_admin can revoke admin roles';
    END IF;

    -- Deactivate role
    UPDATE admin_roles
    SET active = FALSE, updated_at = NOW()
    WHERE user_id = target_user_id AND role = role_name;

    -- Log action
    PERFORM log_admin_action(
        revoked_by_id,
        'revoke_admin_role',
        'admin_role',
        NULL,
        jsonb_build_object('user_id', target_user_id, 'role', role_name),
        NULL
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
