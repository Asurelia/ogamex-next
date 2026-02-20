/**
 * Planetary Interaction Ticker
 *
 * Runs every 60 seconds. Processes extractors, processors, and routes.
 * All persistence via SQLite (persistence.ts).
 */

import {
  getAllColonyBuildings, getColonyStorageQty, setColonyStorage,
  updateColonyStorageQty, updateBuildingCycle, getAllColonyRoutes,
} from '../services/persistence'

// ============================================================================
// PI SCHEMATICS (P0->P1 processing)
// ============================================================================

interface PISchematic {
  id: string
  inputItemTypeId: string
  inputQuantity: number
  outputItemTypeId: string
  outputQuantity: number
  cycleTime: number
}

const PI_SCHEMATICS: PISchematic[] = [
  { id: 'sch_water', inputItemTypeId: 'pi_aqueous_liquids', inputQuantity: 3000, outputItemTypeId: 'pi_water', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_reactive_metals', inputItemTypeId: 'pi_base_metals', inputQuantity: 3000, outputItemTypeId: 'pi_reactive_metals', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_precious_metals', inputItemTypeId: 'pi_noble_metals', inputQuantity: 3000, outputItemTypeId: 'pi_precious_metals', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_toxic_metals', inputItemTypeId: 'pi_heavy_metals', inputQuantity: 3000, outputItemTypeId: 'pi_toxic_metals', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_chiral_structures', inputItemTypeId: 'pi_non_cs_crystals', inputQuantity: 3000, outputItemTypeId: 'pi_chiral_structures', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_plasmoids', inputItemTypeId: 'pi_suspended_plasma', inputQuantity: 3000, outputItemTypeId: 'pi_plasmoids', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_electrolytes', inputItemTypeId: 'pi_ionic_solutions', inputQuantity: 3000, outputItemTypeId: 'pi_electrolytes', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_oxygen', inputItemTypeId: 'pi_noble_gas', inputQuantity: 3000, outputItemTypeId: 'pi_oxygen', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_oxidizing_compound', inputItemTypeId: 'pi_reactive_gas', inputQuantity: 3000, outputItemTypeId: 'pi_oxidizing_compound', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_proteins', inputItemTypeId: 'pi_complex_organisms', inputQuantity: 3000, outputItemTypeId: 'pi_proteins', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_bacteria', inputItemTypeId: 'pi_micro_organisms', inputQuantity: 3000, outputItemTypeId: 'pi_bacteria', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_biomass', inputItemTypeId: 'pi_planktic_colonies', inputQuantity: 3000, outputItemTypeId: 'pi_biomass', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_biofuels', inputItemTypeId: 'pi_carbon_compounds', inputQuantity: 3000, outputItemTypeId: 'pi_biofuels', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_industrial_fibers', inputItemTypeId: 'pi_autotrophs', inputQuantity: 3000, outputItemTypeId: 'pi_industrial_fibers', outputQuantity: 20, cycleTime: 1800 },
  { id: 'sch_silicon', inputItemTypeId: 'pi_felsic_magma', inputQuantity: 3000, outputItemTypeId: 'pi_silicon', outputQuantity: 20, cycleTime: 1800 },

  // P2 schematics
  { id: 'sch_construction_blocks', inputItemTypeId: 'pi_reactive_metals', inputQuantity: 40, outputItemTypeId: 'pi_construction_blocks', outputQuantity: 5, cycleTime: 3600 },
  { id: 'sch_coolant', inputItemTypeId: 'pi_water', inputQuantity: 40, outputItemTypeId: 'pi_coolant', outputQuantity: 5, cycleTime: 3600 },
  { id: 'sch_mechanical_parts', inputItemTypeId: 'pi_reactive_metals', inputQuantity: 40, outputItemTypeId: 'pi_mechanical_parts', outputQuantity: 5, cycleTime: 3600 },
  { id: 'sch_nanites', inputItemTypeId: 'pi_bacteria', inputQuantity: 40, outputItemTypeId: 'pi_nanites', outputQuantity: 5, cycleTime: 3600 },
]

const SCHEMATIC_MAP = new Map<string, PISchematic>()
for (const s of PI_SCHEMATICS) SCHEMATIC_MAP.set(s.id, s)

// ============================================================================
// MAIN TICK
// ============================================================================

export function tickPlanetaryInteraction(): void {
  const nowTs = Math.floor(Date.now() / 1000)

  const buildings = getAllColonyBuildings()
  if (buildings.length === 0) return

  for (const building of buildings) {
    const lastCycle = building.last_cycle_at as number
    const elapsedSeconds = nowTs - lastCycle

    if (elapsedSeconds < (building.cycle_time_seconds as number)) continue

    try {
      if (building.building_type === 'extractor') {
        processExtractor(building, nowTs)
      } else if (['basic_processor', 'advanced_processor', 'hi_tech_processor'].includes(building.building_type as string)) {
        processProcessor(building, nowTs)
      }
    } catch (err) {
      console.error(`[PITicker] Failed to process building ${building.id}:`, err)
    }
  }

  // Process routes (move items between buildings)
  processRoutes()
}

function processExtractor(building: Record<string, unknown>, nowTs: number): void {
  const resourceType = building.resource_type as string
  if (!resourceType) return

  // Extract resources - base yield scaled by abundance
  const baseYield = 100
  setColonyStorage(building.id as string, resourceType, baseYield)
  updateBuildingCycle(building.id as string, nowTs)
}

function processProcessor(building: Record<string, unknown>, nowTs: number): void {
  const schematicId = building.schematic_id as string
  if (!schematicId) return

  const schematic = SCHEMATIC_MAP.get(schematicId)
  if (!schematic) return

  const buildingId = building.id as string

  // Check if input materials are available
  const inputQty = getColonyStorageQty(buildingId, schematic.inputItemTypeId)
  if (inputQty < schematic.inputQuantity) return

  // Consume inputs
  updateColonyStorageQty(buildingId, schematic.inputItemTypeId, inputQty - schematic.inputQuantity)

  // Produce outputs
  const outputQty = getColonyStorageQty(buildingId, schematic.outputItemTypeId)
  setColonyStorage(buildingId, schematic.outputItemTypeId, outputQty + schematic.outputQuantity)

  updateBuildingCycle(buildingId, nowTs)
}

function processRoutes(): void {
  const routes = getAllColonyRoutes()
  if (routes.length === 0) return

  for (const route of routes) {
    const srcId = route.source_building_id as string
    const destId = route.destination_building_id as string
    const itemTypeId = route.item_type_id as string
    const qtyPerCycle = route.quantity_per_cycle as number

    const sourceQty = getColonyStorageQty(srcId, itemTypeId)
    if (sourceQty < qtyPerCycle) continue

    // Move from source to destination
    updateColonyStorageQty(srcId, itemTypeId, sourceQty - qtyPerCycle)
    const destQty = getColonyStorageQty(destId, itemTypeId)
    setColonyStorage(destId, itemTypeId, destQty + qtyPerCycle)
  }
}
