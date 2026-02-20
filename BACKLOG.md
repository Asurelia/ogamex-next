# OGameX-Next - Backlog & Issue Tracker

> Auto-updated tracking document for bugs, missing features, optimization opportunities, and technical debt.
> Last updated: 2026-02-20

---

## Legend

- **DONE** = Fully implemented and working
- **PARTIAL** = Core logic exists, needs polish or missing sub-features
- **OPEN** = Not started, needs implementation
- **RESEARCH** = Needs investigation before implementation

---

## Engine Core (Phase 0) - DONE

| Item | Status | Files |
|------|--------|-------|
| Game Engine singleton | DONE | `src/engine/GameEngine.ts` |
| Fixed timestep game loop (60Hz) | DONE | `src/engine/GameLoop.ts` |
| bitecs 0.4.x ECS world | DONE | `src/engine/ecs/ClientECS.ts`, `components.ts` |
| Input manager (keyboard/mouse) | DONE | `src/engine/InputManager.ts` |
| Scene manager (3 layers) | DONE | `src/engine/SceneManager.ts` |
| Asset manager (GLTF/texture cache) | DONE | `src/engine/AssetManager.ts` |
| System registration bridge (wrapSystem) | DONE | `src/engine/EngineController.tsx` (12 systems) |
| NetworkBridge (Colyseus -> ECS + store) | DONE | `src/engine/NetworkBridge.ts` |

### ECS Systems (all registered in EngineController.tsx)

| System | Status | Tick Rate | Description |
|--------|--------|-----------|-------------|
| InputSystem | DONE | 60Hz | Keyboard/mouse -> ECS |
| NetworkReceiveSystem | DONE | 60Hz | Buffer network state -> ECS |
| ClientPredictionSystem | DONE | 60Hz | Dead reckoning + interpolation |
| PredictionBridgeSystem | DONE | ~20Hz | WebWorker prediction bridge |
| AISystem | DONE | ~2Hz | NPC behaviour tree evaluation |
| IntentExecutorSystem | DONE | 60Hz | InputIntent -> movement/combat |
| NavigationSystem | DONE | 60Hz | Route A*, cross-system nav |
| CameraSystem | DONE | 60Hz | Orbit camera, tracking, modes |
| LODSystem | DONE | 60Hz | Distance-based LOD |
| RenderSyncSystem | DONE | 60Hz | ECS -> InstancedMesh |
| ParticleUpdateSystem | DONE | 60Hz | Particle batch renderer |
| UIBridgeSystem | DONE | ~10Hz | ECS -> Zustand store for React |

---

## AI System - DONE

| Item | Status | Files |
|------|--------|-------|
| Behaviour Tree framework | DONE | `src/engine/ai/BehaviourTree.ts` (Selector, Sequence, Condition, Action, Inverter, AlwaysSucceed) |
| Patrol BT preset | DONE | `src/engine/ai/bt-presets.ts` |
| Guard BT preset | DONE | `src/engine/ai/bt-presets.ts` |
| Pirate BT preset | DONE | `src/engine/ai/bt-presets.ts` |
| Miner BT preset | DONE | `src/engine/ai/bt-presets.ts` |
| InputIntent ECS component | DONE | `src/engine/ecs/components.ts` |

---

## Dev Panel - DONE

| Item | Status | Files |
|------|--------|-------|
| Engine debug Zustand store | DONE | `src/engine/debug/EngineDebugStore.ts` |
| Leva-based DevPanel (F12 toggle) | DONE | `src/components/game/ui/dev/DevPanel.tsx` |
| Neocom DevTools button | DONE | `src/components/game/ui/neocom/Neocom.tsx` |
| UIBridgeSystem metrics push | DONE | `src/engine/systems/UIBridgeSystem.ts` |

---

## Database Architecture - DONE

**Supabase** (auth + static bootstrap ONLY):
| Table | Status | Purpose |
|-------|--------|---------|
| `users` | DONE | Auth users (Supabase Auth) |
| `rt_solar_systems` | DONE | Static system metadata |
| `rt_stations` | DONE | Static station data |
| `rt_ship_types` | DONE | Static ship class definitions |
| `rt_skill_definitions` | DONE | Static skill definitions |
| `rt_implant_types` | DONE | Static implant types |
| `system_connections` | DONE | Static stargate links |
| `rt_wormhole_systems` | DONE | Static WH system data |
| `rt_planet_resources` | DONE | Static planet resources |

