-- ============================================================================
-- OGameX Alliance Management System Migration
-- Creates alliance_members, alliance_applications, alliance_invitations,
-- alliance_diplomacy, and alliance_circular tables
-- ============================================================================

-- ============================================================================
-- UPDATE ALLIANCES TABLE (add missing columns)
-- ============================================================================
ALTER TABLE alliances
ADD COLUMN IF NOT EXISTS internal_text TEXT,
ADD COLUMN IF NOT EXISTS external_text TEXT,
ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_points BIGINT DEFAULT 0;

-- Set leader_id to founder_id if not set
UPDATE alliances SET leader_id = founder_id WHERE leader_id IS NULL;

-- ============================================================================
-- ALLIANCE RANKS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE alliance_rank AS ENUM ('founder', 'leader', 'officer', 'veteran', 'member', 'newbie');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ALLIANCE APPLICATION STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ALLIANCE INVITATION STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- DIPLOMACY RELATION TYPE ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE diplomacy_relation AS ENUM ('war', 'nap', 'ally', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- DIPLOMACY STATUS ENUM
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE diplomacy_status AS ENUM ('proposed', 'active', 'rejected', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- ALLIANCE MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS alliance_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank alliance_rank NOT NULL DEFAULT 'newbie',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only be in one alliance
    UNIQUE (user_id),
    -- Each user can only have one membership per alliance
    UNIQUE (alliance_id, user_id)
);

-- ============================================================================
-- ALLIANCE APPLICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS alliance_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status application_status NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One pending application per user per alliance
    UNIQUE (alliance_id, user_id, status)
);

-- ============================================================================
-- ALLIANCE INVITATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS alliance_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id),
    message TEXT,
    status invitation_status NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- One pending invitation per user per alliance
    UNIQUE (alliance_id, invited_user_id, status)
);

-- ============================================================================
-- ALLIANCE DIPLOMACY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS alliance_diplomacy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    target_alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    relation_type diplomacy_relation NOT NULL,
    proposed_by UUID NOT NULL REFERENCES users(id),
    accepted_by UUID REFERENCES users(id),
    status diplomacy_status NOT NULL DEFAULT 'proposed',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Cannot have diplomacy with self
    CHECK (alliance_id != target_alliance_id),
    -- One active relation per pair
    UNIQUE (alliance_id, target_alliance_id, status)
);

