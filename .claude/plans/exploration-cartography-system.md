# Plan: Système d'Exploration et Cartographie

## Résumé

Système de **brouillard de guerre personnel** où chaque joueur doit découvrir les systèmes individuellement. Les données d'exploration peuvent être transformées en **Data Cards** échangeables via un **Cartographe**.

---

## Architecture du Système

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         VISIBILITÉ DES SYSTÈMES                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   🔴 INCONNU          🟡 DÉTECTÉ           🟢 EXPLORÉ                  │
│   - Aucune info       - Position connue    - Infos complètes           │
│   - "???"             - Type étoile ???    - Planètes visibles         │
│   - Non navigable     - Navigable          - Ressources connues        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        CONNEXIONS ENTRE SYSTÈMES                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Chaque système a 1-6 connexions vers d'autres systèmes               │
│                                                                         │
│        [S1]───[S2]───[S3]           Légende:                           │
│         │      │      │             ─── Hyperlane (connexion)          │
│        [S4]───[S5]───[S6]           [X] Système solaire                │
│              ╲   ╱                  ● Trou noir (boost portée)         │
│               [●]───[S7]                                                │
│                                                                         │
│   Trou Noir: +3 systèmes visibles dans toutes les directions           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Tables de Base

### 1.1 Table `system_connections` (Hyperlanes)

```sql
CREATE TABLE system_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_a_id UUID NOT NULL REFERENCES solar_systems(id),
    system_b_id UUID NOT NULL REFERENCES solar_systems(id),
    connection_type TEXT DEFAULT 'hyperlane' CHECK (connection_type IN (
        'hyperlane',      -- Connexion standard
        'wormhole',       -- Trou de ver (temporaire, rare)
        'jump_gate'       -- Porte de saut (construite par joueur)
    )),
    distance INTEGER NOT NULL DEFAULT 1,  -- En "sauts"
    is_stable BOOLEAN DEFAULT TRUE,       -- Wormholes peuvent être instables
    expires_at TIMESTAMPTZ,               -- Pour wormholes temporaires
    discovered_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contrainte: pas de connexion vers soi-même
ALTER TABLE system_connections ADD CONSTRAINT no_self_connection
    CHECK (system_a_id != system_b_id);

-- Index pour recherche bidirectionnelle
CREATE INDEX idx_connections_a ON system_connections(system_a_id);
CREATE INDEX idx_connections_b ON system_connections(system_b_id);
```

### 1.2 Table `player_discoveries` (Brouillard de guerre personnel)

```sql
CREATE TABLE player_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    solar_system_id UUID NOT NULL REFERENCES solar_systems(id),

    -- Niveau de découverte
    discovery_level TEXT NOT NULL DEFAULT 'detected' CHECK (discovery_level IN (
        'detected',     -- Position connue, aucun détail
        'scanned',      -- Scan basique (type étoile, nb planètes)
        'explored',     -- Exploration complète (toutes les planètes)
        'mapped'        -- Cartographié (peut créer Data Card)
    )),

    -- Métadonnées de découverte
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    discovered_via TEXT CHECK (discovered_via IN (
        'probe',           -- Sonde d'exploration
        'exploration_ship', -- Vaisseau explorateur
        'data_card',       -- Carte achetée/échangée
        'technology',      -- Débloqué par technologie
        'event',           -- Event/drop
        'starting'         -- Système de départ
    )),

    -- Qualité du scan (affecte les infos visibles)
    scan_quality INTEGER DEFAULT 0 CHECK (scan_quality >= 0 AND scan_quality <= 100),

    -- Premier découvreur global
    is_first_discoverer BOOLEAN DEFAULT FALSE,

    -- Timestamps
    last_scanned_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, solar_system_id)
);

CREATE INDEX idx_discoveries_user ON player_discoveries(user_id);
CREATE INDEX idx_discoveries_system ON player_discoveries(solar_system_id);
CREATE INDEX idx_discoveries_level ON player_discoveries(discovery_level);
```

### 1.3 Table `first_discoveries` (Hall of Fame global)

```sql
CREATE TABLE first_discoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solar_system_id UUID NOT NULL UNIQUE REFERENCES solar_systems(id),
    user_id UUID NOT NULL REFERENCES users(id),
    discovered_at TIMESTAMPTZ DEFAULT NOW(),

    -- Bonus accordé au premier découvreur
    discovery_bonus_claimed BOOLEAN DEFAULT FALSE,
    bonus_type TEXT,
    bonus_amount INTEGER
);

CREATE INDEX idx_first_discoveries_user ON first_discoveries(user_id);
```

