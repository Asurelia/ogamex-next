/**
 * Skill System Core Logic
 * 
 * Ported from C# OGameX.SharedLib.Skills (SkillSystem.cs)
 * Manages skills for a single character: training, queue, validation.
 */

import {
    SkillAttribute,
    SkillInjectionResult,
    SKILL_CONSTANTS,
    type SkillDefinition,
    type CharacterSkill,
    type SkillQueueEntry,
    type CharacterAttributesData,
    type SkillPrerequisite
} from './skill-types'

import * as Formulas from './skill-formulas'

export class SkillSystem {
    private _attributes: CharacterAttributesData
    private _skills: Map<number, CharacterSkill> = new Map()
    private _queue: SkillQueueEntry[] = []
    private _definitions: Map<number, SkillDefinition>

    // Callbacks (can be replaced with an event emitter if needed)
    public onSkillTrained?: (skill: CharacterSkill) => void
    public onSkillInjected?: (skill: CharacterSkill) => void
    public onQueueUpdated?: (queue: SkillQueueEntry[]) => void

    constructor(attributes: CharacterAttributesData, skillDefinitions: Map<number, SkillDefinition>) {
        this._attributes = attributes
        this._definitions = skillDefinitions
    }

    // ====================================================================
    // PROPERTIES
    // ====================================================================

    get skills(): ReadonlyMap<number, CharacterSkill> { return this._skills }
    get queue(): ReadonlyArray<SkillQueueEntry> { return this._queue }
    get attributes(): CharacterAttributesData { return this._attributes }

    get totalSkillPoints(): number {
        let total = 0
        for (const skill of this._skills.values()) {
            total += skill.skillPoints
        }
        return total
    }

    // ====================================================================
    // SP QUERIES
    // ====================================================================

    private getEffectiveAttribute(attr: SkillAttribute): number {
        switch (attr) {
            case SkillAttribute.Charisma: return this._attributes.charisma + this._attributes.charismaBonus
            case SkillAttribute.Intelligence: return this._attributes.intelligence + this._attributes.intelligenceBonus
            case SkillAttribute.Memory: return this._attributes.memory + this._attributes.memoryBonus
            case SkillAttribute.Perception: return this._attributes.perception + this._attributes.perceptionBonus
            case SkillAttribute.Willpower: return this._attributes.willpower + this._attributes.willpowerBonus
            default: return SKILL_CONSTANTS.BASE_ATTRIBUTE_POINTS
        }
    }

    public getSPPerMinute(def: SkillDefinition): number {
        const primary = this.getEffectiveAttribute(def.primaryAttribute)
        const secondary = this.getEffectiveAttribute(def.secondaryAttribute)
        return Formulas.pointsPerMinute(primary, secondary)
    }

    public getCurrentSP(typeID: number, currentTime: number): number {
        const skill = this._skills.get(typeID)
        if (!skill) return 0

        const sp = skill.skillPoints
        if (!skill.isTraining || skill.trainingStartTime <= 0) return sp
        if (skill.trainingStartTime > currentTime) return sp

        const elapsedSeconds = currentTime - skill.trainingStartTime
        const spPerMin = this.getSPPerMinute(skill.definition)
        const delta = Math.floor((elapsedSeconds / 60) * spPerMin)

        return sp + delta
    }

    public getRemainingSP(typeID: number, currentTime: number): number {
        const skill = this._skills.get(typeID)
        if (!skill) return 0
        if (skill.level >= SKILL_CONSTANTS.MAX_SKILL_LEVEL) return 0

        const nextLevelSP = Formulas.pointsAtLevel(skill.level + 1, skill.definition.rank)
        const currentSP = this.getCurrentSP(typeID, currentTime)
        return Math.max(0, nextLevelSP - currentSP)
    }

    public getTrainingTimeSeconds(typeID: number, currentTime: number): number {
        const skill = this._skills.get(typeID)
        if (!skill) return 0

        const remaining = this.getRemainingSP(typeID, currentTime)
        const spPerMin = this.getSPPerMinute(skill.definition)
        return Formulas.trainingTimeSeconds(remaining, spPerMin)
    }

    // ====================================================================
    // SKILL INJECTION
    // ====================================================================

    public injectSkill(typeID: number): SkillInjectionResult {
        const def = this._definitions.get(typeID)
        if (!def) return SkillInjectionResult.LoadFail

        if (this._skills.has(typeID)) return SkillInjectionResult.AlreadyKnown

        if (!this.arePrerequisitesMet(def)) return SkillInjectionResult.PrerequisitesIncomplete

        const skill: CharacterSkill = {
            typeID,
            level: 0,
            skillPoints: 0,
            isTraining: false,
            trainingStartTime: 0,
            definition: def
        }

        this._skills.set(typeID, skill)
        this.onSkillInjected?.(skill)
        return SkillInjectionResult.Success
    }

    // ====================================================================
    // PREREQUISITE CHECKING
    // ====================================================================

    public arePrerequisitesMet(def: SkillDefinition): boolean {
        for (const prereq of def.prerequisites) {
            const charSkill = this._skills.get(prereq.skillTypeID)
            if (!charSkill) return false
            if (charSkill.level < prereq.requiredLevel) return false
        }
        return true
    }