-- ============================================================================
-- ALLIANCE CIRCULAR TABLE (Broadcast messages)
-- ============================================================================
CREATE TABLE IF NOT EXISTS alliance_circular (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alliance_id UUID NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_alliance_members_alliance ON alliance_members(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_user ON alliance_members(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_members_rank ON alliance_members(alliance_id, rank);

CREATE INDEX IF NOT EXISTS idx_alliance_applications_alliance ON alliance_applications(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_applications_user ON alliance_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_applications_status ON alliance_applications(alliance_id, status);

CREATE INDEX IF NOT EXISTS idx_alliance_invitations_alliance ON alliance_invitations(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invitations_user ON alliance_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_alliance_invitations_status ON alliance_invitations(status, expires_at);

CREATE INDEX IF NOT EXISTS idx_alliance_diplomacy_alliance ON alliance_diplomacy(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_diplomacy_target ON alliance_diplomacy(target_alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_diplomacy_status ON alliance_diplomacy(status);

CREATE INDEX IF NOT EXISTS idx_alliance_circular_alliance ON alliance_circular(alliance_id);
CREATE INDEX IF NOT EXISTS idx_alliance_circular_created ON alliance_circular(alliance_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE alliance_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_diplomacy ENABLE ROW LEVEL SECURITY;
ALTER TABLE alliance_circular ENABLE ROW LEVEL SECURITY;

-- Alliance members: read for all (public info), manage for officers+
CREATE POLICY alliance_members_select ON alliance_members
    FOR SELECT USING (true);

CREATE POLICY alliance_members_insert ON alliance_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
        OR auth.uid() = user_id -- User joining via accepted application/invitation
    );

CREATE POLICY alliance_members_update ON alliance_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_members.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader')
        )
    );

CREATE POLICY alliance_members_delete ON alliance_members
    FOR DELETE USING (
        auth.uid() = user_id -- Leave alliance
        OR EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_members.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

-- Applications: users can see/manage their own, officers can see all for their alliance
CREATE POLICY alliance_applications_select ON alliance_applications
    FOR SELECT USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_applications.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

CREATE POLICY alliance_applications_insert ON alliance_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY alliance_applications_update ON alliance_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_applications.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

CREATE POLICY alliance_applications_delete ON alliance_applications
    FOR DELETE USING (auth.uid() = user_id);

-- Invitations: invited user can see, officers can manage
CREATE POLICY alliance_invitations_select ON alliance_invitations
    FOR SELECT USING (
        auth.uid() = invited_user_id
        OR EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_invitations.alliance_id
            AND am.user_id = auth.uid()
        )
    );

CREATE POLICY alliance_invitations_insert ON alliance_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

CREATE POLICY alliance_invitations_update ON alliance_invitations
    FOR UPDATE USING (
        auth.uid() = invited_user_id -- Accept/reject own invitation
        OR EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_invitations.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

CREATE POLICY alliance_invitations_delete ON alliance_invitations
    FOR DELETE USING (
        auth.uid() = invited_user_id
        OR EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_invitations.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

-- Diplomacy: leaders can manage, all members can view
CREATE POLICY alliance_diplomacy_select ON alliance_diplomacy
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE (am.alliance_id = alliance_diplomacy.alliance_id OR am.alliance_id = alliance_diplomacy.target_alliance_id)
            AND am.user_id = auth.uid()
        )
    );

CREATE POLICY alliance_diplomacy_insert ON alliance_diplomacy
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader')
        )
    );

CREATE POLICY alliance_diplomacy_update ON alliance_diplomacy
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE (am.alliance_id = alliance_diplomacy.alliance_id OR am.alliance_id = alliance_diplomacy.target_alliance_id)
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader')
        )
    );

CREATE POLICY alliance_diplomacy_delete ON alliance_diplomacy
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_diplomacy.alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader')
        )
    );

-- Circulars: officers can send, members can read
CREATE POLICY alliance_circular_select ON alliance_circular
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_circular.alliance_id
            AND am.user_id = auth.uid()
        )
    );

CREATE POLICY alliance_circular_insert ON alliance_circular
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM alliance_members am
            WHERE am.alliance_id = alliance_id
            AND am.user_id = auth.uid()
            AND am.rank IN ('founder', 'leader', 'officer')
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update alliance member count
CREATE OR REPLACE FUNCTION update_alliance_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE alliances SET
            member_count = (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = NEW.alliance_id),
            updated_at = NOW()
        WHERE id = NEW.alliance_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE alliances SET
            member_count = (SELECT COUNT(*) FROM alliance_members WHERE alliance_id = OLD.alliance_id),
            updated_at = NOW()
        WHERE id = OLD.alliance_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for member count updates
DROP TRIGGER IF EXISTS trigger_alliance_member_count ON alliance_members;
CREATE TRIGGER trigger_alliance_member_count
    AFTER INSERT OR DELETE ON alliance_members
    FOR EACH ROW
    EXECUTE FUNCTION update_alliance_member_count();

-- Function to expire old invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE alliance_invitations
    SET status = 'expired'
    WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create alliance with founder as member