---

## Phase 2: Économie Cartographique

### 2.1 Table `cartography_items` (Data Cards)

```sql
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

CREATE TABLE cartography_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Propriétaire actuel
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Type et rareté
    card_type card_type NOT NULL,
    rarity card_rarity NOT NULL,

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
    is_consumed BOOLEAN DEFAULT FALSE,  -- Une fois utilisée
    consumed_by UUID REFERENCES users(id),
    consumed_at TIMESTAMPTZ,

    -- Trading
    is_tradeable BOOLEAN DEFAULT TRUE,
    trade_restrictions JSONB  -- { "min_level": 10, "alliance_only": false }
);

CREATE INDEX idx_cards_owner ON cartography_items(owner_id);
CREATE INDEX idx_cards_type ON cartography_items(card_type);
CREATE INDEX idx_cards_rarity ON cartography_items(rarity);
CREATE INDEX idx_cards_tradeable ON cartography_items(is_tradeable) WHERE is_tradeable = TRUE;
```

### 2.2 Table `player_inventory` (Inventaire général)

```sql
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
    quantity INTEGER DEFAULT 1,

    -- Métadonnées
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    acquired_via TEXT,  -- 'purchase', 'craft', 'drop', 'trade', 'event'

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
```

### 2.3 Table `market_listings` (Hôtel des ventes)

```sql
CREATE TABLE market_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vendeur
    seller_id UUID NOT NULL REFERENCES users(id),

    -- Objet en vente
    inventory_item_id UUID NOT NULL REFERENCES player_inventory(id),

    -- Prix
    price_type TEXT NOT NULL CHECK (price_type IN ('fixed', 'auction')),
    price_metal BIGINT DEFAULT 0,
    price_crystal BIGINT DEFAULT 0,
    price_deuterium BIGINT DEFAULT 0,
    price_dark_matter INTEGER DEFAULT 0,

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
    sold_at TIMESTAMPTZ
);

CREATE INDEX idx_listings_seller ON market_listings(seller_id);
CREATE INDEX idx_listings_status ON market_listings(status) WHERE status = 'active';
CREATE INDEX idx_listings_expires ON market_listings(expires_at) WHERE status = 'active';
```

### 2.4 Table `player_vault` (Coffre/Banque)

```sql
CREATE TABLE player_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Capacité du coffre (upgradeable)
    max_slots INTEGER DEFAULT 10,
    used_slots INTEGER DEFAULT 0,

    -- Niveau du coffre
    vault_level INTEGER DEFAULT 1,

    -- Coût d'upgrade
    next_upgrade_cost JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Un coffre par joueur
CREATE UNIQUE INDEX idx_vault_user ON player_vault(user_id);
```

---

## Phase 3: Équipements & Vaisseaux d'Exploration

### 3.1 Nouveaux types de vaisseaux

```sql
-- Ajouter dans la table ships (ou ships_config)
INSERT INTO ships (key, name, category, ...) VALUES
    ('exploration_probe', 'Sonde d''Exploration', 'civil', ...),
    ('scout_ship', 'Vaisseau Éclaireur', 'civil', ...),
    ('explorer', 'Explorateur', 'civil', ...),
    ('cartographer_ship', 'Vaisseau Cartographe', 'civil', ...);
```

### 3.2 Table `ship_modules` (Équipements)

```sql
CREATE TABLE ship_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Définition du module
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Type
    module_type TEXT NOT NULL CHECK (module_type IN (
        'sensor',          -- Augmente portée de détection
        'scanner',         -- Améliore qualité de scan
        'cartographer',    -- Permet de créer des Data Cards
        'probe_launcher',  -- Lance des sondes
        'cloak',           -- Furtivité
        'wormhole_detector' -- Détecte les trous de ver
    )),

    -- Effets
    effects JSONB NOT NULL,
    -- Exemples:
    -- { "sensor_range": +2, "detection_bonus": 0.1 }
    -- { "scan_quality": +20, "scan_speed": 1.5 }
    -- { "can_create_cards": true, "card_quality_bonus": 0.15 }

    -- Coût
    cost_metal INTEGER NOT NULL,
    cost_crystal INTEGER NOT NULL,
    cost_deuterium INTEGER NOT NULL,

    -- Prérequis
    required_research JSONB,  -- { "exploration_tech": 5 }
    required_building JSONB,  -- { "shipyard": 8 }

    -- Rareté
    rarity card_rarity DEFAULT 'common'
);
```

