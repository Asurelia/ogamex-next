# OGameX Architecture

Modern remake of OGame using Next.js 16, Supabase, and TypeScript.

## Technology Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: Zustand
- **Language**: TypeScript 5.7

## Directory Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── (auth)/              # Auth group (login/register)
│   │   ├── layout.tsx       # Auth layout
│   │   ├── login/page.tsx   # Login page
│   │   └── register/page.tsx
│   ├── api/v1/              # REST API endpoints
│   │   ├── auth/route.ts    # Token authentication
│   │   ├── fleet/route.ts   # Fleet operations
│   │   ├── galaxy/route.ts  # Galaxy view
│   │   ├── planets/         # Planet management
│   │   │   ├── route.ts
│   │   │   └── [planetId]/
│   │   │       ├── route.ts
│   │   │       └── build/route.ts
│   │   └── player/route.ts  # Player info
│   ├── api-docs/page.tsx    # API documentation
│   ├── game/                # Game pages (protected)
│   │   ├── layout.tsx       # Game layout with auth check
│   │   ├── page.tsx         # Redirect to overview
│   │   ├── overview/
│   │   ├── resources/
│   │   ├── facilities/
│   │   ├── research/
│   │   ├── shipyard/
│   │   ├── defense/
│   │   ├── fleet/
│   │   ├── galaxy/
│   │   ├── alliance/
│   │   ├── messages/
│   │   └── highscore/
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing page
├── components/game/         # Game UI components
│   ├── BuildingCard.tsx     # Building upgrade card
│   ├── GameProvider.tsx     # Client-side state provider
│   ├── Header.tsx           # Top navigation
│   ├── ResourceBar.tsx      # Resource display
│   └── Sidebar.tsx          # Navigation sidebar
├── game/                    # Game logic
│   ├── constants.ts         # Buildings, ships, research definitions
│   └── formulas.ts          # Cost, time, production calculations
├── lib/                     # Utilities
│   ├── api/auth.ts          # API token validation
│   ├── missions/            # Mission resolution system
│   │   ├── types.ts         # Mission type definitions
│   │   ├── MissionProcessor.ts    # Main processor
│   │   ├── AttackMission.ts       # Attack mission handler
│   │   ├── EspionageMission.ts    # Espionage mission handler
│   │   ├── TransportMission.ts    # Transport mission handler
│   │   ├── ColonisationMission.ts # Colonization handler
│   │   ├── RecycleMission.ts      # Debris recycling handler
│   │   └── ExpeditionMission.ts   # Expedition handler
│   ├── battle/              # Combat engine
│   │   ├── BattleEngine.ts  # Main battle simulation
│   │   ├── types.ts         # Combat types
│   │   └── utils.ts         # Combat utilities
│   └── supabase/            # Supabase clients
│       ├── client.ts        # Browser client
│       ├── middleware.ts    # Session management
│       └── server.ts        # Server client
├── stores/                  # Zustand stores
│   └── gameStore.ts         # Global game state
├── types/                   # TypeScript types
│   └── database.ts          # Supabase table types
└── proxy.ts                 # Next.js middleware
```

## Data Flow

### Authentication Flow

```
User → Login Page → Supabase Auth → Session Cookie
                                        ↓
                              proxy.ts (middleware)
                                        ↓
                              game/layout.tsx (auth check)
                                        ↓
                              GameProvider (load user data)
                                        ↓
                              Zustand Store (client state)
```

### API Request Flow

```
External Client → API Route → Token Auth (lib/api/auth.ts)
                                    ↓
                           Supabase Query (RLS enforced)
                                    ↓
                              JSON Response
```

### Game Action Flow

```
User Click → Component Handler → Supabase Client
                                        ↓
                              Database Update (RLS)
                                        ↓
                              Zustand Store Update
                                        ↓
                              UI Re-render
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | Player profiles |
| `planets` | Planet data, buildings, ships, resources |
| `user_research` | Research levels per user |
| `building_queue` | Construction queue |
| `research_queue` | Research queue |
| `unit_queue` | Ship/defense build queue |
| `fleet_missions` | Active fleet movements |
| `messages` | Player messages |
| `alliances` | Alliance data |
| `highscores` | Player rankings |
| `api_tokens` | API authentication tokens |

