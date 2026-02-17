// =============================================================================
// ShipModuleSystem.cs — Ported from EvEmu ModuleManager.cpp + GenericModule.h
// Source: src/eve-server/ship/modules/ModuleManager.cpp (Allan, 30Mar16)
//         src/eve-server/ship/modules/GenericModule.h
// Port:   C# for OGameX-Next / Unity (Feb 2026)
//
// Manages fitted modules on a ship: slot layout, online/offline, activate/
// deactivate, overload, damage, charges, and fitting validation.
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using OGameX.SharedLib.Dogma;

namespace OGameX.SharedLib.Modules
{
    // =========================================================================
    // Enums
    // =========================================================================

    /// <summary>
    /// Slot bank types (from EVEEffectID in EvEmu).
    /// </summary>
    public enum SlotBank
    {
        High,
        Mid,
        Low,
        Rig,
        SubSystem
    }

    /// <summary>
    /// Module state machine (from Module::State in EvEmu).
    /// </summary>
    public enum ModuleState
    {
        Offline   = 0,
        Online    = 1,
        Activated = 2,
        Overloaded = 3,
        Deactivating = 4
    }

    /// <summary>
    /// Module category (from EVEDB::invCategories + subtypes in EvEmu).
    /// </summary>
    public enum ModuleCategory
    {
        Passive,
        Active,
        Turret,
        Launcher,
        Mining,
        Rig,
        SubSystem,
        SuperWeapon,
        Cyno
    }

    // =========================================================================
    // Module Data
    // =========================================================================

    /// <summary>
    /// Represents a single module fitted to a ship.
    /// Ported from GenericModule in GenericModule.h.
    /// </summary>
    [System.Serializable]
    public class ShipModule
    {
        // --- Identity ---
        public string ModuleId;
        public int TypeId;
        public string TypeName;
        public int GroupId;
        public ModuleCategory Category;

        // --- Slot ---
        public SlotBank SlotBank;
        public int SlotIndex; // 0-7 for Hi/Mid/Low, 0-2 for Rig, 0-4 for SubSystem

        // --- State ---
        public ModuleState State;

        // --- Attributes (from Dogma) ---
        public float HP;
        public float Damage;
        public float CapacitorNeed;
        public float CycleTime;      // duration per cycle in ms
        public float OptimalRange;
        public float Falloff;
        public float TrackingSpeed;
        public float PowergridUsage;
        public float CpuUsage;

        // --- Charge ---
        public ChargeInfo LoadedCharge;
        public bool IsLoaded => LoadedCharge != null;

        // --- Linking (weapon grouping) ---
        public bool IsLinked;
        public bool IsMaster;
        public string LinkedGroupId;

        // --- Overload ---
        public float OverloadDamage;     // heat damage accumulator
        public float OverloadThreshold;  // max heat before burnout

        // --- Computed properties ---
        public bool IsOnline => State >= ModuleState.Online;
        public bool IsActive => State >= ModuleState.Activated;
        public bool IsOverloaded => State == ModuleState.Overloaded;
        public bool IsDamaged => Damage > 0f;
        public bool IsBurntOut => Damage >= HP;
        public bool IsTurret => Category == ModuleCategory.Turret;
        public bool IsLauncher => Category == ModuleCategory.Launcher;
        public bool IsRig => Category == ModuleCategory.Rig;
        public bool IsSubSystem => Category == ModuleCategory.SubSystem;
        public bool IsPassive => Category == ModuleCategory.Passive;
        public bool IsWarpSafe => Category == ModuleCategory.Passive || Category == ModuleCategory.Rig;

        /// <summary>
        /// Apply damage to this module (from hull damage bleed-through).
        /// Ported from ModuleManager::DamageModule().
        /// </summary>
        public bool ApplyDamage(float amount)
        {
            Damage += amount;
            if (Damage >= HP)
            {
                Damage = HP;
                State = ModuleState.Offline;
                return true; // module destroyed / went offline
            }
            return false;
        }

        /// <summary>
        /// Repair module damage.
        /// Ported from ModuleManager::RepairModule().
        /// </summary>
        public void Repair(float amount)
        {
            Damage = Math.Max(0f, Damage - amount);
        }

        /// <summary>
        /// Full repair.
        /// </summary>
        public void RepairFull()
        {
            Damage = 0f;
        }
    }

