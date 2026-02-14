/**
 * OGameX Database Types
 * These types match the Supabase schema exactly
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================================
// ENUMS
// ============================================================================

export type PlanetType = 'planet' | 'moon'
export type CharacterClass = 'collector' | 'general' | 'discoverer' | null
export type MissionType =
  | 'attack'
  | 'acs_attack'
  | 'transport'
  | 'deployment'
  | 'acs_defend'
  | 'espionage'
  | 'colonization'
  | 'recycle'
  | 'moon_destruction'
  | 'expedition'
export type MessageType =
  | 'espionage'
  | 'battle'
  | 'transport'
  | 'expedition'
  | 'alliance'
  | 'player'
  | 'system'

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          username: string
          lang: string
          dark_matter: number
          character_class: CharacterClass
          vacation_mode: boolean
          vacation_mode_until: string | null
          alliance_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          username: string
          lang?: string
          dark_matter?: number
          character_class?: CharacterClass
          vacation_mode?: boolean
          vacation_mode_until?: string | null
          alliance_id?: string | null
        }
        Update: {
          username?: string
          lang?: string
          dark_matter?: number
          character_class?: CharacterClass
          vacation_mode?: boolean
          vacation_mode_until?: string | null
          alliance_id?: string | null
        }
      }

      planets: {
        Row: {
          id: string
          user_id: string
          name: string
          galaxy: number
          system: number
          position: number
          planet_type: PlanetType
          diameter: number
          fields_used: number
          fields_max: number
          temp_min: number
          temp_max: number
          // Resources
          metal: number
          metal_per_hour: number
          metal_max: number
          crystal: number
          crystal_per_hour: number
          crystal_max: number
          deuterium: number
          deuterium_per_hour: number
          deuterium_max: number
          energy_used: number
          energy_max: number
          // Buildings
          metal_mine: number
          crystal_mine: number
          deuterium_synthesizer: number
          solar_plant: number
          fusion_plant: number
          metal_storage: number
          crystal_storage: number
          deuterium_tank: number
          robot_factory: number
          nanite_factory: number
          shipyard: number
          research_lab: number
          terraformer: number
          alliance_depot: number
          missile_silo: number
          space_dock: number
          lunar_base: number
          sensor_phalanx: number
          jump_gate: number
          jump_gate_cooldown: string | null
          // Ships
          light_fighter: number
          heavy_fighter: number
          cruiser: number
          battleship: number
          battlecruiser: number
          bomber: number
          destroyer: number
          deathstar: number
          small_cargo: number
          large_cargo: number
          colony_ship: number
          recycler: number
          espionage_probe: number
          solar_satellite: number
          crawler: number
          reaper: number
          pathfinder: number
          // Defense
          rocket_launcher: number
          light_laser: number
          heavy_laser: number
          gauss_cannon: number
          ion_cannon: number
          plasma_turret: number
          small_shield_dome: number
          large_shield_dome: number
          anti_ballistic_missile: number
          interplanetary_missile: number
          // Timestamps
          last_resource_update: string
          created_at: string
          updated_at: string
          destroyed: boolean
        }
        Insert: Omit<Database['public']['Tables']['planets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['planets']['Insert']>
      }

      user_research: {
        Row: {
          id: string
          user_id: string
          energy_technology: number
          laser_technology: number
          ion_technology: number
          hyperspace_technology: number
          plasma_technology: number
          combustion_drive: number
          impulse_drive: number
          hyperspace_drive: number
          espionage_technology: number
          computer_technology: number
          astrophysics: number
          intergalactic_research_network: number
          graviton_technology: number
          weapons_technology: number
          shielding_technology: number
          armor_technology: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
        }
        Update: Partial<Omit<Database['public']['Tables']['user_research']['Row'], 'id' | 'user_id' | 'created_at'>>
      }

      building_queue: {
        Row: {
          id: string
          planet_id: string
          building_id: number
          target_level: number
          metal_cost: number
          crystal_cost: number
          deuterium_cost: number
          started_at: string
          ends_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['building_queue']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['building_queue']['Insert']>
      }

      research_queue: {
        Row: {
          id: string
          user_id: string
          planet_id: string
          research_id: number
          target_level: number
          metal_cost: number
          crystal_cost: number
          deuterium_cost: number
          started_at: string
          ends_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['research_queue']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['research_queue']['Insert']>
      }

      unit_queue: {
        Row: {
          id: string
          planet_id: string
          unit_id: number
          unit_type: 'ship' | 'defense'
          amount: number
          amount_completed: number
          metal_cost: number
          crystal_cost: number
          deuterium_cost: number
          started_at: string
          ends_at: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['unit_queue']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['unit_queue']['Insert']>
      }

      fleet_missions: {
        Row: {
          id: string
          user_id: string
          origin_planet_id: string
          origin_galaxy: number
          origin_system: number
          origin_position: number
          destination_galaxy: number
          destination_system: number
          destination_position: number
          destination_type: PlanetType
          mission_type: MissionType
          // Ships
          light_fighter: number
          heavy_fighter: number
          cruiser: number
          battleship: number
          battlecruiser: number
          bomber: number
          destroyer: number
          deathstar: number
          small_cargo: number
          large_cargo: number
          colony_ship: number
          recycler: number
          espionage_probe: number
          reaper: number
          pathfinder: number
          // Resources
          metal: number
          crystal: number
          deuterium: number
          // Timing
          departed_at: string
          arrives_at: string
          returns_at: string | null
          // Status
          is_returning: boolean
          processed: boolean
          cancelled: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['fleet_missions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['fleet_missions']['Insert']>
      }

      messages: {
        Row: {
          id: string
          user_id: string
          sender_id: string | null
          type: MessageType
          subject: string
          body: string
          read: boolean
          deleted: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }

      espionage_reports: {
        Row: {
          id: string
          user_id: string
          target_user_id: string
          target_planet_id: string
          resources: Json
          buildings: Json | null
          research: Json | null
          ships: Json | null
          defense: Json | null
          counter_espionage_chance: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['espionage_reports']['Row'], 'id' | 'created_at'>
        Update: never
      }

      battle_reports: {
        Row: {
          id: string
          attacker_id: string
          defender_id: string
          planet_id: string
          coordinates: string
          winner: 'attacker' | 'defender' | 'draw'
          rounds: number
          attacker_losses: number
          defender_losses: number
          loot_metal: number
          loot_crystal: number
          loot_deuterium: number
          debris_metal: number
          debris_crystal: number
          moon_created: boolean
          report_data: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['battle_reports']['Row'], 'id' | 'created_at'>
        Update: never
      }

      alliances: {
        Row: {
          id: string
          name: string
          tag: string
          founder_id: string
          description: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['alliances']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['alliances']['Insert']>
      }

      debris_fields: {
        Row: {
          id: string
          galaxy: number
          system: number
          position: number
          metal: number
          crystal: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['debris_fields']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['debris_fields']['Insert']>
      }

      highscores: {
        Row: {
          id: string
          user_id: string
          total_points: number
          economy_points: number
          research_points: number
          military_points: number
          rank: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['highscores']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['highscores']['Insert']>
      }

      api_tokens: {
        Row: {
          id: string
          user_id: string
          token_hash: string
          name: string
          abilities: Json
          expires_at: string | null
          last_used_at: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          token_hash: string
          name: string
          abilities?: Json
          expires_at?: string | null
        }
        Update: {
          last_used_at?: string
        }
      }
    }

    Views: {
      galaxy_view: {
        Row: {
          galaxy: number
          system: number
          position: number
          planet_id: string | null
          planet_name: string | null
          planet_type: PlanetType | null
          user_id: string | null
          username: string | null
          alliance_tag: string | null
          has_moon: boolean
          debris_metal: number
          debris_crystal: number
        }
      }
    }

    Functions: {
      update_resources: {
        Args: { planet_id: string }
        Returns: void
      }
      process_building_queue: {
        Args: Record<string, never>
        Returns: void
      }
      process_research_queue: {
        Args: Record<string, never>
        Returns: void
      }
      process_fleet_missions: {
        Args: Record<string, never>
        Returns: void
      }
      calculate_highscores: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Commonly used types
export type User = Tables<'users'>
export type Planet = Tables<'planets'>
export type UserResearch = Tables<'user_research'>
export type BuildingQueue = Tables<'building_queue'>
export type ResearchQueue = Tables<'research_queue'>
export type UnitQueue = Tables<'unit_queue'>
export type FleetMission = Tables<'fleet_missions'>
export type Message = Tables<'messages'>
export type EspionageReport = Tables<'espionage_reports'>
export type BattleReport = Tables<'battle_reports'>
export type Alliance = Tables<'alliances'>
export type DebrisField = Tables<'debris_fields'>
export type Highscore = Tables<'highscores'>