### Key Relationships

```
users 1--* planets
users 1--1 user_research
users 1--* fleet_missions
users 1--* api_tokens
planets 1--* building_queue
planets 1--* unit_queue
```

## Security Model

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only read/write their own data
- Public tables (highscores, alliances) have SELECT for all authenticated users
- API tokens use SHA-256 hashed comparison

### Authentication

1. **Browser**: Supabase Auth with session cookies
2. **API**: Bearer token in Authorization header

## Game Constants

Defined in `src/game/constants.ts`:

- **BUILDINGS**: Metal Mine, Crystal Mine, Deuterium Synthesizer, etc.
- **SHIPS**: Light Fighter, Cruiser, Battleship, Deathstar, etc.
- **DEFENSE**: Rocket Launcher, Plasma Turret, Shield Dome, etc.
- **RESEARCH**: Energy Tech, Drive techs, Combat techs, etc.

## Game Formulas

Implemented in `src/game/formulas.ts`:

- **Costs**: `calculateBuildingCost`, `calculateResearchCost`, `calculateUnitCost`
- **Time**: `calculateBuildingTime`, `calculateResearchTime`, `calculateUnitTime`
- **Production**: `calculateMetalProduction`, `calculateCrystalProduction`, `calculateDeuteriumProduction`
- **Fleet**: `calculateDistance`, `calculateFleetDuration`, `calculateFuelConsumption`
- **Combat**: `calculateAttackPower`, `calculateShieldPower`, `calculateArmor`

## State Management

Using Zustand (`src/stores/gameStore.ts`):

```typescript
interface GameState {
  user: User | null
  research: UserResearch | null
  planets: Planet[]
  currentPlanet: Planet | null
  buildingQueue: BuildingQueue[]
  researchQueue: ResearchQueue[]
  fleetMissions: FleetMission[]
  // ... actions
}
```

## Mission Resolution System

The mission system handles all fleet movements and their resolution when they arrive at their destination. Missions are processed asynchronously via a Supabase Edge Function worker.

### Mission Types

| Type | ID | Description |
|------|----|-------------|
| Attack | 1 | Combat mission against enemy planet |
| Transport | 3 | Resource delivery to friendly planet |
| Deployment | 4 | Relocate fleet to own planet |
| Espionage | 6 | Spy on enemy planet |
| Colonization | 7 | Create new colony |
| Recycle | 8 | Harvest debris field |
| Expedition | 15 | Explore deep space |

### Architecture

```
src/lib/missions/
├── types.ts              # Mission enums, interfaces
├── MissionProcessor.ts   # Main orchestrator
├── AttackMission.ts      # Combat resolution
├── EspionageMission.ts   # Spy reports
├── TransportMission.ts   # Resource transfer
├── ColonisationMission.ts # Colony creation
├── RecycleMission.ts     # Debris collection
└── ExpeditionMission.ts  # Random events
```

### Mission Lifecycle

```
Fleet Dispatch → fleet_missions table INSERT
                        ↓
              Supabase Edge Function (cron)
                        ↓
              MissionProcessor.process()
                        ↓
              Mission Handler (by type)
                        ↓
              Database updates + Message
                        ↓
              Return trip (if applicable)
```

### Supabase Edge Function

The `process-missions` Edge Function runs on a schedule to process all missions that have reached their arrival time:

```typescript
// supabase/functions/process-missions/index.ts
Deno.serve(async () => {
  const missions = await getArrivedMissions()
  for (const mission of missions) {
    await MissionProcessor.process(mission)
  }
})
```

Scheduled via pg_cron:
```sql
SELECT cron.schedule('process-missions', '* * * * *',
  $$SELECT net.http_get('https://xxx.supabase.co/functions/v1/process-missions')$$
);
```

## Battle Engine

