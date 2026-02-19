# OGameX-Next - Backlog & Issue Tracker

> Auto-updated tracking document for bugs, missing features, optimization opportunities, and technical debt.
> Last updated: 2026-02-20

---

## CRITICAL - Blocking Gameplay

### [BUG-FIXED] registerMessages() never called in SystemRoom.onCreate()
- **Status**: FIXED
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: `registerMessages()` was defined but never called from `onCreate()`. All 13 message handlers (navigate, warp, orbit, attack, mine, dock, undock, stop, chat, warp_cross_system, stop_attack, stop_mine) were dead. Fixed by adding `this.registerMessages()` in `onCreate()`.

### [BUG-FIXED] combat.ts imports from deleted file
- **Status**: FIXED
- **Files**: `server/src/systems/combat.ts`
- **Details**: Imported `DAMAGE_EFFECTIVENESS` from `src/lib/battle/damage-types` which was deleted during cleanup. Fixed by inlining the constant.

### [BUG] Systems registered but game loop may not tick without active Colyseus room
- **Status**: FIXED
- **Files**: `src/engine/EngineController.tsx`, `src/app/game/space/page.tsx`
- **Details**: Systems ARE registered via wrapSystem in EngineController.tsx, 12 systems running.

### [MISSING] No ship spawning on first login
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`, `server/src/db/supabase.ts`
- **Details**: New players need auto-spawn of starter ship (Capsule or faction frigate). `loadOrCreateShip()` exists in supabase.ts but needs verification.

### [MISSING] Combat not usable in-game
- **Status**: PARTIAL
- **Files**: `server/src/systems/combat.ts`, UI missing
- **Details**: Server combat system works with layered damage (shield→armor→hull), faction damage profiles, DPS by ship class. Client SelectedItemWindow has Attack button. Missing: target locking system, damage VFX on 3D scene, weapon range indicators.

### [MISSING] Warp not usable in-game
- **Status**: PARTIAL
- **Files**: `server/src/systems/warp.ts`, `src/engine/systems/NavigationSystem.ts`
- **Details**: Server warp + cross-system warp works. Client has warp button in SelectedItemWindow and cross-system warp in store. Missing: warp tunnel VFX, warp speed HUD indicator.

---

## HIGH - Core Gameplay Loop

### [MISSING] Ship fitting/equipment UI
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/FittingWindow.tsx`
- **Details**: FittingWindow.tsx exists with module slots UI, connected to store. Missing: server-side toggle_module handler, module definitions DB table.
- **DB**: `rt_ship_types` has slot definitions. Need `rt_modules` table.

### [MISSING] Docking/Station interaction
- **Status**: PARTIAL
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: Server dock/undock handlers exist in SystemRoom. SelectedItemWindow has Dock button. Missing: station services UI, repair/market/hangar.
- **DB**: `rt_stations` table exists.

### [MISSING] Mining gameplay
- **Status**: PARTIAL
- **Files**: `src/engine/ai/bt-presets.ts` (miner NPC BT exists)
- **Details**: Server mining system works (range check, yield, asteroid depletion). SelectedItemWindow has Mine button. Missing: cargo tracking for mined ore, mining laser VFX.

### [MISSING] Skill training UI
- **Status**: OPEN
- **Files**: `src/components/game/ui/rt/SkillsWindow.tsx` (stub), `server/src/systems/skill-ticker.ts`
- **Details**: Server skill ticker works. Client window is stub. Need skill tree visualization, queue management.
- **DB**: `rt_character_skills`, `rt_skill_queue`, `rt_character_attributes` exist.

### [MISSING] Market/Trading
- **Status**: OPEN
- **Files**: `src/components/game/ui/rt/MarketWindow.tsx` (stub)
- **Details**: Window stub exists. Server economy system (`server/src/systems/economy.ts`) has order matching.
- **DB**: `rt_market_orders` exists.

---

## MEDIUM - Features & Polish

### [MISSING] Chat system
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/ChatWindow.tsx`
- **Details**: Server handler exists (chat message in SystemRoom), ChatWindow exists with store binding. Missing: channel switching, private messages.

### [MISSING] Fleet manager
- **Status**: OPEN
- **Files**: `src/components/game/ui/rt/FleetManagerWindow.tsx` (stub)
- **Details**: Stub window. Need fleet formation, wing commands, fleet invites.

### [MISSING] Starmap navigation
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/StarmapWindow.tsx`, `src/components/game/ui/rt/Starmap3DWindow.tsx`, `src/components/game/ui/rt/RouteWindow.tsx`
- **Details**: 2D starmap shows system list. 3D starmap renders but not connected to warp system. RouteWindow.tsx and Starmap3DWindow.tsx exist. Need route planning.