    /// <summary>
    /// Charge/ammo loaded into a module.
    /// </summary>
    [System.Serializable]
    public class ChargeInfo
    {
        public string ChargeId;
        public int TypeId;
        public string TypeName;
        public int Quantity;
        public int MaxQuantity;
        public float EmDamage;
        public float ThermalDamage;
        public float KineticDamage;
        public float ExplosiveDamage;
    }

    // =========================================================================
    // Slot Layout
    // =========================================================================

    /// <summary>
    /// Ship slot configuration (from ship type attributes).
    /// </summary>
    [System.Serializable]
    public class SlotLayout
    {
        public int HighSlots;
        public int MidSlots;
        public int LowSlots;
        public int RigSlots;
        public int SubSystemSlots;
        public int TurretHardpoints;
        public int LauncherHardpoints;

        public int TotalFittingSlots => HighSlots + MidSlots + LowSlots;
        public int TotalSlots => TotalFittingSlots + RigSlots + SubSystemSlots;

        /// <summary>
        /// Create from ShipAttributes.
        /// </summary>
        public static SlotLayout FromAttributes(ShipAttributes attrs)
        {
            return new SlotLayout
            {
                HighSlots = attrs.HighSlots,
                MidSlots = attrs.MidSlots,
                LowSlots = attrs.LowSlots,
                RigSlots = attrs.RigSlots,
                SubSystemSlots = 0, // T3 only
                TurretHardpoints = attrs.TurretSlots,
                LauncherHardpoints = attrs.LauncherSlots
            };
        }
    }

    // =========================================================================
    // Fitting Validation Result
    // =========================================================================

    /// <summary>
    /// Result of a fitting validation check.
    /// </summary>
    public class FittingValidation
    {
        public bool IsValid;
        public string ErrorMessage;
        public float PowergridUsed;
        public float PowergridAvailable;
        public float CpuUsed;
        public float CpuAvailable;
        public int TurretsUsed;
        public int TurretsAvailable;
        public int LaunchersUsed;
        public int LaunchersAvailable;

        public static FittingValidation Success(float pgUsed, float pgAvail, float cpuUsed, float cpuAvail)
        {
            return new FittingValidation
            {
                IsValid = true,
                PowergridUsed = pgUsed,
                PowergridAvailable = pgAvail,
                CpuUsed = cpuUsed,
                CpuAvailable = cpuAvail
            };
        }

        public static FittingValidation Failure(string error)
        {
            return new FittingValidation { IsValid = false, ErrorMessage = error };
        }
    }

    // =========================================================================
    // Main Module Manager
    // =========================================================================

    /// <summary>
    /// Manages all modules fitted to a ship.
    /// Ported from ModuleManager class in ModuleManager.cpp.
    ///
    /// Key behaviors ported:
    /// - Slot management (Hi×8, Mid×8, Low×8, Rig×3, SubSys×5)
    /// - Module lifecycle: AddModule → Online → Activate → Deactivate → Offline → UnfitModule
    /// - Overload with heat damage accumulation
    /// - Charge (ammo) loading/unloading
    /// - Module damage from hull bleed-through
    /// - Fitting resource validation (PG, CPU, hardpoints)
    /// - Processing order: SubSys → Rig → Low → Mid → High (for proper effect stacking)
    /// </summary>
    public class ShipModuleSystem
    {
        // --- Constants ---
        public const int MaxSlotsPerBank = 8;
        public const int MaxRigSlots = 3;
        public const int MaxSubSystemSlots = 5;

        // --- State ---
        private readonly Dictionary<(SlotBank bank, int index), ShipModule> _modules = new();
        private bool _initialized;
        private SlotLayout _layout;

        /// <summary>Event fired when a module state changes.</summary>
        public event Action<ShipModule, ModuleState, ModuleState> OnModuleStateChanged;
        /// <summary>Event fired when a module is damaged/destroyed.</summary>
        public event Action<ShipModule> OnModuleDamaged;
        /// <summary>Event fired when a module is fitted or removed.</summary>
        public event Action<ShipModule, bool> OnModuleFitChanged; // true = fitted, false = removed

        // =====================================================================
        // Initialization (from ModuleManager::Initialize)
        // =====================================================================

        /// <summary>
        /// Initialize the module system with the ship's slot layout.
        /// Ported from ModuleManager::Initialize().
        /// </summary>
        public void Initialize(SlotLayout layout)
        {
            _layout = layout;
            _modules.Clear();
            _initialized = true;
        }

