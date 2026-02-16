# OGameX-Next - Complete Roadmap

> Generated: 2026-02-16 | Based on actual codebase analysis

## Overview

OGameX-Next is a modern space strategy game built with Next.js 16, React 19, Three.js/R3F, and Supabase.
This roadmap reflects the ACTUAL implementation status found in the repository.

---

## Status Legend

| Status | Description |
|--------|-------------|
| DONE | Fully implemented and functional |
| IN_PROGRESS | Partially implemented, needs completion |
| TODO | Not yet started |
| BLOCKED | Waiting on dependencies |

---

## Short Term (Sprint 1-2)

### Core Game Features

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| User Authentication | DONE | `src/app/(auth)/`, `src/lib/supabase/` | Supabase Auth integrated |
| Planet Management | DONE | `src/app/game/overview/`, `src/stores/gameStore.ts` | Full CRUD with 3D view |
| Building System | DONE | `src/app/game/facilities/`, queues functional | Queue system working |
| Research System | DONE | `src/app/game/research/` | Tech tree implemented |
| Shipyard | DONE | `src/app/game/shipyard/` | Ship construction working |
| Defense System | DONE | `src/app/game/defense/` | Defense structures implemented |
| Resource Production | DONE | `src/lib/game/formulas.ts` | Formulas from DB config |
| Fleet Missions | DONE | `src/app/game/fleet/`, `src/lib/missions/` | All mission types |
| Galaxy View (2D) | DONE | `src/app/game/galaxy/page.tsx` | Table-based navigation |
| Messages System | DONE | `src/app/game/messages/` | Player messaging |
| Highscore/Rankings | DONE | `src/app/game/highscore/` | Leaderboards working |

### 3D Visualization

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Solar System 3D | DONE | `src/components/game/3d/SolarSystemView.tsx` | Full implementation |
| Planet 3D | DONE | `src/components/game/3d/Planet3D.tsx` | Procedural + textures |
| Starfield Background | DONE | `src/components/game/3d/Starfield.tsx` | 5000+ stars |
| GalaxyMap3D Component | DONE | `src/components/game/3d/GalaxyMap3D.tsx` | Elite-style navigation |
| Galaxy Page 3D Toggle | TODO | `src/app/game/galaxy/page.tsx` | Need to integrate GalaxyMap3D |
| Post-processing Effects | DONE | `src/lib/3d/effects.tsx` | Bloom, chromatic aberration |

### Battle System

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Classic Battle Engine | DONE | `src/lib/battle/BattleEngine.ts` | OGame-style combat |
| Advanced Battle Engine | DONE | `src/lib/battle/AdvancedBattleEngine.ts` | Multi-damage types |
| ACS (Alliance Combat) | DONE | `src/lib/battle/ACSBattleEngine.ts` | Multi-participant |
| Battle Reports | DONE | `src/app/game/battle/[battleId]/` | Detailed reports |
| 3D Battle Visualization | DONE | `src/components/game/3d/battle/` | Ship models, effects |
| Veterancy System | DONE | `src/lib/battle/veterancy-system.ts` | Experience bonuses |
| Equipment System | DONE | `src/lib/battle/equipment-system.ts` | Upgrades/mods |
| Fleet Formations | DONE | `src/lib/battle/fleet-formations.ts` | Tactical bonuses |

---

## Medium Term (Sprint 3-5)