**SQLite** (`./data/server.db`) — all gameplay persistence:
| Domain | Tables | Status |
|--------|--------|--------|
| Players | `players` (wallet + attributes fused) | DONE |
| Ships | `ships` | DONE |
| Skills | `character_skills`, `skill_queue` | DONE |
| Wallet | `wallet_transactions` | DONE |
| Corps | `corporations`, `corp_members`, `corp_applications`, `corp_wallet`, `corp_wallet_journal` | DONE |
| Clones | `clones`, `clone_implants` | DONE |
| Industry | `blueprints`, `industry_jobs` | DONE |
| PI | `colonies`, `colony_buildings`, `colony_routes`, `colony_storage` | DONE |
| Contracts | `contracts`, `contract_items`, `contract_bids` | DONE |
| Sovereignty | `sovereignty`, `sovereignty_structures` | DONE |
| Inventory | `inventory` | DONE |
| Economy | `market_orders`, `trade_history`, `price_history` | DONE |
| Wormholes | `wormhole_systems`, `wormhole_connections`, `dynamic_connections` | DONE |
| Scanning | `scan_probes`, `scan_results` | DONE |
| Logs | `chat_logs`, `combat_logs`, `mining_logs` | DONE |
| Cache | `cached_skill_definitions`, `cached_implant_types`, `planet_resources` | DONE |

---

## Factions & Universe (Phase 2) - DONE

| Item | Status | Files |
|------|--------|-------|
| 4 faction identities (colors, damage, aesthetics) | DONE | `src/data/faction-identities.ts` |
| Universe graph (100 systems) | DONE | `src/data/universe-graph.ts` |
| Seeded universe generator | DONE | `src/data/universe-generator.ts` |
| A* pathfinder | DONE | `src/data/universe-pathfinder.ts` |
| Ship type definitions (20+ types) | DONE | `src/data/ship-type-definitions.ts` |

---

## Visual Rendering (Phase 3) - PARTIAL

| Item | Status | Files | Notes |
|------|--------|-------|-------|
| Scene builder (stars, sun, nebula) | DONE | `src/engine/rendering/SystemSceneBuilder.ts` | |
| Ship renderer (InstancedMesh) | DONE | `src/engine/rendering/ShipRenderer.ts` | |
| Post-processing (Bloom, FXAA) | DONE | `src/lib/3d/effects.ts` | |
| Damage floating numbers VFX | DONE | `src/components/game/3d/rt/DamageVFX.tsx` | Integrated in SpaceScene |
| Warp tunnel VFX | DONE | `src/lib/3d/warp-effect.ts`, `src/components/game/3d/rt/WarpVFX.tsx` | Integrated in SpaceScene |
| Explosion VFX | OPEN | - | Need particle explosion on ship_destroyed |
| Weapon fire VFX (lasers, missiles) | OPEN | - | Need beam/projectile rendering between attacker and target |
| Mining laser VFX | OPEN | - | Need beam from ship to asteroid |
| Engine trail particles | OPEN | - | Need continuous particle trail behind moving ships |
| Shield impact VFX | OPEN | - | Shield bubble flash on hit |
| Docking animation | OPEN | - | Ship approach + dock sequence |
| Undocking animation | OPEN | - | Ship exit station sequence |

---

## Photon UI (Phase 4) - DONE

| Item | Status | Files |
|------|--------|-------|
| Neocom sidebar (48px rail, 10 icons) | DONE | `src/components/game/ui/neocom/Neocom.tsx`, `NeocomIcon.tsx` |
| PhotonWindow (glassmorphism) | DONE | `src/components/game/ui/photon/PhotonWindow.tsx` |
| PhotonWindowManager (z-order, pin) | DONE | `src/components/game/ui/photon/PhotonWindowManager.tsx` |
| Photon theme tokens | DONE | `src/components/game/ui/photon/photon-theme.ts` |
| Window position persistence (localStorage) | DONE | `src/components/game/ui/WindowManager.tsx` |

---

## Navigation (Phase 5) - DONE

| Item | Status | Files |
|------|--------|-------|
| NavigationSystem (A* route) | DONE | `src/engine/systems/NavigationSystem.ts` |
| RouteWindow UI | DONE | `src/components/game/ui/rt/RouteWindow.tsx` |
| Cross-system warp (server) | DONE | `server/src/systems/warp.ts` |
| system_transfer handler | DONE | `server/src/rooms/SystemRoom.ts` |
| Warp VFX integration | DONE | `src/components/game/3d/rt/WarpVFX.tsx` |