### 3.3 Table `player_equipment` (Équipement possédé)

```sql
CREATE TABLE player_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    module_id UUID NOT NULL REFERENCES ship_modules(id),

    -- Équipé sur quel vaisseau
    equipped_on_fleet_id UUID,  -- NULL = dans l'inventaire

    -- État
    durability INTEGER DEFAULT 100,

    acquired_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Phase 4: Missions d'Exploration

### 4.1 Nouveaux types de missions

```sql
-- Ajouter aux constantes de missions
-- MISSION_TYPES existants + nouveaux:
EXPLORATION_SCAN = 20      -- Scan rapide (détection)
EXPLORATION_DEEP = 21      -- Exploration profonde
EXPLORATION_MAP = 22       -- Cartographie complète
DEPLOY_SATELLITE = 23      -- Déployer satellite de surveillance
```

### 4.2 Table `exploration_missions` (Missions en cours)

```sql
CREATE TABLE exploration_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    fleet_mission_id UUID REFERENCES fleet_missions(id),

    -- Cible
    target_system_id UUID NOT NULL REFERENCES solar_systems(id),

    -- Type de mission
    mission_type TEXT NOT NULL CHECK (mission_type IN (
        'quick_scan',      -- 1h, détection basique
        'deep_scan',       -- 4h, exploration complète
        'cartography',     -- 8h, création de carte possible
        'satellite_deploy' -- Permanent, surveillance continue
    )),

    -- Composition de la flotte
    probe_count INTEGER DEFAULT 0,
    explorer_count INTEGER DEFAULT 0,
    cartographer_equipped BOOLEAN DEFAULT FALSE,

    -- Bonus de recherche
    exploration_tech_level INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    arrives_at TIMESTAMPTZ NOT NULL,
    scan_duration_seconds INTEGER NOT NULL,
    completes_at TIMESTAMPTZ NOT NULL,

    -- Résultats (rempli à la complétion)
    status TEXT DEFAULT 'in_progress' CHECK (status IN (
        'in_progress',
        'completed',
        'failed',
        'intercepted'
    )),
    results JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exploration_user ON exploration_missions(user_id);
CREATE INDEX idx_exploration_status ON exploration_missions(status);
CREATE INDEX idx_exploration_completes ON exploration_missions(completes_at)
    WHERE status = 'in_progress';
```

---

## Phase 5: Technologies d'Exploration

### 5.1 Nouvelles recherches

```sql
-- Ajouter à la table research ou research_config
INSERT INTO research (key, name, category, ...) VALUES
    ('exploration_technology', 'Technologie d''Exploration', 'navigation', ...),
    ('deep_space_sensors', 'Senseurs Spatiaux Profonds', 'navigation', ...),
    ('wormhole_physics', 'Physique des Trous de Ver', 'navigation', ...),
    ('stellar_cartography', 'Cartographie Stellaire', 'navigation', ...);
```

### 5.2 Effets des technologies

```
Technologie d'Exploration (niveaux 1-15):
├── Niveau 1:  Débloque sondes d'exploration
├── Niveau 3:  +1 portée de détection
├── Niveau 5:  Débloque vaisseau éclaireur
├── Niveau 7:  +1 portée de détection, +10% qualité scan
├── Niveau 10: Débloque explorateur, +20% qualité scan
├── Niveau 12: +2 portée de détection
└── Niveau 15: Débloque cartographe, cartes Rare créables

Senseurs Spatiaux Profonds (niveaux 1-10):
├── Niveau 1:  Détecte les anomalies basiques
├── Niveau 3:  Détecte les étoiles spéciales
├── Niveau 5:  Détecte les trous de ver
├── Niveau 7:  Détecte les ruines anciennes
└── Niveau 10: Détecte tout, bonus découverte rare +50%

Physique des Trous de Ver (niveaux 1-10):
├── Niveau 1:  Peut utiliser les trous de ver découverts
├── Niveau 5:  +50% durée de vie des cartes wormhole
└── Niveau 10: Peut stabiliser les trous de ver (permanent)