### Admin System

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Admin Dashboard | DONE | `src/app/admin/page.tsx` | Stats overview |
| Player Management | DONE | `src/app/admin/players/` | View/search players |
| Player Details | DONE | `src/app/admin/players/[userId]/` | Full player view |
| Ships Config Editor | DONE | `src/app/admin/entities/ships/` | CRUD ships |
| Buildings Config Editor | DONE | `src/app/admin/entities/buildings/` | CRUD buildings |
| Defense Config Editor | DONE | `src/app/admin/entities/defenses/` | CRUD defenses |
| Research Config Editor | DONE | `src/app/admin/entities/research/` | CRUD research |
| Equipment Editor | DONE | `src/app/admin/entities/equipment/` | Advanced battle equipment |
| Formations Editor | DONE | `src/app/admin/entities/formations/` | Fleet formations |
| Game Config | DONE | `src/app/admin/config/` | Server settings |
| Boost Types | DONE | `src/app/admin/boosts/` | Manage boosts |
| Audit Log | DONE | `src/app/admin/audit/` | Action tracking |
| Analytics | DONE | `src/app/admin/analytics/` | Charts/stats |
| **Fleet Management** | TODO | - | Admin CRUD for fleets |
| **Planet Management** | TODO | - | Admin CRUD for planets |
| **Alliance Management** | TODO | - | Admin CRUD for alliances |
| Bulk Actions | TODO | - | Multi-select operations |

### Exploration & Discovery

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Expedition System | DONE | `src/lib/expeditions/` | Random events |
| Espionage System | DONE | `src/app/game/espionage/`, `src/lib/espionage/` | Spy missions |
| Debris Recycling | DONE | `src/app/game/recycle/`, `src/lib/debris/` | Resource recovery |
| Cartography System | IN_PROGRESS | `src/app/game/inventory/` | Items partially done |
| Procedural Galaxy | DONE | `src/lib/galaxy/` | Full generation |
| Star Effects | DONE | `src/lib/galaxy/star-effects.ts` | Production modifiers |
| Fog of War | IN_PROGRESS | `src/lib/galaxy/GalaxyMapController.ts` | Discovery levels exist |

### Alliance Features

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Alliance Creation | DONE | `src/app/game/alliance/` | Basic alliance |
| Alliance Members | DONE | `src/stores/allianceStore.ts` | Member management |
| ACS Coordination | DONE | `src/stores/acsStore.ts` | Combat coordination |
| Alliance Diplomacy | IN_PROGRESS | - | NAP/War declarations partial |
| Alliance Chat | TODO | - | Not implemented |

### Economy & Trading

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Marketplace | DONE | `src/app/game/marketplace/` | Trading system |
| Resource Trading | DONE | Part of marketplace | Buy/sell resources |
| Dark Matter Shop | IN_PROGRESS | - | Partially in boosts |

---

## Long Term (Sprint 6+)

### Advanced Features

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Moon System | DONE | `src/lib/moons/` | Moon creation/buildings |
| Interplanetary Missiles | TODO | - | Not implemented |
| Sensor Phalanx | TODO | - | Fleet detection |
| Jump Gate | TODO | - | Instant fleet movement |
| Terraform | TODO | - | Increase planet fields |
| Commander Officers | TODO | - | Named officers with bonuses |

### Social Features

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Friend List | TODO | - | Not implemented |
| Buddy System | TODO | - | Not implemented |
| Notes System | TODO | - | Player notes |

### Performance & Scaling

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| Viewport Loading RPC | DONE | `get_systems_in_viewport` | Zone-based loading |
| Database Indexes | DONE | Multiple migrations | Performance indexes |
| Config Caching | DONE | `src/lib/game/config-cache.ts` | Server-side cache |
| Hierarchical Sync | DONE | Migration `hierarchical_sync_functions` | Efficient data sync |

### Testing & Quality

| Feature | Status | Files | Notes |
|---------|--------|-------|-------|
| E2E Tests (Playwright) | IN_PROGRESS | `tests/e2e/full-app-test.ts` | Basic tests exist |
| Unit Tests (Battle) | DONE | `src/lib/battle/__tests__/` | Good coverage |
| Unit Tests (Other) | TODO | - | Needs expansion |
| Integration Tests | TODO | - | Not implemented |

---

## Database Dependencies

### Existing Tables (Verified in Supabase)