        /// <summary>
        /// Initialize from ShipAttributes.
        /// </summary>
        public void Initialize(ShipAttributes attrs)
        {
            Initialize(SlotLayout.FromAttributes(attrs));
        }

        // =====================================================================
        // Slot Queries
        // =====================================================================

        /// <summary>Current slot layout.</summary>
        public SlotLayout Layout => _layout;

        /// <summary>
        /// Check if a specific slot is occupied.
        /// Ported from ModuleManager::IsSlotOccupied().
        /// </summary>
        public bool IsSlotOccupied(SlotBank bank, int index) => _modules.ContainsKey((bank, index));

        /// <summary>
        /// Get the module in a specific slot (null if empty).
        /// Ported from ModuleManager::GetModule(flag).
        /// </summary>
        public ShipModule GetModule(SlotBank bank, int index)
        {
            _modules.TryGetValue((bank, index), out var mod);
            return mod;
        }

        /// <summary>
        /// Get a module by its unique ID.
        /// Ported from ModuleManager::GetModule(itemID).
        /// </summary>
        public ShipModule GetModule(string moduleId)
        {
            return _modules.Values.FirstOrDefault(m => m.ModuleId == moduleId);
        }

        /// <summary>
        /// Get all modules in a specific slot bank.
        /// Ported from ModuleManager::GetModulesInBank().
        /// </summary>
        public List<ShipModule> GetModulesInBank(SlotBank bank)
        {
            return _modules
                .Where(kvp => kvp.Key.bank == bank && kvp.Value != null)
                .Select(kvp => kvp.Value)
                .OrderBy(m => m.SlotIndex)
                .ToList();
        }

        /// <summary>All fitted modules across all banks.</summary>
        public IReadOnlyCollection<ShipModule> AllModules => _modules.Values;

        /// <summary>
        /// Find the first available (empty) slot in a bank.
        /// Ported from ModuleManager::GetAvailableSlotInBank().
        /// </summary>
        public int FindAvailableSlot(SlotBank bank)
        {
            int maxSlots = GetMaxSlotsForBank(bank);
            for (int i = 0; i < maxSlots; i++)
            {
                if (!_modules.ContainsKey((bank, i)))
                    return i;
            }
            return -1; // no slots available
        }

        /// <summary>
        /// Get a random fitted module (for hull damage bleed-through).
        /// Ported from ModuleManager::GetRandModule().
        /// </summary>
        public ShipModule GetRandomModule(Random rng = null)
        {
            var fittingMods = _modules.Values
                .Where(m => !m.IsRig && !m.IsSubSystem)
                .ToList();

            if (fittingMods.Count == 0)
                return null;

            rng ??= new Random();
            return fittingMods[rng.Next(fittingMods.Count)];
        }

        // =====================================================================
        // Module Fitting (from ModuleManager::AddModule / UnfitModule)
        // =====================================================================

        /// <summary>
        /// Fit a module into a slot.
        /// Ported from ModuleManager::AddModule().
        /// </summary>
        /// <returns>True if successfully fitted.</returns>
        public bool FitModule(ShipModule module, SlotBank bank, int slotIndex)
        {
            if (!_initialized)
                return false;

            if (slotIndex < 0 || slotIndex >= GetMaxSlotsForBank(bank))
                return false;

            if (IsSlotOccupied(bank, slotIndex))
                return false;

            // Validate hardpoints for turrets/launchers
            if (module.IsTurret && GetFittedCount(ModuleCategory.Turret) >= _layout.TurretHardpoints)
                return false;
            if (module.IsLauncher && GetFittedCount(ModuleCategory.Launcher) >= _layout.LauncherHardpoints)
                return false;

            module.SlotBank = bank;
            module.SlotIndex = slotIndex;
            module.State = ModuleState.Offline;

            _modules[(bank, slotIndex)] = module;
            OnModuleFitChanged?.Invoke(module, true);

            return true;
        }

        /// <summary>
        /// Remove a module from its slot.
        /// Ported from ModuleManager::UnfitModule().
        /// Abort cycle → unload charge → unlink → offline → remove.
        /// </summary>
        public bool UnfitModule(string moduleId)
        {
            var module = GetModule(moduleId);
            if (module == null)
                return false;

            // Deactivate if active
            if (module.IsActive)
                Deactivate(moduleId);

            // Offline
            if (module.IsOnline)
                Offline(moduleId);

            // Remove from slot
            _modules.Remove((module.SlotBank, module.SlotIndex));
            OnModuleFitChanged?.Invoke(module, false);

            return true;
        }