---

## CRITICAL - Core Gameplay Missing

### [MISSING] Death / Respawn system
- **Status**: OPEN
- **Priority**: CRITICAL
- **Details**: When a ship is destroyed (`ship_destroyed` event), the player has no way to respawn. Need:
  - Pod (capsule) ejection on ship destruction
  - Clone station selection / respawn at home station
  - Ship insurance system (partial ISK refund)
  - Wreck creation at death location (lootable cargo)
  - Kill mail / loss mail generation

### [DONE] Wallet / Currency (ISK) system
- **Status**: DONE
- **Priority**: CRITICAL
- **Details**: Wallet service with debit/credit/transfer for both players and corps.
  - `walletBalance` in store (DONE)
  - Server-side wallet management: `server/src/services/wallet-service.ts`
  - DB: `rt_player_wallet` table, `rt_corp_wallet` (7 divisions), `rt_wallet_transactions`, `rt_corp_wallet_journal`

### [DONE] Inventory system
- **Status**: DONE
- **Priority**: CRITICAL
- **Details**: Full inventory service with stacking, volume tracking, and multi-location support.
  - DB: `rt_items` (item type definitions), `rt_inventory` (stacking, location-based)
  - Server: `server/src/services/inventory-service.ts` (addItem, removeItem, moveItem, getInventory)
  - Locations: ship_cargo, station_hangar, corp_hangar, contract_escrow, colony

### [MISSING] Target locking / engagement flow
- **Status**: PARTIAL
- **Priority**: HIGH
- **Details**: Server `lock_target`/`unlock_target` messages exist. Client LockedTargets in HUD works. Missing:
  - Lock time based on ship signature radius and scan resolution
  - Maximum locked targets based on ship/skills
  - Lock breaking on warp/distance
  - Weapon range check before firing

---

## HIGH - Core Gameplay Loop

### [PARTIAL] Combat system
- **Status**: PARTIAL
- **Files**: `server/src/systems/combat.ts`, `SelectedItemWindow.tsx`
- **Done**: Server damage calculation (shield->armor->hull), faction damage profiles, DPS by class, lock_target/unlock_target, damage VFX (floating numbers), attack button in SelectedItemWindow
- **Missing**:
  - Weapon range indicators (circle around ship showing optimal/falloff)
  - Damage type display on HUD (EM/Thermal/Kinetic/Explosive)
  - Weapon cycling animation (turret rotation)
  - Kill/assist tracking
  - Combat log window
  - Aggression timer (prevents docking/jumping while in combat)

### [PARTIAL] Mining gameplay
- **Status**: PARTIAL
- **Files**: `server/src/systems/mining.ts`, `src/engine/ai/bt-presets.ts`
- **Done**: Server mining (range check, yield, depletion), Mine button in SelectedItemWindow, NPC miner BT, mining_yield -> cargo (DONE)
- **Missing**:
  - Mining laser VFX (beam from ship to asteroid)
  - Ore refining at stations
  - Survey scanner (show asteroid contents)
  - Mining drones

### [PARTIAL] Docking / Station services
- **Status**: PARTIAL
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Done**: Server dock/undock handlers, Dock button in SelectedItemWindow, docking state in store (DONE), docking notification (DONE)
- **Missing**:
  - Station services UI (repair, fitting, market, hangar, medical clone)
  - Repair service (restore shield/armor/hull for ISK)
  - Station-specific services based on station type
  - Docking request queue (distance check exists: 2500m)

### [PARTIAL] Ship fitting / equipment
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/FittingWindow.tsx`
- **Done**: FittingWindow with module slots UI, CPU/powergrid bars, fitting_update handler (DONE)
- **Missing**:
  - Module definitions data (weapons, shields, armor plates, mining lasers)
  - Drag-and-drop fitting from inventory
  - Module stat effects on ship (speed, tank, DPS bonuses)
  - Overheating mechanic
  - DB: `rt_modules`, `rt_fitted_modules` tables

### [PARTIAL] Skill training
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/SkillsWindow.tsx`, `server/src/systems/skill-ticker.ts`
- **Done**: SkillsWindow with category tabs and queue, server skill ticker, skill_update handler (DONE)
- **Missing**:
  - Skill prerequisites / skill tree dependency graph
  - Attribute-based training speed (Intelligence, Memory, etc.)
  - Skill effects on gameplay (faster mining, more DPS, etc.)
  - Skill plan import/export
  - DB: `rt_skill_definitions` table