CREATE OR REPLACE FUNCTION create_alliance_with_founder(
    p_user_id UUID,
    p_name TEXT,
    p_tag TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_alliance_id UUID;
BEGIN
    -- Check user is not already in an alliance
    IF EXISTS (SELECT 1 FROM alliance_members WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already in an alliance';
    END IF;

    -- Create alliance
    INSERT INTO alliances (founder_id, leader_id, name, tag, description, member_count)
    VALUES (p_user_id, p_user_id, p_name, p_tag, p_description, 1)
    RETURNING id INTO v_alliance_id;

    -- Add founder as member
    INSERT INTO alliance_members (alliance_id, user_id, rank, joined_at)
    VALUES (v_alliance_id, p_user_id, 'founder', NOW());

    -- Update user's alliance_id
    UPDATE users SET alliance_id = v_alliance_id WHERE id = p_user_id;

    RETURN v_alliance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join alliance (after accepted application/invitation)
CREATE OR REPLACE FUNCTION join_alliance(
    p_user_id UUID,
    p_alliance_id UUID,
    p_rank alliance_rank DEFAULT 'newbie'
)
RETURNS void AS $$
BEGIN
    -- Check user is not already in an alliance
    IF EXISTS (SELECT 1 FROM alliance_members WHERE user_id = p_user_id) THEN
        RAISE EXCEPTION 'User is already in an alliance';
    END IF;

    -- Add member
    INSERT INTO alliance_members (alliance_id, user_id, rank, joined_at)
    VALUES (p_alliance_id, p_user_id, p_rank, NOW());

    -- Update user's alliance_id
    UPDATE users SET alliance_id = p_alliance_id WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave alliance
CREATE OR REPLACE FUNCTION leave_alliance(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_alliance_id UUID;
    v_rank alliance_rank;
    v_member_count INTEGER;
BEGIN
    -- Get member info
    SELECT alliance_id, rank INTO v_alliance_id, v_rank
    FROM alliance_members
    WHERE user_id = p_user_id;

    IF v_alliance_id IS NULL THEN
        RAISE EXCEPTION 'User is not in an alliance';
    END IF;

    -- Founders cannot leave if there are other members (must transfer leadership first)
    IF v_rank = 'founder' THEN
        SELECT COUNT(*) INTO v_member_count FROM alliance_members WHERE alliance_id = v_alliance_id;
        IF v_member_count > 1 THEN
            RAISE EXCEPTION 'Founder must transfer leadership before leaving';
        END IF;

        -- Delete alliance if founder is only member
        DELETE FROM alliances WHERE id = v_alliance_id;
    ELSE
        -- Remove member
        DELETE FROM alliance_members WHERE user_id = p_user_id;
    END IF;

    -- Update user's alliance_id
    UPDATE users SET alliance_id = NULL WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Alliance overview view
CREATE OR REPLACE VIEW alliance_overview AS
SELECT
    a.id,
    a.name,
    a.tag,
    a.description,
    a.logo_url,
    a.founder_id,
    a.leader_id,
    a.member_count,
    a.total_points,
    a.created_at,
    u_founder.username AS founder_username,
    u_leader.username AS leader_username
FROM alliances a
LEFT JOIN users u_founder ON a.founder_id = u_founder.id
LEFT JOIN users u_leader ON a.leader_id = u_leader.id;

-- Alliance members with user details view
CREATE OR REPLACE VIEW alliance_members_view AS
SELECT
    am.id,
    am.alliance_id,
    am.user_id,
    am.rank,
    am.joined_at,
    u.username,
    COALESCE(ps.total_points, 0) AS points,
    (SELECT COUNT(*) FROM player_colonies pc WHERE pc.user_id = am.user_id AND pc.destroyed = FALSE) AS planets_count
FROM alliance_members am
JOIN users u ON am.user_id = u.id
LEFT JOIN player_scores ps ON ps.user_id = am.user_id;

-- Alliance diplomacy overview
CREATE OR REPLACE VIEW alliance_diplomacy_view AS
SELECT
    ad.id,
    ad.alliance_id,
    ad.target_alliance_id,
    ad.relation_type,
    ad.status,
    ad.created_at,
    ad.expires_at,
    a1.name AS alliance_name,
    a1.tag AS alliance_tag,
    a2.name AS target_alliance_name,
    a2.tag AS target_alliance_tag
FROM alliance_diplomacy ad
JOIN alliances a1 ON ad.alliance_id = a1.id
JOIN alliances a2 ON ad.target_alliance_id = a2.id;
