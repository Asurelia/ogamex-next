-- Migration: Cartography System
-- Sprint 3: Data Cards, Inventory, Market, Vault

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE card_rarity AS ENUM (
    'common',      -- Système standard
    'uncommon',    -- Système avec ressources spéciales
    'rare',        -- Binaire, géante
    'epic',        -- Étoile à neutrons
    'legendary'    -- Trou noir
);

CREATE TYPE card_type AS ENUM (
    'system_map',      -- Carte d'un système
    'galaxy_map',      -- Carte d'une galaxie entière
    'resource_map',    -- Carte des ressources d'une zone
    'route_map',       -- Carte d'une route sécurisée
    'wormhole_map',    -- Carte d'un trou de ver
    'special_map'      -- Carte spéciale (événement)
);

-- =============================================================================
-- TABLE: cartography_items (Data Cards)
-- =============================================================================

CREATE TABLE cartography_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Propriétaire actuel
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Type et rareté
    card_type card_type NOT NULL,
    rarity card_rarity NOT NULL,

    -- Nom et description
    name TEXT NOT NULL,
    description TEXT,

    -- Données contenues
    data_payload JSONB NOT NULL,
    -- Exemple: {
    --   "systems": ["uuid1", "uuid2"],
    --   "quality": 85,
    --   "resources": {...},
    --   "special_features": ["black_hole", "ancient_ruins"]
    -- }

    -- Métadonnées de création
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_from_discovery_id UUID REFERENCES player_discoveries(id),

    -- Coût de création
    creation_cost JSONB,
    -- { "metal": 5000, "crystal": 3000, "deuterium": 1000, "dark_matter": 0, "time_seconds": 3600 }

    -- État
    is_consumed BOOLEAN DEFAULT FALSE,
    consumed_by UUID REFERENCES users(id),
    consumed_at TIMESTAMPTZ,

    -- Trading
    is_tradeable BOOLEAN DEFAULT TRUE,
    trade_restrictions JSONB  -- { "min_level": 10, "alliance_only": false }
);

CREATE INDEX idx_cards_owner ON cartography_items(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_cards_type ON cartography_items(card_type);
CREATE INDEX idx_cards_rarity ON cartography_items(rarity);
CREATE INDEX idx_cards_tradeable ON cartography_items(is_tradeable) WHERE is_tradeable = TRUE AND is_consumed = FALSE;

-- =============================================================================
-- TABLE: player_inventory (Inventaire général)
-- =============================================================================

CREATE TABLE player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Type d'objet
    item_type TEXT NOT NULL CHECK (item_type IN (
        'data_card',
        'cartographer',    -- Instrument de cartographie
        'probe_pack',      -- Pack de sondes
        'scanner_module',  -- Module de scan avancé
        'consumable',      -- Consommable divers
        'artifact'         -- Artefact rare
    )),

    -- Référence vers l'objet spécifique
    item_id UUID,  -- FK vers la table appropriée selon item_type

    -- Quantité (pour items stackables)
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),

    -- Métadonnées
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    acquired_via TEXT CHECK (acquired_via IN (
        'purchase',
        'craft',
        'drop',
        'trade',
        'event',
        'exploration',
        'reward'
    )),

    -- Emplacement
    storage_location TEXT DEFAULT 'inventory' CHECK (storage_location IN (
        'inventory',   -- Inventaire personnel
        'vault',       -- Coffre/banque
        'market',      -- En vente sur le marché
        'escrow'       -- En attente d'échange
    ))
);

CREATE INDEX idx_inventory_user ON player_inventory(user_id);
CREATE INDEX idx_inventory_type ON player_inventory(item_type);
CREATE INDEX idx_inventory_location ON player_inventory(storage_location);
CREATE INDEX idx_inventory_item ON player_inventory(item_id) WHERE item_id IS NOT NULL;

-- =============================================================================
-- TABLE: market_listings (Hôtel des ventes)
-- =============================================================================

CREATE TABLE market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vendeur
    seller_id UUID NOT NULL REFERENCES users(id),

    -- Objet en vente
    inventory_item_id UUID NOT NULL REFERENCES player_inventory(id),

    -- Type d'article (dénormalisé pour requêtes rapides)
    item_type TEXT NOT NULL,
    item_rarity card_rarity,

    -- Prix
    price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'auction')),
    price_metal BIGINT DEFAULT 0 CHECK (price_metal >= 0),
    price_crystal BIGINT DEFAULT 0 CHECK (price_crystal >= 0),
    price_deuterium BIGINT DEFAULT 0 CHECK (price_deuterium >= 0),
    price_dark_matter INTEGER DEFAULT 0 CHECK (price_dark_matter >= 0),

    -- Enchères (si auction)
    current_bid BIGINT DEFAULT 0,
    current_bidder_id UUID REFERENCES users(id),
    min_bid_increment BIGINT DEFAULT 100,

    -- Durée
    listed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- État
    status TEXT DEFAULT 'active' CHECK (status IN (
        'active',
        'sold',
        'expired',
        'cancelled'
    )),

    -- Acheteur (une fois vendu)
    buyer_id UUID REFERENCES users(id),
    sold_at TIMESTAMPTZ,
    final_price JSONB  -- Recorded final transaction price
);

