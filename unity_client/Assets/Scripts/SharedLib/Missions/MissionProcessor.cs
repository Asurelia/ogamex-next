// =============================================================================
// MissionProcessor.cs — Main dispatcher for fleet mission processing
// Port of: src/lib/missions/MissionProcessor.ts
// Namespace: OGameX.SharedLib.Missions
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Missions
{
    /// <summary>
    /// Main mission processing dispatcher.
    /// 
    /// Handles:
    /// - Handler registration for each mission type
    /// - Dispatching to appropriate mission handlers
    /// - Processing mission arrivals and returns
    /// - Error handling and logging
    /// 
    /// DB operations (fetch missions, send messages, etc.) are virtual
    /// so the Unity game layer can provide concrete implementations.
    /// </summary>
    public class MissionProcessor
    {
        private readonly Dictionary<MissionType, IMissionHandler> _handlers = new();
        private readonly MissionProcessorOptions _options;

        public MissionProcessor(MissionProcessorOptions? options = null)
        {
            _options = options ?? new MissionProcessorOptions();
        }

        // =====================================================================
        // HANDLER REGISTRATION
        // =====================================================================

        /// <summary>Register a mission handler.</summary>
        public void RegisterHandler(IMissionHandler handler)
        {
            _handlers[handler.HandlerMissionType] = handler;
        }

        /// <summary>Get handler for a specific mission type.</summary>
        public IMissionHandler? GetHandler(MissionType missionType)
        {
            return _handlers.TryGetValue(missionType, out var handler) ? handler : null;
        }

        /// <summary>Check if a mission type has a registered handler.</summary>
        public bool HasHandler(MissionType missionType)
        {
            return _handlers.ContainsKey(missionType);
        }

        /// <summary>Get list of registered mission types.</summary>
        public List<MissionType> GetRegisteredMissionTypes()
        {
            return _handlers.Keys.ToList();
        }

        // =====================================================================
        // PROCESS SINGLE MISSION
        // =====================================================================

        /// <summary>
        /// Process a single mission with its pre-built context.
        /// Dispatches to arrival or return based on IsReturning flag.
        /// </summary>
        public MissionProcessResult ProcessMission(FleetMission mission, MissionContext context)
        {
            var errors = new List<MissionError>();

            var handler = GetHandler(mission.MissionTypeValue);
            if (handler == null)
            {
                errors.Add(new MissionError
                {
                    MissionId = mission.Id,
                    MissionTypeValue = mission.MissionTypeValue,
                    ErrorMessage = $"No handler registered for mission type: {mission.MissionTypeValue}",
                    Timestamp = DateTime.UtcNow,
                });
                return new MissionProcessResult
                {
                    Success = false,
                    ProcessedCount = 0,
                    Errors = errors,
                };
            }

            try
            {
                if (mission.IsReturning)
                {
                    ProcessReturn(handler, context);
                }
                else
                {
                    ProcessArrival(handler, context, mission);
                }

                return new MissionProcessResult
                {
                    Success = true,
                    ProcessedCount = 1,
                    Errors = errors,
                };
            }
            catch (Exception ex)
            {
                errors.Add(new MissionError
                {
                    MissionId = mission.Id,
                    MissionTypeValue = mission.MissionTypeValue,
                    ErrorMessage = ex.Message,
                    Timestamp = DateTime.UtcNow,
                });
                return new MissionProcessResult
                {
                    Success = false,
                    ProcessedCount = 0,
                    Errors = errors,
                };
            }
        }

        // =====================================================================
        // BATCH PROCESSING
        // =====================================================================

        /// <summary>
        /// Process a batch of missions with their pre-built contexts.
        /// </summary>
        public MissionProcessResult ProcessBatch(
            List<(FleetMission Mission, MissionContext Context)> missions)
        {
            var errors = new List<MissionError>();
            int processedCount = 0;

            // Limit to batch size
            var batch = missions.Take(_options.BatchSize).ToList();

            foreach (var (mission, context) in batch)
            {
                try
                {
                    var handler = GetHandler(mission.MissionTypeValue);
                    if (handler == null)
                    {
                        errors.Add(new MissionError
                        {
                            MissionId = mission.Id,
                            MissionTypeValue = mission.MissionTypeValue,
                            ErrorMessage = $"No handler registered for mission type: {mission.MissionTypeValue}",
                            Timestamp = DateTime.UtcNow,
                        });

                        if (!_options.ContinueOnError) break;
                        continue;
                    }

                    if (mission.IsReturning)
                    {
                        ProcessReturn(handler, context);
                    }
                    else
                    {
                        ProcessArrival(handler, context, mission);
                    }

                    processedCount++;
                }
                catch (Exception ex)
                {
                    errors.Add(new MissionError
                    {
                        MissionId = mission.Id,
                        MissionTypeValue = mission.MissionTypeValue,
                        ErrorMessage = ex.Message,
                        Timestamp = DateTime.UtcNow,
                    });

                    if (!_options.ContinueOnError) break;
                }
            }

            return new MissionProcessResult
            {
                Success = errors.Count == 0,
                ProcessedCount = processedCount,
                Errors = errors,
            };
        }

        // =====================================================================
        // ARRIVAL / RETURN PROCESSING
        // =====================================================================

        /// <summary>
        /// Process mission arrival. Calls handler and collects results.
        /// </summary>
        private void ProcessArrival(
            IMissionHandler handler,
            MissionContext context,
            FleetMission originalMission)
        {
            var result = handler.ProcessArrival(context);

            if (!result.Success)
            {
                throw new InvalidOperationException(
                    result.Error ?? "Mission arrival processing failed");
            }

            // Mark mission as processed
            OnMissionProcessed(originalMission.Id);

            // Create return mission if needed
            if (result.ShouldReturn && handler.HasReturn)
            {
                var returnMission = CreateReturnMissionData(
                    originalMission,
                    result.ReturnResources,
                    result.ReturnShips);
                OnReturnMissionCreated(returnMission);
            }

            // Send messages
            foreach (var message in result.Messages)
            {
                OnMessageSent(message);
            }

            // Apply updates
            foreach (var update in result.Updates)
            {
                OnUpdateApplied(update);
            }
        }

        /// <summary>
        /// Process mission return. Calls handler and collects results.
        /// </summary>
        private void ProcessReturn(
            IMissionHandler handler,
            MissionContext context)
        {
            var result = handler.ProcessReturn(context);

            if (!result.Success)
            {
                throw new InvalidOperationException(
                    result.Error ?? "Mission return processing failed");
            }

            // Mark mission as processed
            OnMissionProcessed(context.Mission.Id);

            // Send messages
            foreach (var message in result.Messages)
            {
                OnMessageSent(message);
            }

            // Apply updates
            foreach (var update in result.Updates)
            {
                OnUpdateApplied(update);
            }
        }

        // =====================================================================
        // RETURN MISSION CREATION
        // =====================================================================

        /// <summary>Create return mission data with coordinate swap and timing.</summary>
        private FleetMission CreateReturnMissionData(
            FleetMission original,
            Resources resources,
            ShipCounts ships)
        {
            var now = _options.CurrentTime;
            var oneWayDuration = original.ArrivesAt - original.DepartedAt;
            var returnArrival = now + oneWayDuration;

            return new FleetMission
            {
                UserId = original.UserId,
                OriginPlanetId = original.OriginPlanetId,
                // Swap coordinates
                OriginGalaxy = original.DestinationGalaxy,
                OriginSystem = original.DestinationSystem,
                OriginPosition = original.DestinationPosition,
                DestinationGalaxy = original.OriginGalaxy,
                DestinationSystem = original.OriginSystem,
                DestinationPosition = original.OriginPosition,
                DestinationType = PlanetType.Planet,
                MissionTypeValue = original.MissionTypeValue,
                Ships = ships.Clone(),
                CargoResources = resources.Clone(),
                DepartedAt = now,
                ArrivesAt = returnArrival,
                ReturnsAt = null,
                IsReturning = true,
                Processed = false,
                Cancelled = false,
            };
        }

        // =====================================================================
        // VIRTUAL HOOKS — Override in Unity game layer
        // =====================================================================

        /// <summary>Called when a mission has been processed (mark in DB).</summary>
        protected virtual void OnMissionProcessed(string missionId)
        {
            // Override to mark mission as processed in your data store
        }

        /// <summary>Called when a return mission should be created (insert to DB).</summary>
        protected virtual void OnReturnMissionCreated(FleetMission returnMission)
        {
            // Override to insert return mission into your data store
        }

        /// <summary>Called when a message should be sent to a player.</summary>
        protected virtual void OnMessageSent(MissionMessage message)
        {
            // Override to insert message into your data store
        }

        /// <summary>Called when an update should be applied to a target entity.</summary>
        protected virtual void OnUpdateApplied(MissionUpdate update)
        {
            // Override to apply update to your data store
        }
    }
}