    public canFitModule(moduleRequirements: SkillPrerequisite[]): boolean {
        for (const req of moduleRequirements) {
            const charSkill = this._skills.get(req.skillTypeID)
            if (!charSkill) return false
            if (charSkill.level < req.requiredLevel) return false
        }
        return true
    }

    // ====================================================================
    // SKILL QUEUE
    // ====================================================================

    public addToQueue(typeID: number, targetLevel: number): boolean {
        if (this._queue.length >= SKILL_CONSTANTS.MAX_QUEUE_LENGTH) return false
        if (targetLevel < 1 || targetLevel > SKILL_CONSTANTS.MAX_SKILL_LEVEL) return false

        if (!this._skills.has(typeID) && !this._definitions.has(typeID)) return false

        // Don't add duplicate entries
        if (this._queue.some(q => q.typeID === typeID && q.targetLevel === targetLevel)) return false

        this._queue.push({
            typeID,
            targetLevel,
            startTime: 0,
            endTime: 0
        })

        this.updateQueueTimes(Math.floor(Date.now() / 1000))
        this.onQueueUpdated?.(this._queue)
        return true
    }

    // Replaces current queue (e.g. from UI reorder)
    public saveQueue(entries: { typeID: number, level: number }[]): void {
        this._queue = []
        for (const entry of entries) {
            this._queue.push({
                typeID: entry.typeID,
                targetLevel: entry.level,
                startTime: 0,
                endTime: 0
            })
        }
        this.updateQueueTimes(Math.floor(Date.now() / 1000))
        this.onQueueUpdated?.(this._queue)
    }

    public pauseQueue(currentTime: number): void {
        if (this._queue.length > 0) {
            const front = this._queue[0]
            const skill = this._skills.get(front.typeID)
            if (skill && skill.isTraining) {
                skill.skillPoints = this.getCurrentSP(front.typeID, currentTime)
                skill.isTraining = false
                skill.trainingStartTime = 0
            }
        }
    }

    public resumeQueue(currentTime: number): void {
        if (this._queue.length === 0) return

        const front = this._queue[0]
        const skill = this._skills.get(front.typeID)
        if (skill) {
            skill.isTraining = true
            skill.trainingStartTime = currentTime
        }

        this.updateQueueTimes(currentTime)
    }

    public updateQueueTimes(currentTime: number): void {
        let cursor = currentTime

        for (let i = 0; i < this._queue.length; i++) {
            const entry = this._queue[i]
            const skill = this._skills.get(entry.typeID)
            const def = skill?.definition ?? this._definitions.get(entry.typeID)

            if (!def) continue

            let currentSP = skill?.skillPoints ?? 0

            // If this is the active training skill (first in queue)
            if (i === 0 && skill?.isTraining) {
                const elapsed = currentTime - skill.trainingStartTime
                const spm = this.getSPPerMinute(def)
                currentSP += Math.floor((elapsed / 60) * spm)
            }

            // Calculate training duration
            // For skill levels, we need to handle "from level X to level Y"
            // But simplify here: from current SP to target level SP
            const targetSP = Formulas.pointsAtLevel(entry.targetLevel, def.rank)
            const remainingSP = Math.max(0, targetSP - currentSP)

            const spPerMin = this.getSPPerMinute(def)
            const durationSeconds = Math.ceil((remainingSP / spPerMin) * 60)

            entry.startTime = cursor
            entry.endTime = cursor + durationSeconds

            cursor = entry.endTime
        }
    }

    public getEndOfTraining(): number {
        if (this._queue.length === 0) return 0
        return this._queue[this._queue.length - 1].endTime
    }

    // ====================================================================
    // PROCESS
    // ====================================================================

    public process(currentTime: number): void {
        while (this._queue.length > 0) {
            const front = this._queue[0]
            if (currentTime < front.endTime) break

            // Skill completed
            const skill = this._skills.get(front.typeID)
            if (skill) {
                const targetSP = Formulas.pointsAtLevel(front.targetLevel, skill.definition.rank)
                skill.level = front.targetLevel
                skill.skillPoints = targetSP
                skill.isTraining = false
                skill.trainingStartTime = 0

                this.onSkillTrained?.(skill)
            }

            this._queue.shift() // Remove finished skill

            // Start next skill
            if (this._queue.length > 0) {
                const next = this._queue[0]
                const nextSkill = this._skills.get(next.typeID)
                if (nextSkill) {
                    nextSkill.isTraining = true
                    nextSkill.trainingStartTime = front.endTime // Seamless transition
                }
            }
        }
    }

    // ====================================================================
    // UTILITY
    // ====================================================================

    public getSkillLevel(typeID: number): number {
        return this._skills.get(typeID)?.level ?? 0
    }

    public loadSkill(typeID: number, level: number, skillPoints: number): void {
        const def = this._definitions.get(typeID)
        if (!def) return

        this._skills.set(typeID, {
            typeID,
            level,
            skillPoints,
            isTraining: false,
            trainingStartTime: 0,
            definition: def
        })
    }
}