### [PARTIAL] Market / Trading
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/MarketWindow.tsx`, `server/src/systems/economy.ts`
- **Done**: MarketWindow with buy/sell forms, server economy order matching, market_update handler (DONE)
- **Missing**:
  - Market browser (search items across stations)
  - Price history graph
  - Tax calculation (broker fee, sales tax)
  - Minimum order quantities
  - Margin trading
  - Regional market data

---

## MEDIUM - Features & Polish

### [PARTIAL] Chat system
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/ChatWindow.tsx`
- **Done**: 3 channels (Local, Corp, System), message history, auto-scroll, system_chat handler
- **Missing**:
  - Private messages (whisper)
  - Corp/alliance channels
  - Fleet channel
  - Chat links (item links, system links, player links)
  - Block/mute player
  - Message persistence (DB: `rt_chat_messages`)

### [PARTIAL] Fleet system
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/FleetManagerWindow.tsx`
- **Done**: Fleet UI with commander buttons, formation selector, member HP bars, fleet_update handler
- **Missing**:
  - Fleet invite / join / leave
  - Wing/squad structure (Commander -> Wing Commander -> Squad Commander)
  - Fleet warp (commander warps entire fleet)
  - Fleet bonuses (leadership skills)
  - Fleet finder (LFG system)

### [PARTIAL] Starmap
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/Starmap3DWindow.tsx`, `StarmapWindow.tsx`
- **Done**: 2D canvas starmap, 3D instanced universe graph, route display
- **Missing**:
  - Click system -> set route -> auto-warp
  - System info popup on hover (security, faction, player count, stations)
  - Route display on starmap (highlighted path)
  - Sovereignty/territory coloring
  - Activity heatmap (kills, players, NPC)

### [PARTIAL] Overview
- **Status**: DONE
- **Files**: `src/components/game/ui/rt/OverviewWindow.tsx` (362 lines)
- **Done**: Tab filtering (All/Ships/NPCs/Asteroids/Stations), column sorting, right-click context menu, distance calculation, faction icons

### [PARTIAL] HUD overlay
- **Status**: DONE
- **Files**: `src/components/game/ui/rt/HUDOverlay.tsx` (236 lines)
- **Done**: System info, shield/armor/hull/capacitor bars, speed display, locked targets, module rack, route indicator

### [DONE] Selected item window
- **Status**: DONE
- **Files**: `src/components/game/ui/rt/SelectedItemWindow.tsx` (236 lines)
- **Done**: Target info, ship health bars, action buttons (Approach, Orbit, Warp To, Lock, Attack, Mine, Dock)

### [DONE] Route window
- **Status**: DONE
- **Files**: `src/components/game/ui/rt/RouteWindow.tsx` (170 lines)

### [DONE] Fitting window
- **Status**: DONE
- **Files**: `src/components/game/ui/rt/FittingWindow.tsx` (164 lines)

---

## MISSING - Expected Features for an EVE-like Space MMO

### [OPEN] Autopilot
- **Priority**: MEDIUM
- **Details**: Auto-navigate along set route (warp gate to gate). Player can AFK while ship follows route. Slower than manual (aligns to 0 on gate instead of warping at range).

### [OPEN] Bookmarks
- **Priority**: MEDIUM
- **Details**: Save 3D positions in space as bookmarks. Essential for PvP (safe spots, tactical bookmarks). Need:
  - Bookmark manager window
  - Create bookmark at current position
  - Warp to bookmark
  - Bookmark folders
  - Share bookmarks with corp/fleet

### [OPEN] Directional scanner / Probe scanner
- **Priority**: MEDIUM
- **Details**: EVE's core exploration mechanic. D-scan shows entities within a cone. Probes triangulate hidden sites.
  - D-scan: 360/180/60/15 degree cone, 14.3 AU range
  - Probe scanner: Deploy probes, narrow down signal
  - Cosmic anomalies / signatures

### [OPEN] Overview profiles / presets
- **Priority**: LOW
- **Details**: Save overview filter configurations. E.g., "PvP" shows only ships, "Mining" shows asteroids + ships.