The combat engine simulates space battles using the classic OGame combat mechanics with rounds, rapid fire, and debris generation.

### Architecture

```
src/lib/battle/
├── BattleEngine.ts   # Main simulation loop
├── types.ts          # Combat units, results
└── utils.ts          # Damage calc, rapid fire
```

### Combat Flow

```
Attacker Fleet + Defender Fleet/Defense
                ↓
        Initialize Battle State
                ↓
    ┌──────────────────────────────┐
    │     Combat Round (max 6)     │
    │  ┌────────────────────────┐  │
    │  │  1. Fire Selection     │  │
    │  │  2. Damage Calculation │  │
    │  │  3. Shield Absorption  │  │
    │  │  4. Hull Damage        │  │
    │  │  5. Rapid Fire Check   │  │
    │  │  6. Explosion Check    │  │
    │  └────────────────────────┘  │
    │         Repeat until:        │
    │   - One side destroyed OR    │
    │   - 6 rounds completed       │
    └──────────────────────────────┘
                ↓
        Generate Results
                ↓
    ┌─────────────────────────────┐
    │ - Winner determination      │
    │ - Losses calculation        │
    │ - Debris field generation   │
    │ - Combat report creation    │
    │ - Moon chance calculation   │
    └─────────────────────────────┘
```

### Combat Formulas

```typescript
// Damage dealt per unit
damage = baseAttack * (1 + 0.1 * weaponsTech)

// Shield absorption
effectiveShield = baseShield * (1 + 0.1 * shieldingTech)

// Hull points
effectiveHull = baseHull * (1 + 0.1 * armorTech)

// Explosion probability (when hull < 70%)
explodeChance = 1 - (currentHull / maxHull)
```

### Rapid Fire

Certain units have rapid fire against others, allowing multiple attacks per round:

```typescript
interface RapidFire {
  [attackerId: string]: {
    [targetId: string]: number  // shots per round
  }
}
```

### Debris Generation

30% of metal and crystal from destroyed ships become debris:

```typescript
debris.metal = destroyedShips.reduce(
  (sum, s) => sum + s.cost.metal * 0.3, 0
)
debris.crystal = destroyedShips.reduce(
  (sum, s) => sum + s.cost.crystal * 0.3, 0
)
```

### Combat Reports

Battle results are stored in `battle_reports` table and sent as messages:

```typescript
interface BattleReport {
  id: string
  attacker_id: string
  defender_id: string
  planet_id: string
  rounds: CombatRound[]
  attacker_losses: UnitLosses
  defender_losses: UnitLosses
  debris: Resources
  loot: Resources
  winner: 'attacker' | 'defender' | 'draw'
  moon_created: boolean
  created_at: string
}
```

## Espionage System

The espionage system allows players to gather intelligence on enemy planets using probe ships.

### Espionage Flow

```
Send Espionage Probes → Arrive at Target
                              ↓
                    Calculate Success Rate
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
        Success                          Counter-Espionage
              ↓                               ↓
      Generate Report                   Probe Destruction
              ↓                               ↓
    ┌─────────────────┐             ┌─────────────────┐
    │ Resources       │             │ Defender alerted│
    │ Fleet (partial) │             │ Probes lost     │
    │ Defense (part.) │             └─────────────────┘
    │ Buildings (?)   │
    │ Research (?)    │
    └─────────────────┘
```

### Information Levels

Information revealed depends on espionage tech difference:

| Tech Difference | Information Revealed |
|-----------------|---------------------|
| Any | Resources |
| +1 or more | Fleet composition |
| +3 or more | Defense structures |
| +5 or more | Building levels |
| +7 or more | Research levels |

### Counter-Espionage

Defenders with sufficient espionage tech can detect and destroy probes:

```typescript
// Detection chance
chance = (defenderTech - attackerTech) * probeCount * 0.02

// If detected, combat occurs between probes
// Probes have minimal combat stats
```

### Espionage Reports