### [MISSING] Overview window data
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/OverviewWindow.tsx`
- **Details**: Shows entities from store but may not update in real-time. Need filtering, sorting, distance calculation.

### [MISSING] Selected item info
- **Status**: PARTIAL
- **Files**: `src/components/game/ui/rt/SelectedItemWindow.tsx`
- **Details**: Shows selected entity details but limited. Need orbit/approach/dock/attack action buttons.

### [MISSING] Sound/Music
- **Status**: OPEN
- **Details**: Zero audio. Need ambient space music, UI sounds, combat effects, warp sounds.

### [MISSING] Tutorial/Onboarding
- **Status**: OPEN
- **Details**: New player has no guidance. Need intro sequence, tooltips, mission tutorial.

---

## UI/UX Improvements

### [UX] Neocom icon sizing inconsistent
- **Status**: OPEN
- **Files**: `src/components/game/ui/neocom/Neocom.tsx`
- **Details**: Some icons are emoji, some might need proper SVG icons for consistency.

### [UX] Window positions not persisted
- **Status**: OPEN
- **Files**: `src/components/game/ui/WindowManager.tsx`
- **Details**: Window positions reset on page reload. Should save to localStorage.

### [UX] HUD overlay needs more data
- **Status**: OPEN
- **Files**: `src/components/game/ui/rt/HUDOverlay.tsx`
- **Details**: HUD shows basic info. Need shield/armor/hull bars, speed indicator, capacitor, target lock info.

### [UX] No right-click context menu
- **Status**: OPEN
- **Details**: EVE Online uses right-click extensively. Need context menu on ships, stations, asteroids in 3D view.

---

## Performance & Optimization

### [PERF] SpaceBackground creates 10,000 stars every mount
- **Status**: OPEN
- **Files**: `src/components/game/3d/rt/SpaceBackground.tsx`
- **Details**: `useMemo` prevents re-creation on re-render but not on remount. Could use shared geometry.

### [PERF] AI system runs all NPC BTs on main thread
- **Status**: OPEN
- **Files**: `src/engine/systems/AISystem.ts`
- **Details**: BT evaluation is 2Hz but with many NPCs could still cause frame drops. Consider WebWorker for AI.

### [PERF] No texture compression (KTX2)
- **Status**: OPEN
- **Details**: Ship models/textures not using KTX2 compression. Would reduce VRAM and load times.

### [PERF] LOD system may not be connected
- **Status**: TO VERIFY
- **Files**: `src/engine/systems/LODSystem.ts`
- **Details**: LOD system registered but need to verify it actually swaps geometry/hides distant objects.

### [PERF] Consider WebGPU renderer
- **Status**: RESEARCH
- **Details**: Three.js WebGPU renderer is maturing. Could provide 2-3x performance boost for instanced rendering.

### [PERF] WebGPU Renderer Available
- **Status**: RESEARCHED
- **Details**: Three.js WebGPU renderer production-ready since r171+. ~70% browser support (Chrome 113+, Edge, Opera). Import from `three/webgpu` with automatic WebGL2 fallback. TSL (Three Shading Language) replaces GLSL for custom shaders. Significant performance boost for instanced rendering.

### [PERF] InstancedMesh Optimization Patterns
- **Status**: RESEARCHED
- **Details**: Current InstancedMesh with `frustumCulled=false` is suboptimal. Patterns:
  - Manual per-instance frustum culling with BVH
  - Separate InstancedMesh per LOD level with manual switching
  - BatchedMesh (r155+) for varied geometry (different ship models)
  - GPU-driven culling with compute shaders (WebGPU only)

---

## Security

### [SEC] Supabase leaked password protection disabled
- **Status**: OPEN
- **Details**: Supabase security advisor flags this. Enable in Supabase Auth settings.

### [SEC] No rate limiting on Colyseus messages
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: Clients can spam messages. Need rate limiting on warp/combat/movement commands.

### [SEC] Client-side prediction could be exploited
- **Status**: OPEN
- **Files**: `src/engine/systems/ClientPredictionSystem.ts`
- **Details**: Server should validate all position updates. Speed hacks possible if server trusts client positions.

### [SEC] No input validation on Colyseus commands
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: Message handlers should validate all input types and ranges.

---

## Database

### [DB] Missing tables for full gameplay
- **Status**: OPEN
- **Tables needed**:
  - `rt_modules` - ship module definitions (weapons, shields, armor, mining lasers)
  - `rt_fitted_modules` - modules equipped on ships
  - `rt_cargo` - ship cargo contents
  - `rt_skill_definitions` - skill tree definitions (referenced by skill-ticker but may not exist)
  - `rt_asteroids` - mineable asteroid data per system
  - `rt_chat_messages` - persistent chat history
  - `rt_player_wallet` - ISK/currency balance
  - `rt_trade_history` - completed market transactions

### [DB] Need RLS policies on RT tables
- **Status**: OPEN
- **Details**: RT tables likely have no Row Level Security. Players could read other players' data via Supabase client.

### [DB] No database indexes optimized for queries
- **Status**: TO VERIFY
- **Details**: Check if `rt_ships.system_id`, `rt_ships.owner_id`, `rt_market_orders.item_type_id` have indexes.

---

## Asset Pipeline

### [ASSET] No 3D ship models (using procedural geometry)
- **Status**: OPEN
- **Files**: `src/engine/rendering/ShipRenderer.ts`
- **Details**: Ships are rendered as basic shapes. Need GLTF models per ship type.

### [ASSET] Unity/Unreal asset import pipeline
- **Status**: RESEARCH
- **Details**: Investigate:
  - Unity: Export FBX -> Blender -> glTF 2.0 pipeline
  - Unreal: Export FBX/USD -> Blender -> glTF 2.0
  - Tools: gltf-transform for optimization, KTX2 for textures
  - Sketchfab/TurboSquid for CC0 space assets
  - Consider glTF extensions (KHR_materials_variants for faction skins)

### [ASSET] glTF Pipeline Research Complete
- **Status**: RESEARCHED
- **Details**:
  - **Unity→glTF**: Use glTFast (official Unity package) or UnityGLTF for direct export. Alt: FBX→Blender→glTF.
  - **Unreal→glTF**: UE5 has built-in glTF exporter. Alt: FBX→Blender→glTF.
  - **Optimization**: gltf-transform CLI for Draco mesh compression, texture resize, KTX2 conversion.
  - **KTX2 Textures**: ETC1S for color maps (10:1 ratio), UASTC for normal/data maps (4:1 ratio). 4-8x VRAM reduction.
  - **Free Assets**: Sketchfab CC0 section, Kenney.nl space kit, OpenGameArt, NASA 3D models.
  - **Implementation**: Three.js KTX2Loader + BasisTextureLoader, DRACOLoader for meshes.

### [ASSET] Skybox/Environment maps
- **Status**: OPEN
- **Details**: Need space HDR environment maps for PBR lighting. Could generate procedurally or use free assets.

---

## Missing Server Handlers

### [MISSING] No handler for fleet_command message
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`, `server/src/systems/formations.ts`
- **Details**: Client sends `fleet_command` but server has no handler. formations.ts exists with formation logic.

