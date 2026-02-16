# 🎮 Best Practices Architecture Jeux Web 2024-2026

> **Archive de référence** - Compilé le 2026-02-16
> **Sources**: 40+ articles, documentation officielle, benchmarks

---

## 📊 Table des Matières

1. [Architecture Supabase/PostgreSQL](#1-architecture-supabasepostgresql)
2. [Optimisation Base de Données Multijoueur](#2-optimisation-base-de-données-multijoueur)
3. [Synchronisation Hiérarchique](#3-synchronisation-hiérarchique)
4. [Gestion d'État React/Next.js](#4-gestion-détat-reactnextjs)
5. [Event Sourcing PostgreSQL](#5-event-sourcing-postgresql)
6. [Batch Updates](#6-batch-updates)
7. [Real-time Subscriptions](#7-real-time-subscriptions)
8. [Game State Synchronization](#8-game-state-synchronization)
9. [Patterns Spécifiques OGameX](#9-patterns-spécifiques-ogamex)
10. [Checklist Implémentation](#10-checklist-implémentation)

---

## 1. Architecture Supabase/PostgreSQL

### Structure de Tables Recommandée pour Jeux

```sql
-- 1. PROFILES (Extension de auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLAYER_STATS (Progression séparée)
CREATE TABLE player_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  xp BIGINT DEFAULT 0,
  gold BIGINT DEFAULT 0,
  rank_score INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVENTORY (Objets avec JSONB pour metadata)
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}', -- durabilité, enchantements, etc.
  acquired_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_inventory_user ON inventory(user_id);
CREATE INDEX idx_inventory_item ON inventory(item_id);
CREATE INDEX idx_inventory_metadata ON inventory USING GIN(metadata);
```

### 30 Règles d'Optimisation PostgreSQL

1. **Utiliser les bons types** - `UUID` pour IDs, `TIMESTAMPTZ` pour dates, `JSONB` pour données flexibles
2. **Index stratégiques** - GIN pour JSONB, B-tree pour lookups, partial indexes pour filtres fréquents
3. **Connection Pooling** - Port 6543 (transaction mode), 80% allocation
4. **RLS avec cache** - `(SELECT auth.uid())` au lieu de `auth.uid()` direct
5. **Prepared Statements** - Réutiliser les queries fréquentes
6. **EXPLAIN ANALYZE** - Auditer les queries lentes
7. **Vacuum régulier** - Maintenance automatique
8. **Partitioning** - Pour tables > 100M rows

### RLS Optimisé

```sql
-- MAUVAIS: auth.uid() appelé à chaque row
CREATE POLICY "Users see own data" ON inventory
  USING (user_id = auth.uid());

-- BON: Subquery cached une seule fois
CREATE POLICY "Users see own data" ON inventory
  USING (user_id = (SELECT auth.uid()));

-- MEILLEUR: SECURITY DEFINER function
CREATE FUNCTION get_current_user_id() RETURNS UUID AS $$
  SELECT auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE POLICY "Users see own data" ON inventory
  USING (user_id = get_current_user_id());
```

### Fonctions RPC pour Actions Sensibles

```sql
-- Empêche la triche: seul le serveur peut modifier l'or
CREATE FUNCTION add_gold(p_amount INTEGER)
RETURNS void AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  UPDATE player_stats
  SET gold = gold + p_amount,
      updated_at = NOW()
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 2. Optimisation Base de Données Multijoueur

### Connection Pooling

```
Formule: pool_size = peak_concurrent_users × 0.1 + buffer(20)

Exemple OGameX:
- 1000 joueurs simultanés
- pool_size = 100 + 20 = 120 connections
```

### Patterns Anti-N+1

```typescript
// ❌ MAUVAIS: N+1 queries
for (const planet of planets) {
  const buildings = await supabase
    .from('buildings')
    .select('*')
    .eq('planet_id', planet.id)
}

// ✅ BON: Batch query
const planetIds = planets.map(p => p.id)
const { data: allBuildings } = await supabase
  .from('buildings')
  .select('*')
  .in('planet_id', planetIds)

// Grouper côté client
const buildingsByPlanet = allBuildings.reduce((acc, b) => {
  acc[b.planet_id] = acc[b.planet_id] || []
  acc[b.planet_id].push(b)
  return acc
}, {})
```

### Indexes Recommandés pour OGameX

```sql
-- Player discoveries (très utilisé)
CREATE INDEX CONCURRENTLY idx_player_discoveries_user_system
ON player_discoveries(user_id, solar_system_id);

-- Fleet missions actives
CREATE INDEX CONCURRENTLY idx_fleet_missions_active
ON fleet_missions(user_id, arrival_time)
WHERE processed = false;

-- Market listings
CREATE INDEX CONCURRENTLY idx_market_active
ON market_listings(status, item_type, price)
WHERE status = 'active';

-- Building queue
CREATE INDEX CONCURRENTLY idx_building_queue_completion
ON building_queue(completion_time)
WHERE completed = false;
```

---

## 3. Synchronisation Hiérarchique

### Pattern Bâtiment → Planète → Système → Galaxie → DB

```
┌─────────────┐
│  Bâtiment   │ ── Modifie localement
└──────┬──────┘
       │ Agrège
┌──────▼──────┐
│   Planète   │ ── Calcule totaux (production, défense)
└──────┬──────┘
       │ Notifie
┌──────▼──────┐
│   Système   │ ── Update stats système
└──────┬──────┘
       │ Batch (5 min)
┌──────▼──────┐
│   Galaxie   │ ── Agrège pour classement
└──────┬──────┘
       │ Write (1x)
┌──────▼──────┐
│  Database   │
└─────────────┘
```

### Implémentation avec Zustand

```typescript
// stores/planetStore.ts
interface PlanetState {
  buildings: Record<string, BuildingLevel>
  pendingUpdates: BuildingUpdate[]

  updateBuilding: (id: string, level: number) => void
  flushToServer: () => Promise<void>
}

export const usePlanetStore = create<PlanetState>((set, get) => ({
  buildings: {},
  pendingUpdates: [],

  updateBuilding: (id, level) => {
    set(state => ({
      buildings: { ...state.buildings, [id]: level },
      pendingUpdates: [...state.pendingUpdates, { id, level, timestamp: Date.now() }]
    }))
  },

  flushToServer: async () => {
    const updates = get().pendingUpdates
    if (updates.length === 0) return

    // Batch RPC call
    await supabase.rpc('batch_update_buildings', {
      updates: JSON.stringify(updates)
    })

    set({ pendingUpdates: [] })
  }
}))

// Auto-flush toutes les 30 secondes
setInterval(() => {
  usePlanetStore.getState().flushToServer()
}, 30000)
```

### RPC Batch Update

```sql
CREATE FUNCTION batch_update_buildings(updates JSONB)
RETURNS void AS $$
DECLARE
  update_item RECORD;
BEGIN
  FOR update_item IN SELECT * FROM jsonb_to_recordset(updates)
    AS x(id UUID, level INTEGER, timestamp BIGINT)
  LOOP
    UPDATE buildings
    SET level = update_item.level,
        updated_at = to_timestamp(update_item.timestamp / 1000)
    WHERE id = update_item.id
      AND planet_id IN (
        SELECT id FROM planets WHERE user_id = auth.uid()
      );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Materialized Views pour Stats Agrégées

```sql
-- Stats de production par galaxie (refresh toutes les 5 min)
CREATE MATERIALIZED VIEW mv_galaxy_production AS
SELECT
  g.id AS galaxy_id,
  g.name,
  COUNT(DISTINCT p.user_id) AS active_players,
  SUM(ps.metal_production) AS total_metal,
  SUM(ps.crystal_production) AS total_crystal,
  SUM(ps.deuterium_production) AS total_deuterium
FROM galaxies g
JOIN solar_systems ss ON ss.galaxy_id = g.id
JOIN planets p ON p.solar_system_id = ss.id
JOIN planet_stats ps ON ps.planet_id = p.id
GROUP BY g.id, g.name;

CREATE UNIQUE INDEX ON mv_galaxy_production(galaxy_id);

-- Refresh automatique avec pg_cron
SELECT cron.schedule('refresh-galaxy-stats', '*/5 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_galaxy_production'
);
```

---

## 4. Gestion d'État React/Next.js

### Migration Redux → Zustand + React Query (2025-2026)

| Aspect | Redux | Zustand + React Query |
|--------|-------|----------------------|
| Boilerplate | Élevé | Minimal |
| Bundle size | ~10KB | ~3KB |
| Learning curve | Steep | Gentle |
| Server state | Manual | Built-in |
| DevTools | Excellent | Good |

### Catégorisation de l'État

```
État d'une app de jeu:

1. LOCAL STATE (30%)
   - UI state (modals, dropdowns)
   - Form inputs
   - Animations
   → useState, useReducer

2. SHARED STATE (20%)
   - Current planet selection
   - User preferences
   - Game settings
   → Zustand

3. SERVER STATE (40%)
   - Player data
   - Buildings, ships, research
   - Fleet missions
   → React Query / SWR

4. URL STATE (10%)
   - Current page
   - Filters, sorting
   - Galaxy/system/planet coordinates
   → URL params, Next.js router
```

### Pattern Zustand Optimisé

```typescript
// stores/gameStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface GameState {
  // État
  currentPlanetId: string | null
  resources: Resources
  buildingQueue: BuildingQueueItem[]

  // Actions
  selectPlanet: (id: string) => void
  addToQueue: (item: BuildingQueueItem) => void
  updateResources: (delta: Partial<Resources>) => void
}

export const useGameStore = create<GameState>()(
  subscribeWithSelector((set, get) => ({
    currentPlanetId: null,
    resources: { metal: 0, crystal: 0, deuterium: 0 },
    buildingQueue: [],

    selectPlanet: (id) => set({ currentPlanetId: id }),

    addToQueue: (item) => set(state => ({
      buildingQueue: [...state.buildingQueue, item]
    })),

    updateResources: (delta) => set(state => ({
      resources: {
        ...state.resources,
        ...Object.fromEntries(
          Object.entries(delta).map(([k, v]) => [k, state.resources[k] + v])
        )
      }
    }))
  }))
)

// Selectors granulaires (évite re-renders)
export const useCurrentPlanet = () => useGameStore(s => s.currentPlanetId)
export const useMetal = () => useGameStore(s => s.resources.metal)
export const useQueueLength = () => useGameStore(s => s.buildingQueue.length)
```

### React Query pour Server State

```typescript
// hooks/usePlayerData.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function usePlayerPlanets(userId: string) {
  return useQuery({
    queryKey: ['planets', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('planets')
        .select(`
          *,
          buildings(*),
          ships(*),
          defenses(*)
        `)
        .eq('user_id', userId)
      return data
    },
    staleTime: 30 * 1000, // 30 secondes
    refetchInterval: 60 * 1000, // Refresh toutes les minutes
  })
}

export function useBuildBuilding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ planetId, buildingType }: BuildParams) => {
      return supabase.rpc('start_building', {
        p_planet_id: planetId,
        p_building_type: buildingType
      })
    },
    onSuccess: (_, variables) => {
      // Invalider le cache pour ce planet
      queryClient.invalidateQueries({
        queryKey: ['planets', variables.planetId]
      })
    },
    // Optimistic update
    onMutate: async ({ planetId, buildingType }) => {
      await queryClient.cancelQueries({ queryKey: ['planets'] })

      const previous = queryClient.getQueryData(['planets'])

      queryClient.setQueryData(['planets'], (old: Planet[]) =>
        old.map(p => p.id === planetId
          ? { ...p, buildingQueue: [...p.buildingQueue, { type: buildingType, status: 'pending' }] }
          : p
        )
      )

      return { previous }
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(['planets'], context?.previous)
    }
  })
}
```

---

## 5. Event Sourcing PostgreSQL

### Schema

```sql
-- Table d'événements
CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  aggregate_type TEXT NOT NULL, -- 'planet', 'fleet', 'battle'
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(aggregate_type, aggregate_id, version)
);

-- Index pour replay rapide
CREATE INDEX idx_events_aggregate ON game_events(aggregate_type, aggregate_id, version);
CREATE INDEX idx_events_type ON game_events(event_type);
CREATE INDEX idx_events_created ON game_events(created_at);

-- Snapshots (tous les 50 events)
CREATE TABLE game_snapshots (
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY(aggregate_type, aggregate_id)
);
```

### Exemples d'Événements OGameX

```typescript
// Types d'événements
type GameEvent =
  | { type: 'BuildingStarted'; data: { buildingType: string; level: number; completesAt: string } }
  | { type: 'BuildingCompleted'; data: { buildingType: string; level: number } }
  | { type: 'ResourcesProduced'; data: { metal: number; crystal: number; deuterium: number } }
  | { type: 'FleetDispatched'; data: { ships: ShipCounts; target: Coordinates; mission: MissionType } }
  | { type: 'BattleOccurred'; data: { attackerId: string; defenderId: string; result: BattleResult } }
  | { type: 'ResearchCompleted'; data: { techType: string; level: number } }
```

### Fonction d'Append

```sql
CREATE FUNCTION append_event(
  p_aggregate_type TEXT,
  p_aggregate_id UUID,
  p_event_type TEXT,
  p_event_data JSONB,
  p_expected_version INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_current_version INTEGER;
  v_new_version INTEGER;
BEGIN
  -- Optimistic locking
  SELECT COALESCE(MAX(version), 0) INTO v_current_version
  FROM game_events
  WHERE aggregate_type = p_aggregate_type
    AND aggregate_id = p_aggregate_id;

  IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Concurrency conflict: expected %, got %', p_expected_version, v_current_version;
  END IF;

  v_new_version := v_current_version + 1;

  INSERT INTO game_events (aggregate_type, aggregate_id, event_type, event_data, version, created_by)
  VALUES (p_aggregate_type, p_aggregate_id, p_event_type, p_event_data, v_new_version, auth.uid());

  -- Créer snapshot tous les 50 events
  IF v_new_version % 50 = 0 THEN
    PERFORM create_snapshot(p_aggregate_type, p_aggregate_id);
  END IF;

  -- Notifier les listeners
  PERFORM pg_notify('game_events', json_build_object(
    'aggregate_type', p_aggregate_type,
    'aggregate_id', p_aggregate_id,
    'event_type', p_event_type,
    'version', v_new_version
  )::text);

  RETURN v_new_version;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Batch Updates

### Three-Layer Pattern

```
Layer 1: Collection (30 min buffer)
├── Accumulate all building completions
├── Accumulate all production ticks
└── Store in memory/Redis

Layer 2: Distribution (5 min batches)
├── Group by player
├── Calculate deltas
└── Prepare batch payloads

Layer 3: Processing (1 min execution)
├── Single transaction per player
├── Update all affected tables
└── Emit events
```

### Edge Function pour Processing

```typescript
// supabase/functions/process-batch/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Récupérer les jobs pending
  const { data: jobs } = await supabase
    .from('batch_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at')
    .limit(100)

  for (const job of jobs ?? []) {
    try {
      // Marquer comme processing
      await supabase
        .from('batch_jobs')
        .update({ status: 'processing', started_at: new Date().toISOString() })
        .eq('id', job.id)

      // Traiter selon le type
      switch (job.job_type) {
        case 'building_completion':
          await processBuildingCompletion(supabase, job.payload)
          break
        case 'resource_production':
          await processResourceProduction(supabase, job.payload)
          break
        case 'fleet_arrival':
          await processFleetArrival(supabase, job.payload)
          break
      }

      // Marquer comme completed
      await supabase
        .from('batch_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', job.id)

    } catch (error) {
      // Marquer comme failed
      await supabase
        .from('batch_jobs')
        .update({
          status: 'failed',
          error: error.message,
          retry_count: job.retry_count + 1
        })
        .eq('id', job.id)
    }
  }

  return new Response(JSON.stringify({ processed: jobs?.length ?? 0 }))
})
```

### pg_cron pour Scheduling

```sql
-- Déclencher le batch processing toutes les minutes
SELECT cron.schedule(
  'process-batch-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-batch',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    )
  )
  $$
);

-- Nettoyer les vieux jobs toutes les heures
SELECT cron.schedule(
  'cleanup-old-jobs',
  '0 * * * *',
  $$
  DELETE FROM batch_jobs
  WHERE status = 'completed'
    AND completed_at < NOW() - INTERVAL '24 hours'
  $$
);
```

---

## 7. Real-time Subscriptions

### Broadcast vs Postgres Changes

| Feature | Broadcast | Postgres Changes |
|---------|-----------|------------------|
| Latency | ~100ms | ~300ms |
| Scale | 10K+ clients | ~1K clients |
| Data source | Any | Database only |
| Filtering | Client-side | Server-side (RLS) |
| Use case | Chat, presence | Data sync |

### Pattern Recommandé pour Jeu

```typescript
// Utiliser Broadcast pour les updates fréquents
const channel = supabase.channel('game-updates')

// S'abonner aux broadcasts
channel
  .on('broadcast', { event: 'fleet-movement' }, (payload) => {
    updateFleetPosition(payload.fleetId, payload.position)
  })
  .on('broadcast', { event: 'battle-result' }, (payload) => {
    showBattleNotification(payload)
  })
  .on('broadcast', { event: 'resource-update' }, (payload) => {
    if (payload.playerId === currentUserId) {
      updateResources(payload.resources)
    }
  })
  .subscribe()

// Envoyer des updates (côté serveur/Edge Function)
await supabase.channel('game-updates').send({
  type: 'broadcast',
  event: 'fleet-movement',
  payload: {
    fleetId: fleet.id,
    position: calculateCurrentPosition(fleet),
    eta: fleet.arrival_time
  }
})
```

### Présence pour Lobby

```typescript
// Système de présence pour lobby
const lobbyChannel = supabase.channel('lobby', {
  config: {
    presence: {
      key: currentUserId,
    },
  },
})

lobbyChannel
  .on('presence', { event: 'sync' }, () => {
    const state = lobbyChannel.presenceState()
    updateOnlinePlayers(Object.keys(state))
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    showPlayerJoined(key)
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    showPlayerLeft(key)
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await lobbyChannel.track({
        username: currentUser.username,
        status: 'online',
        currentPlanet: currentPlanetId
      })
    }
  })
```

---

## 8. Game State Synchronization

### Delta Compression

```typescript
// Envoyer seulement les différences
interface StateDelta {
  resources?: Partial<Resources>
  buildings?: Record<string, number> // buildingId -> new level
  ships?: Record<string, number>     // shipType -> count change
  timestamp: number
}

function calculateDelta(oldState: GameState, newState: GameState): StateDelta {
  const delta: StateDelta = { timestamp: Date.now() }

  // Resources: seulement si changé
  for (const key of ['metal', 'crystal', 'deuterium'] as const) {
    if (oldState.resources[key] !== newState.resources[key]) {
      delta.resources = delta.resources || {}
      delta.resources[key] = newState.resources[key]
    }
  }

  // Buildings: seulement les changements
  for (const [id, level] of Object.entries(newState.buildings)) {
    if (oldState.buildings[id] !== level) {
      delta.buildings = delta.buildings || {}
      delta.buildings[id] = level
    }
  }

  return delta
}

// Compression: 15% de la taille originale en moyenne
```

### Quantization pour Positions

```typescript
// Précision réduite pour les coordonnées (économise bandwidth)
const PRECISION = 4096 // 12 bits

function quantize(value: number, min: number, max: number): number {
  const normalized = (value - min) / (max - min)
  return Math.round(normalized * PRECISION)
}

function dequantize(quantized: number, min: number, max: number): number {
  return min + (quantized / PRECISION) * (max - min)
}

// Position de flotte
interface QuantizedPosition {
  x: number // 0-4096
  y: number // 0-4096
  z: number // 0-4096
}

// 12 bits × 3 = 36 bits = 5 bytes au lieu de 24 bytes (3 × 8 floats)
```

### Interpolation et Lag Compensation

```typescript
// Buffer de positions pour interpolation fluide
class PositionBuffer {
  private buffer: Array<{ position: Position; timestamp: number }> = []
  private readonly BUFFER_SIZE = 5
  private readonly INTERPOLATION_DELAY = 100 // ms

  add(position: Position, timestamp: number) {
    this.buffer.push({ position, timestamp })
    if (this.buffer.length > this.BUFFER_SIZE) {
      this.buffer.shift()
    }
  }

  getInterpolated(renderTime: number): Position {
    const targetTime = renderTime - this.INTERPOLATION_DELAY

    // Trouver les deux états encadrants
    let before = this.buffer[0]
    let after = this.buffer[1]

    for (let i = 1; i < this.buffer.length; i++) {
      if (this.buffer[i].timestamp > targetTime) {
        before = this.buffer[i - 1]
        after = this.buffer[i]
        break
      }
    }

    // Interpolation linéaire
    const t = (targetTime - before.timestamp) / (after.timestamp - before.timestamp)
    return {
      x: before.position.x + (after.position.x - before.position.x) * t,
      y: before.position.y + (after.position.y - before.position.y) * t,
      z: before.position.z + (after.position.z - before.position.z) * t,
    }
  }
}
```

---

## 9. Patterns Spécifiques OGameX

### Production Loop (Côté Serveur)

```sql
-- Fonction appelée toutes les minutes par pg_cron
CREATE FUNCTION tick_production() RETURNS void AS $$
DECLARE
  planet RECORD;
  production_rate RECORD;
  energy_ratio FLOAT;
BEGIN
  FOR planet IN
    SELECT p.*, ps.metal_mine_level, ps.crystal_mine_level,
           ps.deuterium_synth_level, ps.solar_plant_level
    FROM planets p
    JOIN planet_stats ps ON ps.planet_id = p.id
    WHERE p.last_update < NOW() - INTERVAL '1 minute'
  LOOP
    -- Calculer le ratio énergie
    energy_ratio := calculate_energy_ratio(planet);

    -- Appliquer la production (1 minute de ressources)
    UPDATE planets SET
      metal = LEAST(metal + calculate_metal_production(planet.metal_mine_level, energy_ratio) / 60, metal_storage),
      crystal = LEAST(crystal + calculate_crystal_production(planet.crystal_mine_level, energy_ratio) / 60, crystal_storage),
      deuterium = LEAST(deuterium + calculate_deuterium_production(planet.deuterium_synth_level, planet.temperature, energy_ratio) / 60, deuterium_storage),
      last_update = NOW()
    WHERE id = planet.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Scheduler
SELECT cron.schedule('production-tick', '* * * * *', 'SELECT tick_production()');
```

### Building Queue Processing

```typescript
// Vérifier les bâtiments terminés (côté serveur)
async function processBuildingQueue() {
  const { data: completedBuildings } = await supabase
    .from('building_queue')
    .select('*, planets(*)')
    .lte('completion_time', new Date().toISOString())
    .eq('status', 'in_progress')

  for (const item of completedBuildings ?? []) {
    await supabase.rpc('complete_building', {
      p_queue_id: item.id,
      p_planet_id: item.planet_id,
      p_building_type: item.building_type,
      p_new_level: item.target_level
    })
  }
}
```

### Fleet Movement Calculation

```typescript
// Calcul côté client pour affichage en temps réel
function calculateFleetPosition(fleet: FleetMission, currentTime: Date): Position {
  const progress = (currentTime.getTime() - fleet.departure_time.getTime())
                 / (fleet.arrival_time.getTime() - fleet.departure_time.getTime())

  const clampedProgress = Math.max(0, Math.min(1, progress))

  return {
    x: fleet.origin.x + (fleet.target.x - fleet.origin.x) * clampedProgress,
    y: fleet.origin.y + (fleet.target.y - fleet.origin.y) * clampedProgress,
    galaxy: clampedProgress < 0.5 ? fleet.origin.galaxy : fleet.target.galaxy
  }
}

// Mise à jour toutes les secondes pour animation fluide
useEffect(() => {
  const interval = setInterval(() => {
    setFleetPositions(fleets.map(f => ({
      id: f.id,
      position: calculateFleetPosition(f, new Date())
    })))
  }, 1000)

  return () => clearInterval(interval)
}, [fleets])
```

---

## 10. Checklist Implémentation

### Phase 1: Foundation
- [ ] Structure de tables optimisée (profiles, player_stats, inventory)
- [ ] RLS avec fonctions SECURITY DEFINER
- [ ] Indexes stratégiques
- [ ] Connection pooling configuré

### Phase 2: State Management
- [ ] Zustand store avec selectors granulaires
- [ ] React Query pour server state
- [ ] Optimistic updates implémentés
- [ ] Cache invalidation stratégique

### Phase 3: Real-time
- [ ] Broadcast channels configurés
- [ ] Présence pour lobby
- [ ] Delta compression
- [ ] Interpolation pour mouvements fluides

### Phase 4: Batch Processing
- [ ] pg_cron configuré
- [ ] Edge Functions pour jobs lourds
- [ ] Three-layer pattern implémenté
- [ ] Error handling et retry logic

### Phase 5: Event Sourcing (Optionnel)
- [ ] Tables events et snapshots
- [ ] Fonction append_event
- [ ] Replay capability
- [ ] Audit trail complet

### Phase 6: Performance
- [ ] Materialized views pour stats
- [ ] Query optimization (EXPLAIN ANALYZE)
- [ ] Monitoring et alerting
- [ ] Load testing

### Phase 7: Production
- [ ] Backup automatique
- [ ] Point-in-time recovery
- [ ] Multi-region (si nécessaire)
- [ ] Rate limiting

### Phase 8: Observabilité
- [ ] Logging structuré
- [ ] Metrics (latence, throughput)
- [ ] Distributed tracing
- [ ] Error tracking (Sentry)

---

## Sources

1. [Supabase Architecture Documentation](https://supabase.com/docs/guides/getting-started/architecture)
2. [Supavisor: Scaling to 1 Million Connections](https://supabase.com/blog/supavisor-1-million)
3. [Optimizing Postgres RLS Performance](https://scottpierce.dev/posts/optimizing-postgres-rls/)
4. [State Synchronization - Gaffer on Games](https://gafferongames.com/post/state_synchronization/)
5. [PostgreSQL Event Sourcing](https://github.com/eugene-khyst/postgresql-event-sourcing)
6. [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025)
7. [Processing Large Jobs with Edge Functions](https://supabase.com/blog/processing-large-jobs-with-edge-functions)
8. [Supabase Realtime with Multiplayer Features](https://supabase.com/blog/supabase-realtime-with-multiplayer-features)

---

*Document créé le 2026-02-16 pour le projet OGameX-Next*