CREATE INDEX idx_listings_seller ON market_listings(seller_id);
CREATE INDEX idx_listings_status ON market_listings(status) WHERE status = 'active';
CREATE INDEX idx_listings_expires ON market_listings(expires_at) WHERE status = 'active';
CREATE INDEX idx_listings_type ON market_listings(item_type, item_rarity) WHERE status = 'active';
CREATE INDEX idx_listings_price ON market_listings(price_metal, price_crystal) WHERE status = 'active';

-- =============================================================================
-- TABLE: market_bids (Historique des enchères)
-- =============================================================================

CREATE TABLE market_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id),
    bid_amount BIGINT NOT NULL CHECK (bid_amount > 0),
    bid_at TIMESTAMPTZ DEFAULT NOW(),
    is_winning BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_bids_listing ON market_bids(listing_id);
CREATE INDEX idx_bids_bidder ON market_bids(bidder_id);

-- =============================================================================
-- TABLE: player_vault (Coffre/Banque)
-- =============================================================================

CREATE TABLE player_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Capacité du coffre (upgradeable)
    max_slots INTEGER DEFAULT 10 CHECK (max_slots > 0),
    used_slots INTEGER DEFAULT 0 CHECK (used_slots >= 0),

    -- Niveau du coffre
    vault_level INTEGER DEFAULT 1 CHECK (vault_level >= 1),

    -- Coût d'upgrade (calculé dynamiquement mais peut être override)
    next_upgrade_cost JSONB DEFAULT '{"metal": 10000, "crystal": 5000, "deuterium": 2000}'::JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT vault_slots_valid CHECK (used_slots <= max_slots)
);

-- Un coffre par joueur
CREATE UNIQUE INDEX idx_vault_user ON player_vault(user_id);

-- =============================================================================
-- TABLE: card_creation_queue (File de création de cartes)
-- =============================================================================

CREATE TABLE card_creation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Découverte source
    discovery_id UUID NOT NULL REFERENCES player_discoveries(id),

    -- Type de carte à créer
    card_type card_type NOT NULL,
    target_rarity card_rarity NOT NULL,

    -- Coût payé
    cost_metal BIGINT NOT NULL DEFAULT 0,
    cost_crystal BIGINT NOT NULL DEFAULT 0,
    cost_deuterium BIGINT NOT NULL DEFAULT 0,
    cost_dark_matter INTEGER NOT NULL DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completes_at TIMESTAMPTZ NOT NULL,

    -- État
    status TEXT DEFAULT 'in_progress' CHECK (status IN (
        'in_progress',
        'completed',
        'cancelled'
    )),

    -- Carte créée (une fois terminée)
    created_card_id UUID REFERENCES cartography_items(id),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_card_queue_user ON card_creation_queue(user_id);
CREATE INDEX idx_card_queue_status ON card_creation_queue(status) WHERE status = 'in_progress';
CREATE INDEX idx_card_queue_completes ON card_creation_queue(completes_at) WHERE status = 'in_progress';

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to calculate card creation cost based on rarity
CREATE OR REPLACE FUNCTION get_card_creation_cost(p_rarity card_rarity)
RETURNS JSONB AS $$
BEGIN
    RETURN CASE p_rarity
        WHEN 'common' THEN '{"metal": 1000, "crystal": 500, "deuterium": 200, "dark_matter": 0, "time_seconds": 1800}'::JSONB
        WHEN 'uncommon' THEN '{"metal": 5000, "crystal": 2500, "deuterium": 1000, "dark_matter": 0, "time_seconds": 7200}'::JSONB
        WHEN 'rare' THEN '{"metal": 20000, "crystal": 10000, "deuterium": 5000, "dark_matter": 10, "time_seconds": 28800}'::JSONB
        WHEN 'epic' THEN '{"metal": 100000, "crystal": 50000, "deuterium": 25000, "dark_matter": 50, "time_seconds": 86400}'::JSONB
        WHEN 'legendary' THEN '{"metal": 500000, "crystal": 250000, "deuterium": 100000, "dark_matter": 200, "time_seconds": 259200}'::JSONB
        ELSE '{"metal": 1000, "crystal": 500, "deuterium": 200, "dark_matter": 0, "time_seconds": 1800}'::JSONB
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate estimated card value
CREATE OR REPLACE FUNCTION get_card_estimated_value(p_rarity card_rarity)
RETURNS JSONB AS $$
BEGIN
    RETURN CASE p_rarity
        WHEN 'common' THEN '{"min_metal": 500, "max_metal": 2000, "min_crystal": 250, "max_crystal": 1000}'::JSONB
        WHEN 'uncommon' THEN '{"min_metal": 2000, "max_metal": 10000, "min_crystal": 1000, "max_crystal": 5000}'::JSONB
        WHEN 'rare' THEN '{"min_metal": 10000, "max_metal": 50000, "min_crystal": 5000, "max_crystal": 25000}'::JSONB
        WHEN 'epic' THEN '{"min_metal": 50000, "max_metal": 250000, "min_crystal": 25000, "max_crystal": 125000}'::JSONB
        WHEN 'legendary' THEN '{"min_metal": 250000, "max_metal": 2000000, "min_crystal": 125000, "max_crystal": 1000000}'::JSONB
        ELSE '{"min_metal": 500, "max_metal": 2000, "min_crystal": 250, "max_crystal": 1000}'::JSONB
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get vault upgrade cost
CREATE OR REPLACE FUNCTION get_vault_upgrade_cost(p_current_level INTEGER)
RETURNS JSONB AS $$
DECLARE
    base_metal INTEGER := 10000;
    base_crystal INTEGER := 5000;
    base_deuterium INTEGER := 2000;
    multiplier FLOAT;