        // =====================================================================
        // Module State Management (from Online/Offline/Activate/Deactivate)
        // =====================================================================

        /// <summary>
        /// Bring a module online.
        /// Ported from ModuleManager::Online().
        /// </summary>
        public bool Online(string moduleId)
        {
            var module = GetModule(moduleId);
            if (module == null || module.IsOnline || module.IsBurntOut)
                return false;

            var oldState = module.State;
            module.State = ModuleState.Online;
            OnModuleStateChanged?.Invoke(module, oldState, ModuleState.Online);
            return true;
        }

        /// <summary>
        /// Take a module offline.
        /// Ported from ModuleManager::Offline().
        /// </summary>
        public bool Offline(string moduleId)
        {
            var module = GetModule(moduleId);
            if (module == null || module.State == ModuleState.Offline)
                return false;

            // Must deactivate first
            if (module.IsActive)
                Deactivate(moduleId);

            var oldState = module.State;
            module.State = ModuleState.Offline;
            OnModuleStateChanged?.Invoke(module, oldState, ModuleState.Offline);
            return true;
        }

        /// <summary>
        /// Activate a module (start cycling).
        /// Ported from ModuleManager::Activate().
        /// Checks: must be online, not warp-locked, not cloaked.
        /// </summary>
        public bool Activate(string moduleId, string targetId = null, int repeat = -1)
        {
            var module = GetModule(moduleId);
            if (module == null || !module.IsOnline || module.IsActive)
                return false;

            if (module.IsPassive || module.IsRig || module.IsSubSystem)
                return false; // passive modules can't be activated

            var oldState = module.State;
            module.State = ModuleState.Activated;
            OnModuleStateChanged?.Invoke(module, oldState, ModuleState.Activated);
            return true;
        }

        /// <summary>
        /// Deactivate a module (stop cycling).
        /// Ported from ModuleManager::Deactivate().
        /// </summary>
        public bool Deactivate(string moduleId)
        {
            var module = GetModule(moduleId);
            if (module == null || !module.IsActive)
                return false;

            var oldState = module.State;
            module.State = ModuleState.Online;
            OnModuleStateChanged?.Invoke(module, oldState, ModuleState.Online);
            return true;
        }

        /// <summary>
        /// Toggle overload on a module.
        /// Ported from ModuleManager::Overload() / DeOverload().
        /// </summary>
        public bool ToggleOverload(string moduleId)
        {
            var module = GetModule(moduleId);
            if (module == null || !module.IsOnline)
                return false;

            var oldState = module.State;
            if (module.IsOverloaded)
            {
                module.State = module.IsActive ? ModuleState.Activated : ModuleState.Online;
            }
            else
            {
                module.State = ModuleState.Overloaded;
            }
            OnModuleStateChanged?.Invoke(module, oldState, module.State);
            return true;
        }

        // =====================================================================
        // Batch Operations (from OnlineAll/OfflineAll/DeactivateAllModules)
        // =====================================================================

        /// <summary>
        /// Online all modules in proper order: SubSys → Rig → Low → Mid → High.
        /// Ported from ModuleManager::OnlineAll() / LoadOnline().
        /// </summary>
        public void OnlineAll()
        {
            // Process in order: SubSystem, Rig, Low, Mid, High
            foreach (var bank in new[] { SlotBank.SubSystem, SlotBank.Rig, SlotBank.Low, SlotBank.Mid, SlotBank.High })
            {
                foreach (var mod in GetModulesInBank(bank))
                {
                    if (!mod.IsOnline && !mod.IsBurntOut)
                        Online(mod.ModuleId);
                }
            }
        }

        /// <summary>
        /// Offline all modules.
        /// Ported from ModuleManager::OfflineAll().
        /// </summary>
        public void OfflineAll()
        {
            foreach (var mod in _modules.Values.ToList())
                Offline(mod.ModuleId);
        }

        /// <summary>
        /// Deactivate all active modules.
        /// Ported from ModuleManager::DeactivateAllModules().
        /// </summary>
        public void DeactivateAll()
        {
            foreach (var mod in _modules.Values.Where(m => m.IsActive).ToList())
                Deactivate(mod.ModuleId);
        }

