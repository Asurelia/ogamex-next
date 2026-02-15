/**
 * CartographyService
 *
 * Service for managing Data Cards, inventory, and the market system.
 * Handles card creation, usage, trading, and vault operations.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  CardRarity,
  CardType,
  CartographyItem,
  InventoryItem,
  PlayerVault,
  MarketListing,
  MarketBid,
  CardCreationQueueItem,
  PlayerDiscovery,
  DataCardPayload,
  CARD_CREATION_COSTS,
  STAR_TYPE_RARITY,
  CreateDataCardResponse,
  UseDataCardResponse,
  ListMarketRequest,
  CreateListingRequest,
  VaultUpgradeResponse,
} from './types'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateCardName(cardType: CardType, starType: string, galaxyIndex: number, systemIndex: number): string {
  const typeNames: Record<CardType, string> = {
    system_map: 'Carte Système',
    galaxy_map: 'Carte Galactique',
    resource_map: 'Carte Ressources',
    route_map: 'Carte Route',
    wormhole_map: 'Carte Trou de Ver',
    special_map: 'Carte Spéciale'
  }

  const starNames: Record<string, string> = {
    black_hole: 'Trou Noir',
    neutron_star: 'Étoile à Neutrons',
    white_giant: 'Géante Blanche',
    blue_giant: 'Géante Bleue',
    red_giant: 'Géante Rouge',
    white_dwarf: 'Naine Blanche',
    binary_mixed: 'Binaire Mixte',
    binary_yellow: 'Binaire Jaune',
    binary_red: 'Binaire Rouge',
    orange_dwarf: 'Naine Orange',
    yellow_dwarf: 'Naine Jaune',
    red_dwarf: 'Naine Rouge'
  }

  return `${typeNames[cardType]} - ${starNames[starType] || starType} [${galaxyIndex}:${systemIndex}]`
}

function generateCardDescription(cardType: CardType, rarity: CardRarity, specialFeatures: string[]): string {
  const rarityDesc: Record<CardRarity, string> = {
    common: 'Une carte basique',
    uncommon: 'Une carte peu commune',
    rare: 'Une carte rare',
    epic: 'Une carte épique',
    legendary: 'Une carte légendaire'
  }

  let desc = `${rarityDesc[rarity]} contenant des données d'exploration.`

  if (specialFeatures.length > 0) {
    desc += ` Caractéristiques spéciales: ${specialFeatures.join(', ')}.`
  }

  return desc
}

// ============================================================================
// CARTOGRAPHY SERVICE
// ============================================================================

export class CartographyService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // ==========================================================================
  // DATA CARD CREATION
  // ==========================================================================

  /**
   * Start creating a Data Card from a mapped discovery
   */
  async createDataCard(
    userId: string,
    discoveryId: string,
    cardType: CardType
  ): Promise<CreateDataCardResponse> {
    // 1. Get the discovery and verify it's mapped
    const { data: discovery, error: discoveryError } = await this.supabase
      .from('player_discoveries')
      .select(`
        *,
        solar_system:solar_systems(
          id,
          galaxy_id,
          system_index,
          star_type,
          secondary_star_type
        )
      `)
      .eq('id', discoveryId)
      .eq('user_id', userId)
      .single()

    if (discoveryError || !discovery) {
      return { success: false, error: 'Discovery not found' }
    }

    if (discovery.discovery_level !== 'mapped') {
      return { success: false, error: 'Discovery must be at "mapped" level to create a card' }
    }

    // 2. Get galaxy info
    const { data: galaxy } = await this.supabase
      .from('galaxies')
      .select('galaxy_index')
      .eq('id', discovery.solar_system.galaxy_id)
      .single()

    const galaxyIndex = galaxy?.galaxy_index || 0
    const systemIndex = discovery.solar_system.system_index

    // 3. Determine card rarity based on star type
    const starType = discovery.solar_system.star_type
    const starTypeRarity = (await import('./types')).STAR_TYPE_RARITY
    const rarity: CardRarity = starTypeRarity[starType] || 'common'

    // 4. Get creation cost
    const creationCosts = (await import('./types')).CARD_CREATION_COSTS
    const cost = creationCosts[rarity]

    // 5. Check if user has enough resources
    const { data: planet, error: planetError } = await this.supabase
      .from('planets')
      .select('resources')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (planetError || !planet) {
      return { success: false, error: 'No planet found' }
    }

    const resources = planet.resources as { metal: number; crystal: number; deuterium: number }
    const { data: user } = await this.supabase
      .from('users')
      .select('dark_matter')
      .eq('id', userId)
      .single()

    const darkMatter = user?.dark_matter || 0

    if (
      resources.metal < cost.metal ||
      resources.crystal < cost.crystal ||
      resources.deuterium < cost.deuterium ||
      darkMatter < cost.dark_matter
    ) {
      return { success: false, error: 'Not enough resources' }
    }

    // 6. Check if there's already a card being created from this discovery
    const { data: existingQueue } = await this.supabase
      .from('card_creation_queue')
      .select('id')
      .eq('discovery_id', discoveryId)
      .eq('status', 'in_progress')
      .single()

    if (existingQueue) {
      return { success: false, error: 'A card is already being created from this discovery' }
    }

    // 7. Deduct resources
    const newResources = {
      metal: resources.metal - cost.metal,
      crystal: resources.crystal - cost.crystal,
      deuterium: resources.deuterium - cost.deuterium
    }

    const { error: resourceError } = await this.supabase
      .from('planets')
      .update({ resources: newResources })
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)

    if (resourceError) {
      return { success: false, error: 'Failed to deduct resources' }
    }

    // Deduct dark matter if needed
    if (cost.dark_matter > 0) {
      await this.supabase
        .from('users')
        .update({ dark_matter: darkMatter - cost.dark_matter })
        .eq('id', userId)
    }

    // 8. Create queue item
    const completesAt = new Date(Date.now() + cost.time_seconds * 1000).toISOString()

    const { data: queueItem, error: queueError } = await this.supabase
      .from('card_creation_queue')
      .insert({
        user_id: userId,
        discovery_id: discoveryId,
        card_type: cardType,
        target_rarity: rarity,
        cost_metal: cost.metal,
        cost_crystal: cost.crystal,
        cost_deuterium: cost.deuterium,
        cost_dark_matter: cost.dark_matter,
        completes_at: completesAt
      })
      .select()
      .single()

    if (queueError || !queueItem) {
      // Refund resources on failure
      await this.supabase
        .from('planets')
        .update({ resources })
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)

      return { success: false, error: 'Failed to queue card creation' }
    }

    return {
      success: true,
      queueItem: this.mapQueueItem(queueItem),
      estimatedCompletion: completesAt
    }
  }

  /**
   * Complete a card creation from the queue
   */
  async completeCardCreation(queueItemId: string): Promise<{ success: boolean; card?: CartographyItem; error?: string }> {
    // 1. Get queue item
    const { data: queueItem, error: queueError } = await this.supabase
      .from('card_creation_queue')
      .select(`
        *,
        discovery:player_discoveries(
          *,
          solar_system:solar_systems(
            id,
            galaxy_id,
            system_index,
            star_type,
            secondary_star_type
          )
        )
      `)
      .eq('id', queueItemId)
      .eq('status', 'in_progress')
      .single()

    if (queueError || !queueItem) {
      return { success: false, error: 'Queue item not found or already completed' }
    }

    // 2. Check if completion time has passed
    if (new Date(queueItem.completes_at) > new Date()) {
      return { success: false, error: 'Card is not ready yet' }
    }

    // 3. Get galaxy info
    const { data: galaxy } = await this.supabase
      .from('galaxies')
      .select('galaxy_index')
      .eq('id', queueItem.discovery.solar_system.galaxy_id)
      .single()

    const galaxyIndex = galaxy?.galaxy_index || 0
    const systemIndex = queueItem.discovery.solar_system.system_index
    const starType = queueItem.discovery.solar_system.star_type

    // 4. Determine special features
    const specialFeatures: string[] = []
    if (starType === 'black_hole') specialFeatures.push('black_hole')
    if (starType === 'neutron_star') specialFeatures.push('neutron_star')
    if (queueItem.discovery.solar_system.secondary_star_type) {
      specialFeatures.push('binary_system')
    }

    // 5. Create the card
    const cardName = generateCardName(
      queueItem.card_type,
      starType,
      galaxyIndex,
      systemIndex
    )
    const cardDescription = generateCardDescription(
      queueItem.card_type,
      queueItem.target_rarity,
      specialFeatures
    )

    const dataPayload: DataCardPayload = {
      systems: [queueItem.discovery.solar_system.id],
      galaxyIndex,
      quality: queueItem.discovery.scan_quality || 100,
      specialFeatures
    }

    const { data: card, error: cardError } = await this.supabase
      .from('cartography_items')
      .insert({
        owner_id: queueItem.user_id,
        card_type: queueItem.card_type,
        rarity: queueItem.target_rarity,
        name: cardName,
        description: cardDescription,
        data_payload: dataPayload,
        created_by: queueItem.user_id,
        created_from_discovery_id: queueItem.discovery_id,
        creation_cost: {
          metal: queueItem.cost_metal,
          crystal: queueItem.cost_crystal,
          deuterium: queueItem.cost_deuterium,
          dark_matter: queueItem.cost_dark_matter,
          time_seconds: Math.floor((new Date(queueItem.completes_at).getTime() - new Date(queueItem.started_at).getTime()) / 1000)
        }
      })
      .select()
      .single()

    if (cardError || !card) {
      return { success: false, error: 'Failed to create card' }
    }

    // 6. Add to inventory
    const { error: inventoryError } = await this.supabase
      .from('player_inventory')
      .insert({
        user_id: queueItem.user_id,
        item_type: 'data_card',
        item_id: card.id,
        quantity: 1,
        acquired_via: 'craft'
      })

    if (inventoryError) {
      // Delete the card if inventory insert fails
      await this.supabase.from('cartography_items').delete().eq('id', card.id)
      return { success: false, error: 'Failed to add card to inventory' }
    }

    // 7. Update queue item
    await this.supabase
      .from('card_creation_queue')
      .update({
        status: 'completed',
        created_card_id: card.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', queueItemId)

    return {
      success: true,
      card: this.mapCartographyItem(card)
    }
  }

  /**
   * Get cards being created
   */
  async getCardCreationQueue(userId: string): Promise<CardCreationQueueItem[]> {
    const { data, error } = await this.supabase
      .from('card_creation_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('completes_at', { ascending: true })

    if (error || !data) return []
    return data.map(this.mapQueueItem)
  }

  // ==========================================================================
  // DATA CARD USAGE
  // ==========================================================================

  /**
   * Use a Data Card to reveal systems
   */
  async useDataCard(userId: string, cardId: string): Promise<UseDataCardResponse> {
    // 1. Get the card from inventory
    const { data: inventoryItem, error: inventoryError } = await this.supabase
      .from('player_inventory')
      .select(`
        *,
        card:cartography_items(*)
      `)
      .eq('user_id', userId)
      .eq('item_type', 'data_card')
      .eq('item_id', cardId)
      .eq('storage_location', 'inventory')
      .single()

    if (inventoryError || !inventoryItem?.card) {
      return { success: false, error: 'Card not found in inventory' }
    }

    const card = inventoryItem.card
    if (card.is_consumed) {
      return { success: false, error: 'Card has already been used' }
    }

    // 2. Check for expiration (wormhole maps)
    const payload = card.data_payload as DataCardPayload
    if (payload.expiresAt && new Date(payload.expiresAt) < new Date()) {
      return { success: false, error: 'Card has expired' }
    }

    // 3. Create discoveries for all systems in the card
    const discoveries: PlayerDiscovery[] = []
    const systemIds = payload.systems || []

    for (const systemId of systemIds) {
      // Check if user already has this discovery
      const { data: existingDiscovery } = await this.supabase
        .from('player_discoveries')
        .select('id, discovery_level')
        .eq('user_id', userId)
        .eq('solar_system_id', systemId)
        .single()

      if (existingDiscovery) {
        // Upgrade discovery level if card provides better data
        const levelOrder = ['detected', 'scanned', 'explored', 'mapped']
        const currentLevel = levelOrder.indexOf(existingDiscovery.discovery_level)
        const cardLevel = levelOrder.indexOf('explored') // Cards provide explored level

        if (cardLevel > currentLevel) {
          const { data: updated, error: updateError } = await this.supabase
            .from('player_discoveries')
            .update({
              discovery_level: 'explored',
              scan_quality: Math.max(payload.quality, 80),
              last_scanned_at: new Date().toISOString()
            })
            .eq('id', existingDiscovery.id)
            .select()
            .single()

          if (!updateError && updated) {
            discoveries.push(this.mapDiscovery(updated))
          }
        }
      } else {
        // Create new discovery
        const { data: newDiscovery, error: discoveryError } = await this.supabase
          .from('player_discoveries')
          .insert({
            user_id: userId,
            solar_system_id: systemId,
            discovery_level: 'explored',
            discovered_via: 'data_card',
            scan_quality: payload.quality
          })
          .select()
          .single()

        if (!discoveryError && newDiscovery) {
          discoveries.push(this.mapDiscovery(newDiscovery))
        }
      }
    }

    // 4. Mark card as consumed
    await this.supabase
      .from('cartography_items')
      .update({
        is_consumed: true,
        consumed_by: userId,
        consumed_at: new Date().toISOString()
      })
      .eq('id', cardId)

    // 5. Remove from inventory
    await this.supabase
      .from('player_inventory')
      .delete()
      .eq('id', inventoryItem.id)

    return {
      success: true,
      discoveries
    }
  }

  // ==========================================================================
  // INVENTORY MANAGEMENT
  // ==========================================================================

  /**
   * Get player inventory
   */
  async getInventory(
    userId: string,
    options: { itemType?: string; location?: string } = {}
  ): Promise<InventoryItem[]> {
    let query = this.supabase
      .from('player_inventory')
      .select(`
        *,
        card:cartography_items(*)
      `)
      .eq('user_id', userId)

    if (options.itemType) {
      query = query.eq('item_type', options.itemType)
    }
    if (options.location) {
      query = query.eq('storage_location', options.location)
    }

    const { data, error } = await query.order('acquired_at', { ascending: false })

    if (error || !data) return []
    return data.map(this.mapInventoryItem)
  }

  /**
   * Get a specific inventory item
   */
  async getInventoryItem(userId: string, itemId: string): Promise<InventoryItem | null> {
    const { data, error } = await this.supabase
      .from('player_inventory')
      .select(`
        *,
        card:cartography_items(*)
      `)
      .eq('user_id', userId)
      .eq('id', itemId)
      .single()

    if (error || !data) return null
    return this.mapInventoryItem(data)
  }

  // ==========================================================================
  // VAULT OPERATIONS
  // ==========================================================================

  /**
   * Get player vault
   */
  async getVault(userId: string): Promise<PlayerVault | null> {
    const { data, error } = await this.supabase
      .from('player_vault')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      // Create vault if it doesn't exist
      const { data: newVault, error: createError } = await this.supabase
        .from('player_vault')
        .insert({ user_id: userId })
        .select()
        .single()

      if (createError || !newVault) return null
      return this.mapVault(newVault)
    }

    return this.mapVault(data)
  }

  /**
   * Deposit item to vault
   */
  async depositToVault(userId: string, inventoryItemId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Get vault
    const vault = await this.getVault(userId)
    if (!vault) {
      return { success: false, error: 'Vault not found' }
    }

    // 2. Check capacity
    if (vault.usedSlots >= vault.maxSlots) {
      return { success: false, error: 'Vault is full' }
    }

    // 3. Update item location
    const { error } = await this.supabase
      .from('player_inventory')
      .update({ storage_location: 'vault' })
      .eq('id', inventoryItemId)
      .eq('user_id', userId)
      .eq('storage_location', 'inventory')

    if (error) {
      return { success: false, error: 'Failed to deposit item' }
    }

    return { success: true }
  }

  /**
   * Withdraw item from vault
   */
  async withdrawFromVault(userId: string, inventoryItemId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase
      .from('player_inventory')
      .update({ storage_location: 'inventory' })
      .eq('id', inventoryItemId)
      .eq('user_id', userId)
      .eq('storage_location', 'vault')

    if (error) {
      return { success: false, error: 'Failed to withdraw item' }
    }

    return { success: true }
  }

  /**
   * Upgrade vault
   */
  async upgradeVault(userId: string): Promise<VaultUpgradeResponse> {
    // 1. Get vault and upgrade cost
    const vault = await this.getVault(userId)
    if (!vault) {
      return { success: false, error: 'Vault not found' }
    }

    const cost = vault.nextUpgradeCost

    // 2. Check resources
    const { data: planet } = await this.supabase
      .from('planets')
      .select('resources')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!planet) {
      return { success: false, error: 'No planet found' }
    }

    const resources = planet.resources as { metal: number; crystal: number; deuterium: number }
    if (
      resources.metal < cost.metal ||
      resources.crystal < cost.crystal ||
      resources.deuterium < cost.deuterium
    ) {
      return { success: false, error: 'Not enough resources' }
    }

    // 3. Deduct resources
    const newResources = {
      metal: resources.metal - cost.metal,
      crystal: resources.crystal - cost.crystal,
      deuterium: resources.deuterium - cost.deuterium
    }

    const { error: resourceError } = await this.supabase
      .from('planets')
      .update({ resources: newResources })
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)

    if (resourceError) {
      return { success: false, error: 'Failed to deduct resources' }
    }

    // 4. Upgrade vault
    const newLevel = vault.vaultLevel + 1
    const newMaxSlots = vault.maxSlots + cost.slots_gained

    // Calculate next upgrade cost
    const multiplier = Math.pow(1.5, newLevel)
    const nextUpgradeCost = {
      metal: Math.floor(10000 * multiplier),
      crystal: Math.floor(5000 * multiplier),
      deuterium: Math.floor(2000 * multiplier),
      slots_gained: 5
    }

    const { error: upgradeError } = await this.supabase
      .from('player_vault')
      .update({
        vault_level: newLevel,
        max_slots: newMaxSlots,
        next_upgrade_cost: nextUpgradeCost,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (upgradeError) {
      // Refund resources
      await this.supabase
        .from('planets')
        .update({ resources })
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(1)

      return { success: false, error: 'Failed to upgrade vault' }
    }

    return {
      success: true,
      newLevel,
      newMaxSlots,
      nextUpgradeCost
    }
  }

  // ==========================================================================
  // MARKET OPERATIONS
  // ==========================================================================

  /**
   * Get market listings
   */
  async getMarketListings(options: ListMarketRequest = {}): Promise<{ listings: MarketListing[]; total: number }> {
    let query = this.supabase
      .from('market_listings')
      .select(`
        *,
        seller:users!seller_id(username),
        item:player_inventory(
          *,
          card:cartography_items(*)
        )
      `, { count: 'exact' })
      .eq('status', 'active')

    if (options.itemType) {
      query = query.eq('item_type', options.itemType)
    }
    if (options.rarity) {
      query = query.eq('item_rarity', options.rarity)
    }
    if (options.priceType) {
      query = query.eq('price_type', options.priceType)
    }
    if (options.maxPriceMetal) {
      query = query.lte('price_metal', options.maxPriceMetal)
    }

    // Sorting
    switch (options.sortBy) {
      case 'price_asc':
        query = query.order('price_metal', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price_metal', { ascending: false })
        break
      case 'newest':
        query = query.order('listed_at', { ascending: false })
        break
      case 'ending_soon':
        query = query.order('expires_at', { ascending: true })
        break
      default:
        query = query.order('listed_at', { ascending: false })
    }

    // Pagination
    const page = options.page || 1
    const limit = options.limit || 20
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error || !data) {
      return { listings: [], total: 0 }
    }

    return {
      listings: data.map(this.mapMarketListing),
      total: count || 0
    }
  }

  /**
   * Create a market listing
   */
  async createListing(userId: string, request: CreateListingRequest): Promise<{ success: boolean; listing?: MarketListing; error?: string }> {
    // 1. Get inventory item
    const { data: inventoryItem, error: inventoryError } = await this.supabase
      .from('player_inventory')
      .select(`
        *,
        card:cartography_items(*)
      `)
      .eq('id', request.inventoryItemId)
      .eq('user_id', userId)
      .eq('storage_location', 'inventory')
      .single()

    if (inventoryError || !inventoryItem) {
      return { success: false, error: 'Item not found in inventory' }
    }

    // 2. Check if item is tradeable (for cards)
    if (inventoryItem.card && !inventoryItem.card.is_tradeable) {
      return { success: false, error: 'This item cannot be traded' }
    }

    // 3. Calculate expiration
    const expiresAt = new Date(Date.now() + request.durationHours * 60 * 60 * 1000).toISOString()

    // 4. Update inventory item location
    const { error: updateError } = await this.supabase
      .from('player_inventory')
      .update({ storage_location: 'market' })
      .eq('id', request.inventoryItemId)

    if (updateError) {
      return { success: false, error: 'Failed to update inventory' }
    }

    // 5. Create listing
    const { data: listing, error: listingError } = await this.supabase
      .from('market_listings')
      .insert({
        seller_id: userId,
        inventory_item_id: request.inventoryItemId,
        item_type: inventoryItem.item_type,
        item_rarity: inventoryItem.card?.rarity || null,
        price_type: request.priceType,
        price_metal: request.priceMetal,
        price_crystal: request.priceCrystal,
        price_deuterium: request.priceDeuterium,
        price_dark_matter: request.priceDarkMatter || 0,
        min_bid_increment: request.minBidIncrement || 100,
        expires_at: expiresAt
      })
      .select(`
        *,
        seller:users!seller_id(username),
        item:player_inventory(
          *,
          card:cartography_items(*)
        )
      `)
      .single()

    if (listingError || !listing) {
      // Revert inventory location
      await this.supabase
        .from('player_inventory')
        .update({ storage_location: 'inventory' })
        .eq('id', request.inventoryItemId)

      return { success: false, error: 'Failed to create listing' }
    }

    return {
      success: true,
      listing: this.mapMarketListing(listing)
    }
  }

  /**
   * Buy a fixed-price listing
   */
  async buyListing(userId: string, listingId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Get listing
    const { data: listing, error: listingError } = await this.supabase
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .eq('status', 'active')
      .eq('price_type', 'fixed')
      .single()

    if (listingError || !listing) {
      return { success: false, error: 'Listing not found or not available' }
    }

    if (listing.seller_id === userId) {
      return { success: false, error: 'Cannot buy your own listing' }
    }

    // 2. Check buyer resources
    const { data: buyerPlanet } = await this.supabase
      .from('planets')
      .select('resources')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (!buyerPlanet) {
      return { success: false, error: 'No planet found' }
    }

    const resources = buyerPlanet.resources as { metal: number; crystal: number; deuterium: number }
    const { data: buyer } = await this.supabase
      .from('users')
      .select('dark_matter')
      .eq('id', userId)
      .single()

    const darkMatter = buyer?.dark_matter || 0

    if (
      resources.metal < listing.price_metal ||
      resources.crystal < listing.price_crystal ||
      resources.deuterium < listing.price_deuterium ||
      darkMatter < listing.price_dark_matter
    ) {
      return { success: false, error: 'Not enough resources' }
    }

    // 3. Transfer resources to seller
    const newBuyerResources = {
      metal: resources.metal - listing.price_metal,
      crystal: resources.crystal - listing.price_crystal,
      deuterium: resources.deuterium - listing.price_deuterium
    }

    const { error: buyerResourceError } = await this.supabase
      .from('planets')
      .update({ resources: newBuyerResources })
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)

    if (buyerResourceError) {
      return { success: false, error: 'Failed to deduct resources' }
    }

    // Deduct dark matter if needed
    if (listing.price_dark_matter > 0) {
      await this.supabase
        .from('users')
        .update({ dark_matter: darkMatter - listing.price_dark_matter })
        .eq('id', userId)
    }

    // Add resources to seller
    const { data: sellerPlanet } = await this.supabase
      .from('planets')
      .select('resources')
      .eq('user_id', listing.seller_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (sellerPlanet) {
      const sellerResources = sellerPlanet.resources as { metal: number; crystal: number; deuterium: number }
      const newSellerResources = {
        metal: sellerResources.metal + listing.price_metal,
        crystal: sellerResources.crystal + listing.price_crystal,
        deuterium: sellerResources.deuterium + listing.price_deuterium
      }

      await this.supabase
        .from('planets')
        .update({ resources: newSellerResources })
        .eq('user_id', listing.seller_id)
        .order('created_at', { ascending: true })
        .limit(1)
    }

    // Add dark matter to seller
    if (listing.price_dark_matter > 0) {
      const { data: seller } = await this.supabase
        .from('users')
        .select('dark_matter')
        .eq('id', listing.seller_id)
        .single()

      if (seller) {
        await this.supabase
          .from('users')
          .update({ dark_matter: (seller.dark_matter || 0) + listing.price_dark_matter })
          .eq('id', listing.seller_id)
      }
    }

    // 4. Transfer item to buyer
    await this.supabase
      .from('player_inventory')
      .update({
        user_id: userId,
        storage_location: 'inventory'
      })
      .eq('id', listing.inventory_item_id)

    // Update card owner if it's a data card
    const { data: inventoryItem } = await this.supabase
      .from('player_inventory')
      .select('item_id, item_type')
      .eq('id', listing.inventory_item_id)
      .single()

    if (inventoryItem?.item_type === 'data_card' && inventoryItem.item_id) {
      await this.supabase
        .from('cartography_items')
        .update({ owner_id: userId })
        .eq('id', inventoryItem.item_id)
    }

    // 5. Update listing
    await this.supabase
      .from('market_listings')
      .update({
        status: 'sold',
        buyer_id: userId,
        sold_at: new Date().toISOString(),
        final_price: {
          metal: listing.price_metal,
          crystal: listing.price_crystal,
          deuterium: listing.price_deuterium,
          dark_matter: listing.price_dark_matter
        }
      })
      .eq('id', listingId)

    return { success: true }
  }

  /**
   * Cancel a listing
   */
  async cancelListing(userId: string, listingId: string): Promise<{ success: boolean; error?: string }> {
    // 1. Get listing
    const { data: listing, error } = await this.supabase
      .from('market_listings')
      .select('*')
      .eq('id', listingId)
      .eq('seller_id', userId)
      .eq('status', 'active')
      .single()

    if (error || !listing) {
      return { success: false, error: 'Listing not found' }
    }

    // 2. Return item to inventory
    await this.supabase
      .from('player_inventory')
      .update({ storage_location: 'inventory' })
      .eq('id', listing.inventory_item_id)

    // 3. Cancel listing
    await this.supabase
      .from('market_listings')
      .update({ status: 'cancelled' })
      .eq('id', listingId)

    return { success: true }
  }

  // ==========================================================================
  // MAPPING FUNCTIONS
  // ==========================================================================

  private mapCartographyItem(data: any): CartographyItem {
    return {
      id: data.id,
      ownerId: data.owner_id,
      cardType: data.card_type,
      rarity: data.rarity,
      name: data.name,
      description: data.description,
      dataPayload: data.data_payload,
      createdBy: data.created_by,
      createdAt: data.created_at,
      createdFromDiscoveryId: data.created_from_discovery_id,
      creationCost: data.creation_cost,
      isConsumed: data.is_consumed,
      consumedBy: data.consumed_by,
      consumedAt: data.consumed_at,
      isTradeable: data.is_tradeable,
      tradeRestrictions: data.trade_restrictions
    }
  }

  private mapInventoryItem(data: any): InventoryItem {
    return {
      id: data.id,
      userId: data.user_id,
      itemType: data.item_type,
      itemId: data.item_id,
      quantity: data.quantity,
      acquiredAt: data.acquired_at,
      acquiredVia: data.acquired_via,
      storageLocation: data.storage_location,
      dataCard: data.card ? this.mapCartographyItem(data.card) : undefined
    }
  }

  private mapVault(data: any): PlayerVault {
    return {
      id: data.id,
      userId: data.user_id,
      maxSlots: data.max_slots,
      usedSlots: data.used_slots,
      vaultLevel: data.vault_level,
      nextUpgradeCost: data.next_upgrade_cost,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapMarketListing(data: any): MarketListing {
    return {
      id: data.id,
      sellerId: data.seller_id,
      sellerUsername: data.seller?.username,
      inventoryItemId: data.inventory_item_id,
      itemType: data.item_type,
      itemRarity: data.item_rarity,
      priceType: data.price_type,
      priceMetal: Number(data.price_metal),
      priceCrystal: Number(data.price_crystal),
      priceDeuterium: Number(data.price_deuterium),
      priceDarkMatter: data.price_dark_matter,
      currentBid: Number(data.current_bid),
      currentBidderId: data.current_bidder_id,
      minBidIncrement: Number(data.min_bid_increment),
      listedAt: data.listed_at,
      expiresAt: data.expires_at,
      status: data.status,
      buyerId: data.buyer_id,
      soldAt: data.sold_at,
      finalPrice: data.final_price,
      item: data.item ? this.mapInventoryItem(data.item) : undefined
    }
  }

  private mapQueueItem(data: any): CardCreationQueueItem {
    return {
      id: data.id,
      userId: data.user_id,
      discoveryId: data.discovery_id,
      cardType: data.card_type,
      targetRarity: data.target_rarity,
      costMetal: Number(data.cost_metal),
      costCrystal: Number(data.cost_crystal),
      costDeuterium: Number(data.cost_deuterium),
      costDarkMatter: data.cost_dark_matter,
      startedAt: data.started_at,
      completesAt: data.completes_at,
      status: data.status,
      createdCardId: data.created_card_id,
      completedAt: data.completed_at
    }
  }

  private mapDiscovery(data: any): PlayerDiscovery {
    return {
      id: data.id,
      userId: data.user_id,
      solarSystemId: data.solar_system_id,
      discoveryLevel: data.discovery_level,
      discoveredAt: data.discovered_at,
      discoveredVia: data.discovered_via,
      scanQuality: data.scan_quality,
      isFirstDiscoverer: data.is_first_discoverer,
      lastScannedAt: data.last_scanned_at
    }
  }
}