### [OPEN] Notification system UI
- **Priority**: MEDIUM
- **Details**: Store has `notifications[]` and `addNotification()` (DONE). Missing:
  - Toast notification component (bottom-right, auto-dismiss)
  - Notification history panel
  - Sound on notification

### [OPEN] Right-click context menu in 3D viewport
- **Priority**: MEDIUM
- **Details**: Click on ships/stations/asteroids in 3D space to get action menu. Currently only Overview has context menu.

### [OPEN] Character sheet
- **Priority**: LOW
- **Details**: View character info: name, corporation, skills, attributes, implants, employment history.

### [OPEN] Corporation system
- **Priority**: LOW
- **Details**: Player organizations. Corp management, shared hangars, roles/permissions, corp tax, corp wallet.

### [OPEN] Insurance
- **Priority**: LOW
- **Details**: Insure ships at stations. On destruction, receive ISK payout. Premium tiers (basic/standard/platinum).

### [OPEN] Bounty system
- **Priority**: LOW
- **Details**: Place bounties on players. Bounty payout on kill (partial, to prevent abuse).

### [OPEN] NPC loot tables
- **Priority**: MEDIUM
- **Details**: NPCs drop loot on destruction. Need:
  - Loot table definitions per NPC type
  - Wreck object creation at death location
  - Loot window (open wreck, drag items to cargo)
  - Salvaging mechanic

### [OPEN] Agent missions / PvE content
- **Priority**: MEDIUM
- **Details**: NPC agents offer missions (courier, combat, mining). Reward: ISK + standing + loot.
  - Mission briefing window
  - Objective tracking
  - Mission completion/failure
  - Agent standings

### [OPEN] Warp disruption / Tackle mechanics
- **Priority**: MEDIUM
- **Details**: Warp disruptors/scramblers prevent enemy from warping. Essential for PvP.
  - Warp core stabilizers (counter)
  - Warp disruption bubbles (nullsec only)
  - Tackle notification on HUD

### [OPEN] Drone system
- **Priority**: LOW
- **Details**: Launch drones from drone bay. Types: combat, mining, logistics, ECM. Drone AI (engage, return, aggressive/passive).

### [OPEN] Capacitor warfare
- **Priority**: LOW
- **Details**: Energy neutralizers and nosferatu drain target capacitor. Capacitor boosters as counter. ECM/ECCM.

### [OPEN] Local chat player list
- **Priority**: MEDIUM
- **Details**: In EVE, the Local channel shows all players in system. Critical for PvP awareness.

---

## Sound & Music

### [OPEN] Ambient space music
- **Priority**: MEDIUM
- **Details**: Background music that changes by security level (calm highsec -> tense lowsec -> ominous nullsec). Web Audio API or Howler.js.

### [OPEN] UI sound effects
- **Priority**: MEDIUM
- **Details**: Button clicks, window open/close, module activation, lock acquired, lock lost, chat notification.

### [OPEN] Combat SFX
- **Priority**: MEDIUM
- **Details**: Weapon fire sounds (per weapon type), shield impact, armor impact, hull impact, explosion.

### [OPEN] Warp SFX
- **Priority**: LOW
- **Details**: Warp drive activation, tunnel sound, exit sound.

### [OPEN] Spatial audio (3D positional)
- **Priority**: LOW
- **Details**: Three.js AudioListener + PositionalAudio for 3D sound placement.

---

## UI/UX Improvements

### [DONE] Window positions persisted
- **Files**: `src/components/game/ui/WindowManager.tsx`
- **Details**: Saves to localStorage, restores on mount.

### [OPEN] Neocom proper SVG icons
- **Files**: `src/components/game/ui/neocom/Neocom.tsx`
- **Details**: Replace emoji icons with proper SVG icons for consistency and crisp rendering.

### [OPEN] Keyboard shortcuts panel
- **Priority**: LOW
- **Details**: Display key bindings (F1-F8 modules, Ctrl+click, etc.). Rebindable shortcuts.

### [OPEN] Tutorial / Onboarding
- **Priority**: LOW
- **Details**: New player tutorial: undock -> navigate -> mine -> sell ore -> fit ship -> combat basics.

### [OPEN] Loading screen with progress
- **Priority**: LOW
- **Details**: Show asset loading progress during initial connect. Currently just "Loading game..." spinner.