```typescript
interface EspionageReport {
  id: string
  target_planet_id: string
  target_player_id: string
  spy_count: number
  resources?: Resources
  fleet?: FleetComposition
  defense?: DefenseComposition
  buildings?: BuildingLevels
  research?: ResearchLevels
  counter_espionage: boolean
  probes_lost: number
  created_at: string
}
```

## Moon System

Moons are special celestial bodies that can be created after large battles. They offer unique buildings and strategic advantages.

### Moon Creation

Moons can be created when debris from battle is significant:

```typescript
// Moon chance based on debris
moonChance = Math.min(20, Math.floor(debris.total / 100000))

// Moon diameter (random within range)
diameter = 2000 + Math.random() * 6000  // 2000-8000km
fields = Math.floor(diameter / 1000)    // 2-8 fields
```

### Moon Structure

```typescript
interface Moon {
  id: string
  planet_id: string        // Associated planet
  name: string
  diameter: number
  fields: number
  fields_used: number

  // Moon-exclusive buildings
  lunar_base: number       // Increases fields
  sensor_phalanx: number   // Scan fleet movements
  jump_gate: number        // Instant fleet transfer

  // Standard storage
  metal_storage: number
  crystal_storage: number
  deuterium_tank: number

  // No mines - moons have no production
}
```

### Moon Buildings

| Building | Description |
|----------|-------------|
| Lunar Base | +3 fields per level, required for other buildings |
| Sensor Phalanx | Scan enemy fleet movements, range based on level |
| Jump Gate | Instant fleet transfer between moons (cooldown: 1h) |

### Sensor Phalanx

```typescript
// Phalanx range calculation
range = (phalanxLevel ** 2) - 1  // in systems

// Phalanx scan shows all incoming/outgoing fleets
// to/from target planet within range
```

### Jump Gate

```typescript
// Jump gate allows instant fleet transfer
// between two moons with jump gates
// No fuel cost, no travel time
// Cooldown: 1 hour per gate
```

### Moon Destruction

Moons can be destroyed by RIP (Deathstar) missions:

```typescript
// Destruction chance based on moon diameter
moonDestroyChance = (100 - Math.sqrt(diameter)) * ripsCount / 100

// But RIPs can also be destroyed
ripDestroyChance = Math.sqrt(diameter) / 2
```

## Key Design Decisions

### 1. Server Components + Client Components

- Layout and data fetching in Server Components
- Interactive UI in Client Components with 'use client'
- GameProvider bridges server data to client state

### 2. Retry Logic for Auth

`game/layout.tsx` includes retry logic (5 attempts with exponential backoff) to handle database trigger propagation delay after user signup.

### 3. Immediate State Updates

Actions update local Zustand state immediately after successful database writes for responsive UX.

### 4. Error Handling Pattern

All user-facing actions display errors in UI with auto-clear after 5 seconds.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth` | POST | Generate API token |
| `/api/v1/player` | GET | Get player info |
| `/api/v1/planets` | GET | List planets |
| `/api/v1/planets/:id` | GET/PUT | Planet details/update |
| `/api/v1/planets/:id/build` | POST | Start building |
| `/api/v1/fleet` | GET/POST | Fleet operations |
| `/api/v1/galaxy` | GET | Galaxy view |

## Deployment

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Build Command

```bash
npm run build
```

### Database Migrations

Managed via Supabase MCP or dashboard. Key migrations:
- `create_initial_tables` - All 14 core tables
- `add_handle_new_user_trigger` - Auto-create user profile on signup
- `add_missing_rls_policies` - Security policies

## Extending the Game

### Adding a New Building

1. Add definition to `BUILDINGS` in `src/game/constants.ts`
2. Add column to `planets` table
3. Update `database.ts` types
4. Add to appropriate page (resources/facilities)

### Adding a New Ship

1. Add definition to `SHIPS` in `src/game/constants.ts`
2. Columns already exist in `planets` and `fleet_missions`
3. Appears automatically in shipyard

### Adding a New Research

1. Add definition to `RESEARCH` in `src/game/constants.ts`
2. Add column to `user_research` table
3. Update `database.ts` types
4. Add to research page
