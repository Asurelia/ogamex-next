import { SkillSystem } from './skill-system'
import { RESEARCH_IDS } from '../research-ids'
import type { TechLevels } from '../types'
// We might need AdvancedTechLevels from battle-types or similar if defined there
// But for now we stick to the core TechLevels needed for basic battle

/**
 * Extracts combat-relevant tech levels from a SkillSystem instance.
 * @param skillSystem The character's skill system
 * @returns TechLevels object for battle engine
 */
export function getCombatTechLevels(skillSystem: SkillSystem): TechLevels {
    return {
        weaponsTech: skillSystem.getSkillLevel(RESEARCH_IDS.WEAPONS_TECH),
        shieldTech: skillSystem.getSkillLevel(RESEARCH_IDS.SHIELDING_TECH),
        armorTech: skillSystem.getSkillLevel(RESEARCH_IDS.ARMOR_TECH),
    }
}

/**
 * Advanced Tech Levels for the full battle engine
 */
export interface AdvancedTechLevels extends TechLevels {
    energyTech: number
    laserTech: number
    ionTech: number
    plasmaTech: number
    hyperspaceTech: number
    combustionTech: number
    impulseTech: number
    hyperspaceDriveTech: number
}

/**
 * Extracts full advanced tech levels for the battle engine
 */
export function getAdvancedCombatTechLevels(skillSystem: SkillSystem): AdvancedTechLevels {
    return {
        // Base
        weaponsTech: skillSystem.getSkillLevel(RESEARCH_IDS.WEAPONS_TECH),
        shieldTech: skillSystem.getSkillLevel(RESEARCH_IDS.SHIELDING_TECH),
        armorTech: skillSystem.getSkillLevel(RESEARCH_IDS.ARMOR_TECH),

        // Drives
        combustionTech: skillSystem.getSkillLevel(RESEARCH_IDS.COMBUSTION_DRIVE),
        impulseTech: skillSystem.getSkillLevel(RESEARCH_IDS.IMPULSE_DRIVE),
        hyperspaceDriveTech: skillSystem.getSkillLevel(RESEARCH_IDS.HYPERSPACE_DRIVE),

        // Advanced Weaponry & Tech
        energyTech: 0, // Not commonly a direct combat skill in standard OGame, but maybe Energy Tech (113)?
        laserTech: skillSystem.getSkillLevel(RESEARCH_IDS.LASER_TECH),
        ionTech: skillSystem.getSkillLevel(RESEARCH_IDS.ION_TECH),
        plasmaTech: skillSystem.getSkillLevel(RESEARCH_IDS.PLASMA_TECH),
        hyperspaceTech: 0, // Hyperspace Tech (114)
    }
}