### [OPEN] Tooltip system
- **Priority**: MEDIUM
- **Details**: Hover tooltips on modules, items, skills showing detailed stats. Rich tooltip component.

### [OPEN] Minimap / System radar
- **Priority**: LOW
- **Details**: Small radar widget showing nearby entities. Direction indicator for selected target.

---

## Performance & Optimization

### [OPEN] AI system WebWorker offload
- **Priority**: LOW
- **Files**: `src/engine/systems/AISystem.ts`
- **Details**: BT evaluation at 2Hz is fine for <50 NPCs. For 100+ NPCs, move BT evaluation to existing `ai-targeting.worker.ts`.

### [OPEN] InstancedMesh frustum culling
- **Priority**: MEDIUM
- **Details**: `frustumCulled=false` on InstancedMesh is suboptimal. Manual per-instance culling with BVH would reduce draw calls.

### [OPEN] Texture compression (KTX2)
- **Priority**: LOW
- **Details**: Ship models/textures not using KTX2 compression. 4-8x VRAM reduction possible.

### [OPEN] WebGPU renderer
- **Priority**: RESEARCH
- **Details**: Three.js WebGPU renderer production-ready since r171+. ~70% browser support. 2-3x performance boost for instanced rendering. `three/webgpu` import with WebGL2 fallback.

### [OPEN] BatchedMesh for varied geometry
- **Priority**: LOW
- **Details**: Current single InstancedMesh uses same geometry for all ships. BatchedMesh (r155+) supports different geometry per instance (different ship models).

### [OPEN] Object pooling for VFX
- **Priority**: LOW
- **Details**: Damage numbers, explosions, projectiles should use object pools instead of creating/destroying Three.js objects.

---

## Security

### [OPEN] Supabase leaked password protection
- **Priority**: HIGH
- **Details**: Supabase security advisor flags this. Enable in Supabase Auth settings.

### [OPEN] Rate limiting on Colyseus messages
- **Priority**: HIGH
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: Clients can spam warp/combat/movement commands. Need per-message-type rate limits.

### [OPEN] Input validation on Colyseus commands
- **Priority**: HIGH
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: Message handlers should validate all input types and ranges. Sanitize strings.

### [OPEN] Server-side position validation
- **Priority**: MEDIUM
- **Files**: `src/engine/systems/ClientPredictionSystem.ts`
- **Details**: Server should validate position deltas. Speed hacks possible if server trusts client positions.

### [OPEN] RLS policies on RT tables
- **Priority**: HIGH
- **Details**: RT tables may lack Row Level Security. Players could read other players' data via Supabase client directly.

---

## Database - Missing Tables

| Table | Priority | Purpose |
|-------|----------|---------|
| `rt_modules` | HIGH | Module definitions (weapons, shields, armor, mining lasers, propulsion) |
| `rt_fitted_modules` | HIGH | Modules equipped on specific ships |
| `rt_cargo` | HIGH | Ship cargo contents (items, ore, loot) |
| `rt_hangar_items` | MEDIUM | Station hangar persistent storage |
| `rt_player_wallet` | HIGH | ISK balance + transaction log |
| `rt_trade_history` | MEDIUM | Completed market transactions |
| `rt_skill_definitions` | MEDIUM | Skill tree definitions |
| `rt_kill_mails` | LOW | PvP/PvE kill records |
| `rt_bookmarks` | LOW | Player-saved positions |
| `rt_chat_messages` | LOW | Persistent chat history |
| `rt_missions` | LOW | Agent mission definitions and progress |
| `rt_insurance` | LOW | Ship insurance contracts |
| `rt_loot_tables` | MEDIUM | NPC drop tables |

---

## Asset Pipeline

### [OPEN] 3D ship models (using procedural geometry currently)
- **Files**: `src/engine/rendering/ShipRenderer.ts`
- **Details**: Ships are basic shapes. Need GLTF models per ship type per faction.

### [RESEARCHED] glTF pipeline
- **Details**: Unity→glTF via glTFast, Unreal→glTF via built-in exporter. gltf-transform for Draco compression + KTX2. Free assets: Sketchfab CC0, Kenney.nl, NASA 3D.

### [OPEN] Skybox / Environment maps
- **Details**: Space HDR environment maps for PBR lighting. Procedural or free assets.

### [OPEN] Station 3D models
- **Details**: Different station types (trade hub, military, research) need distinct models.