- `users` - User accounts with boost energy
- `planets` / `planets_compat` - Planet data
- `user_research` - Research levels
- `building_queue` / `research_queue` - Construction queues
- `fleet_missions` - Active missions
- `battle_reports` - Combat history
- `debris_fields` - Wreckage
- `alliances` - Alliance data
- `messages` - Player messages
- `game_config` - Server configuration
- `admin_roles` - Admin permissions
- `audit_log` - Admin actions
- `boost_types` - Boost definitions
- `galaxies` / `solar_systems` / `celestial_bodies` - Procedural universe
- `system_connections` - Hyperlane network
- `user_discoveries` - Fog of war state
- `exploration_missions` - Active explorations
- `cartography_items` - Discovered items

### Missing Tables (TODO)

- `alliance_diplomacy` - NAP/War relations
- `alliance_messages` - Alliance chat
- `player_notes` - User notes
- `friend_list` - Social connections

### Required Migrations

1. ~~`001_initial_schema.sql`~~ DONE
2. ~~`002_procedural_galaxy_system.sql`~~ DONE
3. ~~`003_admin_system.sql`~~ DONE
4. ~~`005_exploration_missions.sql`~~ DONE
5. ~~Security/Performance fixes~~ DONE
6. ~~Scalability indexes~~ DONE

---

## Component Dependencies

### UI Components (All DONE)

- `HoloButton` - Holographic button
- `HoloCard` - Holographic card
- `HoloModal` - Modal with a11y
- `HoloInput` - Styled input
- `HoloTableAdvanced` - Data table
- `DataTable` - Admin data table
- `StatCard` - Dashboard stats
- `ConfirmDialog` - Confirmation modal

### Missing Components (TODO)

- `SlidePanel` - Slide-in side panel with GSAP
- `BulkActionBar` - Multi-select actions
- `AdminFleetManager` - Fleet CRUD
- `AdminPlanetManager` - Planet CRUD
- `AdminAllianceManager` - Alliance CRUD

---

## API Routes Status

### Game API (All DONE)

- `/api/v1/planets` - Planet operations
- `/api/v1/buildings` - Building operations
- `/api/v1/research` - Research operations
- `/api/v1/fleet` - Fleet operations
- `/api/v1/galaxy` - Galaxy data
- `/api/v1/messages` - Messaging
- `/api/v1/alliance` - Alliance operations

### Admin API (Partial)

- `/api/admin/analytics/*` - DONE
- `/api/admin/players/*` - DONE
- `/api/admin/config/*` - DONE
- `/api/admin/audit/*` - DONE
- `/api/admin/entities/*` - DONE
- `/api/admin/fleets/*` - TODO
- `/api/admin/planets/*` - TODO
- `/api/admin/alliances/*` - TODO

---

## Risk Assessment

### High Priority Fixes

1. **Galaxy 3D Integration** - GalaxyMap3D exists but not wired to galaxy page
2. **Admin Fleet/Planet/Alliance CRUD** - Missing management pages
3. **Test Coverage** - E2E tests minimal, need expansion
4. **Cleanup Patterns** - Some components missing AbortController cleanup

### Medium Priority

1. **Alliance Features** - Diplomacy incomplete
2. **Cartography** - Item system partially done
3. **Mobile Responsiveness** - Some pages need work

### Low Priority

1. **Social Features** - Friend list, notes
2. **Advanced Moon Features** - Jump gate, phalanx

---

## Next Steps (Recommended Order)

1. **Integrate GalaxyMap3D into galaxy page** with 2D/3D toggle
2. **Add Admin CRUD** for fleets, planets, alliances
3. **Create SlidePanel** component for details view
4. **Expand E2E tests** with Playwright
5. **Code review** for cleanup/a11y/performance issues

---

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Lint
npm run lint

# Database
npm run db:generate  # Generate types
npm run db:push      # Push migrations
npm run db:reset     # Reset database

# Tests (when configured)
npx playwright test
```

---

*This roadmap is auto-generated based on actual repository analysis. Update as features are completed.*