### [MISSING] No handler for train_skill message
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`, `server/src/systems/skill-ticker.ts`
- **Details**: Client sends `train_skill` but server has no handler. skill-ticker.ts exists.

### [MISSING] No handler for toggle_module message
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`
- **Details**: Client sends `toggle_module` but server has no handler. Need module activation/deactivation logic.

### [MISSING] No handler for market_order message
- **Status**: OPEN
- **Files**: `server/src/rooms/SystemRoom.ts`, `server/src/systems/economy.ts`
- **Details**: Client sends `market_order` but server has no handler. economy.ts has order matching logic.

### [MISSING] No target locking system
- **Status**: OPEN
- **Details**: LockedTargets UI exists in HUDOverlay with shield/armor/hull bars. No server-side lock mechanism (scan resolution timing, max targets). Need lock_target/unlock_target messages.

---

## Possible Future Additions

### [IDEA] Planetary interaction (PI)
- **Details**: EVE-style planet resource extraction. Would need planet UI, resource chains.

### [IDEA] Corporation system
- **Details**: Player organizations with shared hangars, taxes, structures.

### [IDEA] Sovereignty/Territory control
- **Details**: Alliances claiming systems. Would need sovereignty structures, timers.

### [IDEA] Wormhole space
- **Details**: Randomly connecting systems with temporary wormholes. Adds exploration risk/reward.

### [IDEA] Mobile app companion
- **Details**: React Native app for skill queue management, market orders, chat.