### [OPEN] Asteroid 3D models
- **Details**: Multiple asteroid variants with different ore type appearances.

---

## Server Handlers Status

### All handlers in SystemRoom.ts (12 total) - DONE

| Handler | Status | Details |
|---------|--------|---------|
| `navigate` | DONE | Approach behavior |
| `warp` | DONE | Aligning state + warp |
| `orbit` | DONE | Orbiting state |
| `attack` | DONE | Attacking state |
| `stop_attack` | DONE | Return to idle |
| `mine` | DONE | Mining state |
| `stop_mine` | DONE | Return to idle |
| `dock` | DONE | Distance check (2500m), docking |
| `undock` | DONE | Undocked state |
| `stop` | DONE | Full stop (zero velocity) |
| `chat` | DONE | Broadcast + log |
| `warp_cross_system` | DONE | Validation, save, transfer |
| `lock_target` | DONE | Server-side validation |
| `unlock_target` | DONE | Remove lock |
| `fleet_command` | DONE | Broadcast to fleet |
| `train_skill` | DONE | Start training |
| `toggle_module` | DONE | Capacitor consumption |
| `market_order` | DONE | Docking requirement check |

### NetworkBridge Message Handlers - ALL DONE (no more stubs)

| Message | Status | Store Action |
|---------|--------|-------------|
| `system_chat` | DONE | addChatMessage |
| `damage` | DONE | addDamageEvent |
| `mining_yield` | DONE | addCargoItem + notification |
| `docking` | DONE | setDockingState + notification |
| `warp_start` | DONE | setWarpActive(true) |
| `warp_end` | DONE | setWarpActive(false) |
| `ship_destroyed` | DONE | notification + CustomEvent for VFX |
| `fleet_update` | DONE | setFleetFormation |
| `target_locked` | DONE | add to lockedTargets |
| `target_lost` | DONE | remove from lockedTargets |
| `skill_update` | DONE | setSkills + setSkillQueue |
| `fitting_update` | DONE | setFitting + setModules |
| `market_update` | DONE | setMarketOrders + setWalletBalance |
| `system_transfer` | DONE | disconnect + CustomEvent |
| `server_error` | DONE | console.error |

---

## Major Gameplay Features (10 features) - DONE

### Tier 0: Infrastructure - DONE

| Item | Status | Files |
|------|--------|-------|
| Item System (rt_items, rt_inventory) | DONE | `src/data/item-definitions.ts`, `server/src/services/inventory-service.ts` |
| Wallet Service (player + corp) | DONE | `server/src/services/wallet-service.ts` |
| Corp Wallet (7 divisions) | DONE | DB: `rt_corp_wallet` |

### Tier 1: Independent Features - DONE

| Item | Status | Files |
|------|--------|-------|
| Corporation System (15 handlers) | DONE | `server/src/handlers/corp-handlers.ts`, `src/components/game/ui/rt/CorpWindow.tsx` |
| Jump Clones | DONE | `server/src/handlers/clone-handlers.ts`, `src/components/game/ui/rt/ClonesWindow.tsx` |
| Implants (attribute + hardwiring + sets) | DONE | `src/data/implant-definitions.ts`, `src/components/game/ui/rt/ImplantsPanel.tsx` |

### Tier 2: Item System Dependants - DONE

| Item | Status | Files |
|------|--------|-------|
| Manufacturing + Research/Invention | DONE | `src/data/blueprint-definitions.ts`, `server/src/systems/industry-ticker.ts`, `src/components/game/ui/rt/IndustryWindow.tsx` |
| Planetary Interaction | DONE | `server/src/systems/pi-ticker.ts`, `src/components/game/ui/rt/PIWindow.tsx` |
| Wormhole Space + Scanning | DONE | `server/src/systems/wormhole-lifecycle.ts`, `server/src/systems/scanning.ts`, `src/components/game/ui/rt/ScannerWindow.tsx` |

### Tier 3: Cross-Dependant Features - DONE

| Item | Status | Files |
|------|--------|-------|
| Contracts System (8 handlers) | DONE | `server/src/handlers/contract-handlers.ts`, `server/src/systems/contract-ticker.ts`, `src/components/game/ui/rt/ContractsWindow.tsx` |
| Sovereignty + Territory | DONE | `server/src/systems/sovereignty-ticker.ts`, `src/components/game/ui/rt/SovereigntyWindow.tsx` |