Cartographie Stellaire (niveaux 1-10):
├── Niveau 1:  Peut créer des Data Cards Common
├── Niveau 3:  Peut créer des Data Cards Uncommon
├── Niveau 5:  Peut créer des Data Cards Rare
├── Niveau 7:  -25% temps de création
├── Niveau 10: Peut créer des Data Cards Epic/Legendary
```

---

## Phase 6: Génération des Connexions

### 6.1 Algorithme de connexion des systèmes

```typescript
// src/lib/galaxy/ConnectionGenerator.ts

interface ConnectionConfig {
  minConnections: 1,
  maxConnections: 6,
  blackHoleBonus: 3,        // Trous noirs voient +3 systèmes
  crossGalaxyChance: 0.05,  // 5% chance connexion inter-galaxie
  wormholeSpawnChance: 0.02 // 2% chance trou de ver
}

function generateSystemConnections(system: SolarSystem, rng: SeededRandom): Connection[] {
  const connections: Connection[] = [];

  // Nombre de connexions basé sur le seed
  let connectionCount = rng.nextInt(config.minConnections, config.maxConnections);

  // Bonus pour trous noirs
  if (system.starType === 'black_hole') {
    connectionCount += config.blackHoleBonus;
  }

  // Trouver les systèmes voisins possibles
  const nearbySystemSeeds = findNearbySystemSeeds(system, connectionCount * 2);

  for (let i = 0; i < connectionCount && i < nearbySystemSeeds.length; i++) {
    connections.push({
      systemAId: system.id,
      systemBId: nearbySystemSeeds[i].id,
      connectionType: rng.next() < config.wormholeSpawnChance ? 'wormhole' : 'hyperlane',
      distance: calculateDistance(system, nearbySystemSeeds[i])
    });
  }

  return connections;
}
```

---

## Phase 7: Interface Utilisateur

### 7.1 Vue Galaxie avec Brouillard

```typescript
// Composant GalaxyMapView

interface SystemDisplay {
  id: string;
  position: { x: number, y: number, z: number };

  // Visibilité pour le joueur actuel
  visibility: 'hidden' | 'detected' | 'scanned' | 'explored' | 'mapped';

  // Infos visibles selon le niveau
  visibleInfo: {
    coordinates?: boolean;      // detected+
    starType?: boolean;         // scanned+
    planetCount?: boolean;      // scanned+
    planetDetails?: boolean;    // explored+
    resources?: boolean;        // explored+
    colonies?: boolean;         // explored+
    canCreateCard?: boolean;    // mapped
  };

  // Connexions
  connections: {
    targetId: string;
    type: 'hyperlane' | 'wormhole';
    visible: boolean;  // Connexion visible seulement si les deux systèmes sont détectés
  }[];
}
```

### 7.2 Interface Data Card

```typescript
// Types pour l'affichage des cartes

interface DataCardDisplay {
  id: string;
  type: CardType;
  rarity: CardRarity;

  // Visuel
  icon: string;
  borderColor: string;  // Par rareté
  glowEffect: boolean;  // Pour legendary

  // Infos
  title: string;        // "Carte du Système Andromeda-42"
  description: string;  // "Contient les données de 1 système avec étoile à neutrons"

  // Contenu
  systemCount: number;
  specialFeatures: string[];