        // =====================================================================
        // Module Damage (from DamageModule / DamageRandModule)
        // =====================================================================

        /// <summary>
        /// Damage a specific module.
        /// Ported from ModuleManager::DamageModule().
        /// </summary>
        public void DamageModule(string moduleId, float amount)
        {
            var module = GetModule(moduleId);
            if (module == null)
                return;

            bool destroyed = module.ApplyDamage(amount);
            OnModuleDamaged?.Invoke(module);
        }

        /// <summary>
        /// Damage a random fitted module (from hull bleed-through).
        /// Ported from ModuleManager::DamageRandModule().
        /// </summary>
        public void DamageRandomModule(float amount = 1.0f, Random rng = null)
        {
            var module = GetRandomModule(rng);
            if (module != null)
                DamageModule(module.ModuleId, amount);
        }

        /// <summary>
        /// Repair all modules.
        /// Ported from ModuleManager::RepairModules().
        /// </summary>
        public void RepairAllModules()
        {
            foreach (var mod in _modules.Values)
                mod.RepairFull();
        }

        // =====================================================================
        // Charges (from LoadCharge / UnloadCharge)
        // =====================================================================

        /// <summary>
        /// Load a charge into a module.
        /// Ported from GenericModule::LoadCharge() flow.
        /// </summary>
        public bool LoadCharge(string moduleId, ChargeInfo charge)
        {
            var module = GetModule(moduleId);
            if (module == null || module.IsLoaded || module.IsPassive)
                return false;

            module.LoadedCharge = charge;
            return true;
        }

        /// <summary>
        /// Unload a charge from a module.
        /// </summary>
        public ChargeInfo UnloadCharge(string moduleId)
        {
            var module = GetModule(moduleId);
            if (module == null || !module.IsLoaded)
                return null;

            var charge = module.LoadedCharge;
            module.LoadedCharge = null;
            return charge;
        }

        // =====================================================================
        // Fitting Validation
        // =====================================================================

        /// <summary>
        /// Validate the entire fitting against ship resources.
        /// Checks: PG, CPU, turret/launcher hardpoints.
        /// </summary>
        public FittingValidation ValidateFitting(ShipAttributes shipAttrs)
        {
            float totalPG = _modules.Values.Sum(m => m.PowergridUsage);
            float totalCPU = _modules.Values.Sum(m => m.CpuUsage);
            float availPG = shipAttrs.PowerGrid;
            float availCPU = shipAttrs.CPU;

            if (totalPG > availPG)
                return FittingValidation.Failure($"Not enough powergrid: {totalPG:F1}/{availPG:F1} MW");
            if (totalCPU > availCPU)
                return FittingValidation.Failure($"Not enough CPU: {totalCPU:F1}/{availCPU:F1} tf");

            int turrets = GetFittedCount(ModuleCategory.Turret);
            if (turrets > shipAttrs.TurretSlots)
                return FittingValidation.Failure($"Too many turrets: {turrets}/{shipAttrs.TurretSlots}");

            int launchers = GetFittedCount(ModuleCategory.Launcher);
            if (launchers > shipAttrs.LauncherSlots)
                return FittingValidation.Failure($"Too many launchers: {launchers}/{shipAttrs.LauncherSlots}");

            return FittingValidation.Success(totalPG, availPG, totalCPU, availCPU);
        }

        // =====================================================================
        // Helpers
        // =====================================================================

        private int GetMaxSlotsForBank(SlotBank bank) => bank switch
        {
            SlotBank.High      => _layout?.HighSlots ?? MaxSlotsPerBank,
            SlotBank.Mid       => _layout?.MidSlots ?? MaxSlotsPerBank,
            SlotBank.Low       => _layout?.LowSlots ?? MaxSlotsPerBank,
            SlotBank.Rig       => _layout?.RigSlots ?? MaxRigSlots,
            SlotBank.SubSystem => _layout?.SubSystemSlots ?? MaxSubSystemSlots,
            _                  => MaxSlotsPerBank
        };

        private int GetFittedCount(ModuleCategory category)
        {
            return _modules.Values.Count(m => m.Category == category);
        }

        /// <summary>
        /// Summary stats for display.
        /// </summary>
        public (int fitted, int total) GetSlotUsage(SlotBank bank)
        {
            int fitted = _modules.Count(kvp => kvp.Key.bank == bank);
            int total = GetMaxSlotsForBank(bank);
            return (fitted, total);
        }
    }
}