### Tier 4: Mobile Companion - DONE

| Item | Status | Files |
|------|--------|-------|
| PWA manifest + Service Worker | DONE | `public/manifest.json`, `public/sw.js` |
| Touch Controls (pinch/orbit/tap) | DONE | `src/components/game/3d/rt/TouchControls.tsx` |
| Mobile Window Stack (bottom tabs) | DONE | `src/components/game/ui/rt/MobileWindowStack.tsx` |
| Viewport meta + PWA metadata | DONE | `src/app/layout.tsx` |

### New DB Tables (8 migrations)

| Table | Status | Purpose |
|-------|--------|---------|
| `rt_items` | DONE | Item type definitions |
| `rt_inventory` | DONE | Stacking inventory system |
| `rt_corp_wallet` | DONE | Corporation wallet (7 divisions) |
| `rt_corporations` | DONE | Corporation data |
| `rt_corp_members` | DONE | Corp membership + roles |
| `rt_corp_applications` | DONE | Corp join requests |
| `rt_corp_wallet_journal` | DONE | Corp transaction log |
| `rt_clones` | DONE | Jump + medical clones |
| `rt_implant_types` | DONE | Implant definitions |
| `rt_clone_implants` | DONE | Implants installed in clones |
| `rt_blueprints` | DONE | Player blueprints (BPO/BPC) |
| `rt_blueprint_materials` | DONE | Blueprint material requirements |
| `rt_industry_jobs` | DONE | Manufacturing/research jobs |
| `rt_planet_resources` | DONE | Planet resource distribution |
| `rt_colonies` | DONE | PI colonies |
| `rt_colony_buildings` | DONE | Colony structures |
| `rt_colony_routes` | DONE | PI material routing |
| `rt_colony_storage` | DONE | Colony building storage |
| `rt_wormhole_systems` | DONE | WH class + effects |
| `rt_wormhole_connections` | DONE | WH mass/stage tracking |
| `rt_scan_probes` | DONE | Deployed scan probes |
| `rt_scan_results` | DONE | Cosmic signatures |
| `rt_contracts` | DONE | Player contracts |
| `rt_contract_items` | DONE | Contract item listings |
| `rt_contract_escrow` | DONE | Contract escrow |
| `rt_contract_bids` | DONE | Auction bids |
| `rt_sovereignty` | DONE | System sovereignty + ADM |
| `rt_sovereignty_structures` | DONE | TCU/iHub/etc structures |
| `rt_sovereignty_bonuses` | DONE | Sov upgrade bonuses |
| `rt_push_subscriptions` | DONE | Push notification subscriptions |

### Server Tickers (5 new)

| Ticker | Interval | Files |
|--------|----------|-------|
| Industry | 60s | `server/src/systems/industry-ticker.ts` |
| Planetary Interaction | 60s | `server/src/systems/pi-ticker.ts` |
| Contracts | 5min | `server/src/systems/contract-ticker.ts` |
| Wormhole Lifecycle | 5min | `server/src/systems/wormhole-lifecycle.ts` |
| Sovereignty | 5min | `server/src/systems/sovereignty-ticker.ts` |

### NetworkBridge New Handlers (7)

| Message | Store Action |
|---------|-------------|
| `corp_update` | setCorpData, setCorpMembers, setCorpApplications, setCorpWalletBalances, setCorpWalletJournal |
| `clone_update` | setClones, setMedicalCloneStation, setActiveImplants, setImplantSetBonuses |
| `industry_update` | setBlueprints, setIndustryJobs |
| `pi_update` | setColonies, setColonyBuildings, setColonyRoutes |
| `scan_update` | setScanResults, setScanProbeCount |
| `contract_update` | setBrowseContracts, setMyContracts |
| `sov_update` | setSovereigntyInfo, setSovStructures |

### Neocom Items (8 new)

| ID | Window | Icon | Label |
|----|--------|------|-------|
| corp | rt-corp | 🏢 | Corporation |
| clones | rt-clones | 🧬 | Clones |
| implants | rt-implants | 🧠 | Implants |
| industry | rt-industry | 🏭 | Industry |
| pi | rt-pi | 🌍 | Planets |
| scanner | rt-scanner | 🔍 | Scanner |
| contracts | rt-contracts | 📜 | Contracts |
| sovereignty | rt-sovereignty | ⚔️ | Sovereignty |