  // Actions possibles
  canUse: boolean;
  canTrade: boolean;
  canSell: boolean;
  estimatedValue: {
    metal: number;
    crystal: number;
    deuterium: number;
  };
}
```

---

## Phase 8: Événements & Drops

### 8.1 Table `exploration_events`

```sql
CREATE TABLE exploration_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Type d'événement
    event_type TEXT NOT NULL CHECK (event_type IN (
        'pirate_cache',      -- Cache pirate avec loot
        'derelict_ship',     -- Épave à fouiller
        'ancient_ruins',     -- Ruines anciennes
        'wormhole_discovery', -- Découverte d'un trou de ver
        'resource_deposit',  -- Gisement de ressources
        'anomaly',           -- Anomalie spatiale
        'ambush',            -- Embuscade pirate
        'trader_encounter',  -- Rencontre avec marchand
        'artifact_find'      -- Découverte d'artefact
    )),

    -- Localisation
    solar_system_id UUID REFERENCES solar_systems(id),
    celestial_body_id UUID REFERENCES celestial_bodies(id),

    -- Probabilité et conditions
    spawn_chance FLOAT NOT NULL,
    required_scan_quality INTEGER DEFAULT 0,
    required_tech_level INTEGER DEFAULT 0,

    -- Récompenses possibles
    reward_table JSONB NOT NULL,
    -- {
    --   "data_cards": [{ "rarity": "rare", "chance": 0.1 }],
    --   "resources": { "metal": [1000, 5000], "crystal": [500, 2000] },
    --   "items": [{ "type": "cartographer", "chance": 0.05 }]
    -- }

    -- État
    discovered_by UUID REFERENCES users(id),
    discovered_at TIMESTAMPTZ,
    claimed BOOLEAN DEFAULT FALSE,

    -- Timing
    spawned_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```

### 8.2 Loot Table pour Pirates

```sql
-- Table de drop pour les pirates
INSERT INTO exploration_events (event_type, spawn_chance, reward_table) VALUES
('pirate_cache', 0.15, '{
  "data_cards": [
    { "type": "system_map", "rarity": "common", "chance": 0.30 },
    { "type": "system_map", "rarity": "uncommon", "chance": 0.15 },
    { "type": "resource_map", "rarity": "common", "chance": 0.10 },
    { "type": "route_map", "rarity": "rare", "chance": 0.05 }
  ],
  "resources": {
    "metal": [2000, 10000],
    "crystal": [1000, 5000],
    "deuterium": [500, 2000]
  },
  "dark_matter": { "min": 0, "max": 50, "chance": 0.1 }
}');
```

---

## Fichiers à Créer

### Backend (TypeScript)

```
src/lib/exploration/
├── index.ts                    # Exports
├── types.ts                    # Types TypeScript
├── constants.ts                # Constantes (portées, coûts, etc.)
├── ExplorationService.ts       # Service principal
├── CartographyService.ts       # Gestion des Data Cards
├── ConnectionGenerator.ts      # Génération des hyperlanes
├── DiscoveryManager.ts         # Gestion des découvertes
├── MarketService.ts            # Hôtel des ventes
├── VaultService.ts             # Coffre/banque
└── events/
    ├── EventGenerator.ts       # Génération des événements
    └── EventProcessor.ts       # Traitement des événements

src/lib/missions/handlers/
├── ExplorationMission.ts       # Handler mission exploration
└── SatelliteDeployMission.ts   # Handler déploiement satellite
```

### Frontend (React)

```
src/components/game/exploration/
├── GalaxyMapView.tsx           # Vue galaxie avec fog of war
├── SystemInfoPanel.tsx         # Panel d'infos système (selon visibilité)
├── ExplorationMissionForm.tsx  # Formulaire envoi mission
├── DiscoveryLog.tsx            # Historique des découvertes
└── ConnectionLines.tsx         # Lignes d'hyperlanes 3D

src/components/game/cartography/
├── DataCardDisplay.tsx         # Affichage d'une carte
├── DataCardInventory.tsx       # Liste des cartes possédées
├── CardCreationModal.tsx       # Modal création de carte
└── CardTradeModal.tsx          # Modal échange de carte

src/components/game/market/
├── MarketBrowser.tsx           # Navigation du marché
├── ListingCard.tsx             # Carte d'annonce
├── SellItemModal.tsx           # Modal mise en vente
├── BuyConfirmModal.tsx         # Confirmation d'achat
└── AuctionPanel.tsx            # Panel enchères

src/components/game/vault/
├── VaultView.tsx               # Vue du coffre
├── VaultSlot.tsx               # Slot individuel
└── VaultUpgradeModal.tsx       # Upgrade du coffre
```

### API Endpoints

```
src/app/api/v1/
├── exploration/
│   ├── route.ts                # GET découvertes, POST mission
│   ├── [systemId]/route.ts     # GET/POST découverte système
│   └── missions/route.ts       # GET missions en cours
├── cartography/
│   ├── route.ts                # GET cartes, POST créer carte
│   ├── [cardId]/route.ts       # GET/DELETE carte
│   └── use/route.ts            # POST utiliser carte
├── market/
│   ├── route.ts                # GET listings
│   ├── listings/route.ts       # POST créer annonce
│   ├── [listingId]/route.ts    # GET/DELETE annonce
│   ├── [listingId]/buy/route.ts # POST acheter
│   └── [listingId]/bid/route.ts # POST enchérir
├── vault/
│   ├── route.ts                # GET coffre
│   ├── deposit/route.ts        # POST déposer
│   ├── withdraw/route.ts       # POST retirer
│   └── upgrade/route.ts        # POST upgrader
└── inventory/
    └── route.ts                # GET inventaire
