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