BEGIN
    multiplier := POWER(1.5, p_current_level);
    RETURN jsonb_build_object(
        'metal', FLOOR(base_metal * multiplier),
        'crystal', FLOOR(base_crystal * multiplier),
        'deuterium', FLOOR(base_deuterium * multiplier),
        'slots_gained', 5
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to create vault for new player
CREATE OR REPLACE FUNCTION create_player_vault()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO player_vault (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create vault when user is created
CREATE TRIGGER trigger_create_player_vault
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_player_vault();

-- Function to update vault used_slots
CREATE OR REPLACE FUNCTION update_vault_slots()
RETURNS TRIGGER AS $$
BEGIN
    -- Update used_slots when items are moved to/from vault
    IF TG_OP = 'INSERT' AND NEW.storage_location = 'vault' THEN
        UPDATE player_vault
        SET used_slots = used_slots + 1, updated_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.storage_location != 'vault' AND NEW.storage_location = 'vault' THEN
            UPDATE player_vault
            SET used_slots = used_slots + 1, updated_at = NOW()
            WHERE user_id = NEW.user_id;
        ELSIF OLD.storage_location = 'vault' AND NEW.storage_location != 'vault' THEN
            UPDATE player_vault
            SET used_slots = GREATEST(0, used_slots - 1), updated_at = NOW()
            WHERE user_id = NEW.user_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.storage_location = 'vault' THEN
        UPDATE player_vault
        SET used_slots = GREATEST(0, used_slots - 1), updated_at = NOW()
        WHERE user_id = OLD.user_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vault_slots
    AFTER INSERT OR UPDATE OR DELETE ON player_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_vault_slots();

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE cartography_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_creation_queue ENABLE ROW LEVEL SECURITY;

-- Cartography Items: Owner can see their cards, everyone can see tradeable cards on market
CREATE POLICY "Users can view own cards" ON cartography_items
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can view tradeable cards" ON cartography_items
    FOR SELECT USING (is_tradeable = TRUE AND is_consumed = FALSE);

CREATE POLICY "Users can update own cards" ON cartography_items
    FOR UPDATE USING (auth.uid() = owner_id);

-- Player Inventory: Only owner can see their inventory
CREATE POLICY "Users can view own inventory" ON player_inventory
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory" ON player_inventory
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory" ON player_inventory
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory" ON player_inventory
    FOR DELETE USING (auth.uid() = user_id);

-- Market Listings: Everyone can see active listings
CREATE POLICY "Anyone can view active listings" ON market_listings
    FOR SELECT USING (status = 'active');

CREATE POLICY "Sellers can view own listings" ON market_listings
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Users can create listings" ON market_listings
    FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own listings" ON market_listings
    FOR UPDATE USING (auth.uid() = seller_id);

-- Market Bids: Users can see bids on listings they're involved in
CREATE POLICY "Users can view relevant bids" ON market_bids
    FOR SELECT USING (
        auth.uid() = bidder_id OR
        EXISTS (
            SELECT 1 FROM market_listings
            WHERE id = listing_id AND seller_id = auth.uid()
        )
    );

CREATE POLICY "Users can place bids" ON market_bids
    FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- Player Vault: Only owner can see their vault
CREATE POLICY "Users can view own vault" ON player_vault
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vault" ON player_vault
    FOR UPDATE USING (auth.uid() = user_id);

-- Card Creation Queue: Only owner can see their queue
CREATE POLICY "Users can view own card queue" ON card_creation_queue
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own card queue" ON card_creation_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own card queue" ON card_creation_queue
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- CREATE VAULTS FOR EXISTING USERS
-- =============================================================================

INSERT INTO player_vault (user_id)
SELECT id FROM users
WHERE id NOT IN (SELECT user_id FROM player_vault)
ON CONFLICT (user_id) DO NOTHING;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE cartography_items IS 'Data Cards - tradeable exploration data';
COMMENT ON TABLE player_inventory IS 'Player inventory for all item types';
COMMENT ON TABLE market_listings IS 'Auction house listings';
COMMENT ON TABLE market_bids IS 'Bid history for auctions';
COMMENT ON TABLE player_vault IS 'Player vault/bank storage';
COMMENT ON TABLE card_creation_queue IS 'Queue for cards being created';