```

### Migrations SQL

```
supabase/migrations/
├── 003_exploration_system.sql         # Tables découvertes, connexions
├── 004_cartography_items.sql          # Data Cards, inventaire
├── 005_market_system.sql              # Marché, enchères
├── 006_vault_system.sql               # Coffre/banque
├── 007_exploration_missions.sql       # Missions d'exploration
├── 008_exploration_technologies.sql   # Nouvelles recherches
└── 009_exploration_events.sql         # Événements et drops
```

---

## Coûts & Économie

### Création de Data Cards

| Rareté | Métal | Cristal | Deutérium | Matière Noire | Temps |
|--------|-------|---------|-----------|---------------|-------|
| Common | 1,000 | 500 | 200 | 0 | 30 min |
| Uncommon | 5,000 | 2,500 | 1,000 | 0 | 2h |
| Rare | 20,000 | 10,000 | 5,000 | 10 | 8h |
| Epic | 100,000 | 50,000 | 25,000 | 50 | 24h |
| Legendary | 500,000 | 250,000 | 100,000 | 200 | 72h |

### Valeur estimée des cartes (vente au marché)

| Rareté | Valeur Min | Valeur Max |
|--------|------------|------------|
| Common | 500 | 2,000 |
| Uncommon | 2,000 | 10,000 |
| Rare | 10,000 | 50,000 |
| Epic | 50,000 | 250,000 |
| Legendary | 250,000 | 2,000,000 |

### Coût des sondes/vaisseaux

| Unité | Métal | Cristal | Deutérium | Portée | Qualité Scan |
|-------|-------|---------|-----------|--------|--------------|
| Sonde d'Exploration | 500 | 500 | 200 | 1 | 20% |
| Vaisseau Éclaireur | 5,000 | 3,000 | 1,500 | 2 | 50% |
| Explorateur | 20,000 | 15,000 | 8,000 | 3 | 80% |
| Cartographe | 50,000 | 40,000 | 20,000 | 4 | 100% |

---

## Ordre d'Implémentation

### Sprint 1: Base du Fog of War (1-2 semaines)
1. ✅ Migration `003_exploration_system.sql`
2. ✅ Génération des connexions entre systèmes
3. ✅ Table `player_discoveries`
4. ✅ API découverte basique
5. ✅ Modification de la vue galaxie (cacher systèmes non découverts)

### Sprint 2: Missions d'Exploration (1 semaine)
1. Nouveaux types de missions
2. Handler `ExplorationMission`
3. Formulaire d'envoi de mission
4. Traitement des résultats

### Sprint 3: Cartographie (1-2 semaines)
1. Migration `004_cartography_items.sql`
2. `CartographyService`
3. Création de Data Cards
4. Utilisation de Data Cards
5. Interface inventaire

### Sprint 4: Marché (1 semaine)
1. Migration `005_market_system.sql`
2. `MarketService`
3. Interface marché
4. Système d'enchères

### Sprint 5: Coffre & Polish (1 semaine)
1. Migration `006_vault_system.sql`
2. Interface coffre
3. Événements et drops
4. Tests & équilibrage

---

## Questions à Valider

1. **Persistance des connexions**: Les connexions sont-elles générées une fois et stockées, ou calculées à la volée?
   → Recommandation: Générées et stockées lors de la première visite de la galaxie

2. **Visibilité des colonies**: Peut-on voir les colonies d'autres joueurs sur un système exploré?
   → Recommandation: Oui, après exploration complète

3. **Expiration des cartes**: Les Data Cards ont-elles une durée de vie?
   → Recommandation: Non, sauf cartes Wormhole (wormholes temporaires)

4. **Premier découvreur**: Quel bonus pour le premier découvreur d'un système?
   → Recommandation: +50% ressources sur première exploration + badge permanent

5. **Multi-compte prevention**: Comment éviter l'abus avec plusieurs comptes?
   → Recommandation: Limite de découvertes/jour, cooldown sur ventes

Ce plan est-il approuvé pour commencer l'implémentation?
