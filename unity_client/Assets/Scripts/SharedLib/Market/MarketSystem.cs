// ============================================================================
// MarketSystem.cs — Ported from EvEmu market/MarketMgr.cpp + EvEMath.cpp
//
// Player-driven market: buy/sell orders, order matching, fees, price history.
// ============================================================================

using System;
using System.Collections.Generic;
using System.Linq;

namespace OGameX.SharedLib.Market
{
    // ========================================================================
    // CONSTANTS
    // ========================================================================
    public static class MarketConstants
    {
        public const float BaseCommission = 0.01f;          // 1% base broker fee
        public const float BaseSalesTax = 0.02f;            // 2% base sales tax
        public const int DefaultOrderDuration = 90;          // days
        public const int MinOrderDuration = 1;
        public const int MaxOrderDuration = 365;

        // Skill-based order count: 5 + Trade*4 + Retail*8 + Wholesale*16 + Tycoon*32
        public const int BaseOrderCount = 5;
        public const int TradePerLevel = 4;
        public const int RetailPerLevel = 8;
        public const int WholesalePerLevel = 16;
        public const int TycoonPerLevel = 32;

        // Margin trading escrow: cost * 0.75^level
        public const float MarginTradingBase = 0.75f;
    }

    // ========================================================================
    // ENUMS
    // ========================================================================
    public enum OrderType
    {
        Buy = 0,
        Sell = 1
    }

    public enum OrderState
    {
        Open = 0,
        Fulfilled = 1,
        Expired = 2,
        Cancelled = 3
    }

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    /// <summary>
    /// A market order — buy or sell.
    /// Source: MarketDB order structure
    /// </summary>
    public class MarketOrder
    {
        public long OrderID;
        public int CharacterID;
        public int CorporationID;
        public OrderType Type;
        public OrderState State;
        public int TypeID;                   // item type being traded
        public int RegionID;                 // market region scope
        public int StationID;               // order location
        public float Price;
        public int VolumeTotal;              // original quantity
        public int VolumeRemaining;          // unfilled quantity
        public int MinVolume = 1;            // minimum fill quantity (buy orders)
        public int Duration;                 // days until expiry
        public long IssuedTimestamp;
        public long ExpiryTimestamp;
        public bool IsCorp;                  // corp order
        public float Escrow;                // ISK held in escrow (buy orders)
    }

    /// <summary>
    /// Price history entry for a type in a region.
    /// Source: MarketMgr::UpdatePriceHistory
    /// </summary>
    public struct PriceHistoryEntry
    {
        public long Timestamp;               // day
        public float Average;
        public float High;
        public float Low;
        public int Volume;                   // units traded
        public int OrderCount;
    }

    /// <summary>
    /// Player market skill levels for fee/limit calculations.
    /// </summary>
    public class MarketSkills
    {
        public int Trade;
        public int Retail;
        public int Wholesale;
        public int Tycoon;
        public int Accounting;
        public int BrokerRelations;
        public int MarginTrading;
        public int Marketing;               // sell order range
        public int Procurement;             // buy order range
        public int Visibility;              // order visibility range
        public int Daytrading;              // modify range
    }

    // ========================================================================
    // MARKET FORMULAS — from EvEMath::Market namespace
    // ========================================================================

    /// <summary>
    /// Market fee and limit calculations.
    /// Source: EvEMath.cpp Market namespace + MarketMgr.h Python comments
    /// </summary>
    public static class MarketFormulas
    {
        /// <summary>
        /// Broker fee for placing an order.
        /// Formula: max(0.01 * (1 - 0.05*brSkill) * 2^(-2*wStanding) * orderValue, 100)
        /// wStanding = (0.7*factionStanding + 0.3*corpStanding) / 10
        /// Source: EvEMath::Market::BrokerFee
        /// </summary>
        public static float BrokerFee(int brokerRelationsLevel, float factionStanding,
                                       float corpStanding, float orderValue)
        {
            float wStanding = (0.7f * factionStanding + 0.3f * corpStanding) / 10.0f;
            float fee = 0.01f * (1.0f - 0.05f * brokerRelationsLevel) *
                        (float)Math.Pow(2, -2 * wStanding);
            return Math.Max(fee * orderValue, 100.0f);
        }

        /// <summary>
        /// Relist fee when modifying an existing order.
        /// Source: EvEMath::Market::RelistFee
        /// </summary>
        public static float RelistFee(float oldPrice, float newPrice,
                                       float brokerPercent = 0.01f, float discount = 0f)
        {
            return Math.Max(0, brokerPercent * (newPrice - oldPrice))
                   + (1 - discount) * brokerPercent * newPrice;
        }

        /// <summary>
        /// Sales tax applied when a sell order is filled.
        /// Formula: baseTax * (1 - 0.1 * accountingLevel)
        /// Source: EvEMath::Market::SalesTax
        /// </summary>
        public static float SalesTax(float baseSalesTax, int accountingLevel)
        {
            float maximumTax = baseSalesTax / 100.0f;
            float tax = maximumTax * (1 - 0.1f * accountingLevel);
            return Math.Min(tax, maximumTax);
        }

        /// <summary>
        /// Maximum number of active orders for a character.
        /// Formula: 5 + Trade*4 + Retail*8 + Wholesale*16 + Tycoon*32
        /// Source: MarketMgr.h Python comments (GetSkillLimits)
        /// </summary>
        public static int MaxOrderCount(MarketSkills skills)
        {
            return MarketConstants.BaseOrderCount
                 + skills.Trade * MarketConstants.TradePerLevel
                 + skills.Retail * MarketConstants.RetailPerLevel
                 + skills.Wholesale * MarketConstants.WholesalePerLevel
                 + skills.Tycoon * MarketConstants.TycoonPerLevel;
        }

        /// <summary>
        /// Escrow required for margin trading buy orders.
        /// Formula: orderCost * 0.75^marginTradingLevel
        /// Source: MarketMgr.h Python comments
        /// </summary>
        public static float MarginTradingEscrow(float orderCost, int marginTradingLevel)
        {
            return orderCost * (float)Math.Pow(MarketConstants.MarginTradingBase, marginTradingLevel);
        }
    }

    // ========================================================================
    // MARKET SYSTEM — main logic
    // ========================================================================

    /// <summary>
    /// Manages the player market: orders, matching, history.
    /// Source: EvEmu market/MarketMgr.cpp + MarketProxyService.cpp
    /// </summary>
    public class MarketSystem
    {
        private readonly Dictionary<long, MarketOrder> _orders = new();
        private readonly Dictionary<(int regionID, int typeID), List<PriceHistoryEntry>> _priceHistory = new();
        private long _nextOrderID = 1;

        // Events
        public event Action<MarketOrder> OnOrderPlaced;
        public event Action<MarketOrder, int /*qtyFilled*/> OnOrderFilled;
        public event Action<MarketOrder> OnOrderCancelled;
        public event Action<MarketOrder> OnOrderExpired;

        // ====================================================================
        // ORDER QUERIES
        // ====================================================================

        /// <summary>Get all sell orders for a type in a region, lowest price first.</summary>
        public List<MarketOrder> GetSellOrders(int regionID, int typeID)
        {
            return _orders.Values
                .Where(o => o.RegionID == regionID && o.TypeID == typeID &&
                            o.Type == OrderType.Sell && o.State == OrderState.Open)
                .OrderBy(o => o.Price)
                .ToList();
        }

        /// <summary>Get all buy orders for a type in a region, highest price first.</summary>
        public List<MarketOrder> GetBuyOrders(int regionID, int typeID)
        {
            return _orders.Values
                .Where(o => o.RegionID == regionID && o.TypeID == typeID &&
                            o.Type == OrderType.Buy && o.State == OrderState.Open)
                .OrderByDescending(o => o.Price)
                .ToList();
        }

        /// <summary>Get orders by character.</summary>
        public List<MarketOrder> GetCharacterOrders(int characterID)
        {
            return _orders.Values
                .Where(o => o.CharacterID == characterID && o.State == OrderState.Open)
                .ToList();
        }

        /// <summary>Get price history for a type in a region.</summary>
        public List<PriceHistoryEntry> GetPriceHistory(int regionID, int typeID)
        {
            return _priceHistory.GetValueOrDefault((regionID, typeID)) ?? new();
        }

        // ====================================================================
        // PLACE ORDERS
        // ====================================================================

        /// <summary>
        /// Place a sell order. Returns order ID, or -1 on failure.
        /// Source: MarketMgr::ExecuteSellOrder path (order creation)
        /// </summary>
        public long PlaceSellOrder(int characterID, int typeID, int regionID, int stationID,
                                    float price, int quantity, int duration, MarketSkills skills,
                                    float factionStanding = 0, float corpStanding = 0)
        {
            // Check order limit
            int activeOrders = GetCharacterOrders(characterID).Count;
            if (activeOrders >= MarketFormulas.MaxOrderCount(skills))
                return -1;

            // Calculate broker fee
            float brokerFee = MarketFormulas.BrokerFee(skills.BrokerRelations,
                factionStanding, corpStanding, price * quantity);

            var order = new MarketOrder
            {
                OrderID = _nextOrderID++,
                CharacterID = characterID,
                Type = OrderType.Sell,
                State = OrderState.Open,
                TypeID = typeID,
                RegionID = regionID,
                StationID = stationID,
                Price = price,
                VolumeTotal = quantity,
                VolumeRemaining = quantity,
                Duration = duration,
                IssuedTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                ExpiryTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + duration * 86400L,
            };

            _orders[order.OrderID] = order;
            OnOrderPlaced?.Invoke(order);

            // Try immediate matching against existing buy orders
            TryMatchSellOrder(order);

            return order.OrderID;
        }

        /// <summary>
        /// Place a buy order. Returns order ID, or -1 on failure.
        /// Source: MarketMgr::ExecuteBuyOrder path (order creation)
        /// </summary>
        public long PlaceBuyOrder(int characterID, int typeID, int regionID, int stationID,
                                   float price, int quantity, int duration, int minVolume,
                                   MarketSkills skills,
                                   float factionStanding = 0, float corpStanding = 0)
        {
            int activeOrders = GetCharacterOrders(characterID).Count;
            if (activeOrders >= MarketFormulas.MaxOrderCount(skills))
                return -1;

            float totalCost = price * quantity;
            float escrow = MarketFormulas.MarginTradingEscrow(totalCost, skills.MarginTrading);

            var order = new MarketOrder
            {
                OrderID = _nextOrderID++,
                CharacterID = characterID,
                Type = OrderType.Buy,
                State = OrderState.Open,
                TypeID = typeID,
                RegionID = regionID,
                StationID = stationID,
                Price = price,
                VolumeTotal = quantity,
                VolumeRemaining = quantity,
                MinVolume = Math.Max(1, minVolume),
                Duration = duration,
                IssuedTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                ExpiryTimestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds() + duration * 86400L,
                Escrow = escrow,
            };

            _orders[order.OrderID] = order;
            OnOrderPlaced?.Invoke(order);

            // Try immediate matching against existing sell orders
            TryMatchBuyOrder(order);

            return order.OrderID;
        }

        // ====================================================================
        // ORDER MATCHING — from MarketMgr::ExecuteBuyOrder / ExecuteSellOrder
        // ====================================================================

        private void TryMatchSellOrder(MarketOrder sellOrder)
        {
            var buyOrders = GetBuyOrders(sellOrder.RegionID, sellOrder.TypeID);

            foreach (var buy in buyOrders)
            {
                if (sellOrder.VolumeRemaining <= 0) break;
                if (buy.Price < sellOrder.Price) break;     // no match at this price
                if (sellOrder.VolumeRemaining < buy.MinVolume) continue;

                int fillQty = Math.Min(sellOrder.VolumeRemaining, buy.VolumeRemaining);
                ExecuteTrade(buy, sellOrder, fillQty, buy.Price);
            }
        }

        private void TryMatchBuyOrder(MarketOrder buyOrder)
        {
            var sellOrders = GetSellOrders(buyOrder.RegionID, buyOrder.TypeID);

            foreach (var sell in sellOrders)
            {
                if (buyOrder.VolumeRemaining <= 0) break;
                if (sell.Price > buyOrder.Price) break;      // no match at this price

                int fillQty = Math.Min(buyOrder.VolumeRemaining, sell.VolumeRemaining);
                ExecuteTrade(buyOrder, sell, fillQty, sell.Price);
            }
        }

        /// <summary>
        /// Execute a trade between a buy and sell order.
        /// Source: MarketMgr::ExecuteBuyOrder / ExecuteSellOrder
        /// </summary>
        private void ExecuteTrade(MarketOrder buyOrder, MarketOrder sellOrder, int quantity, float price)
        {
            buyOrder.VolumeRemaining -= quantity;
            sellOrder.VolumeRemaining -= quantity;

            OnOrderFilled?.Invoke(buyOrder, quantity);
            OnOrderFilled?.Invoke(sellOrder, quantity);

            // Check if fully filled
            if (buyOrder.VolumeRemaining <= 0)
                buyOrder.State = OrderState.Fulfilled;
            if (sellOrder.VolumeRemaining <= 0)
                sellOrder.State = OrderState.Fulfilled;

            // Record price history
            RecordTrade(buyOrder.RegionID, buyOrder.TypeID, price, quantity);
        }

        // ====================================================================
        // ORDER MANAGEMENT
        // ====================================================================

        /// <summary>Cancel an order.</summary>
        public bool CancelOrder(long orderID, int characterID)
        {
            if (!_orders.TryGetValue(orderID, out var order)) return false;
            if (order.CharacterID != characterID) return false;
            if (order.State != OrderState.Open) return false;

            order.State = OrderState.Cancelled;
            OnOrderCancelled?.Invoke(order);
            return true;
        }

        /// <summary>
        /// Modify order price (incurs relist fee).
        /// Source: MarketMgr::SendOnOwnOrderChanged
        /// </summary>
        public float ModifyOrderPrice(long orderID, int characterID, float newPrice, int brokerLevel)
        {
            if (!_orders.TryGetValue(orderID, out var order)) return -1;
            if (order.CharacterID != characterID) return -1;
            if (order.State != OrderState.Open) return -1;

            float relistFee = MarketFormulas.RelistFee(order.Price, newPrice);
            order.Price = newPrice;
            return relistFee;
        }

        // ====================================================================
        // PRICE HISTORY
        // ====================================================================

        private void RecordTrade(int regionID, int typeID, float price, int quantity)
        {
            var key = (regionID, typeID);
            if (!_priceHistory.ContainsKey(key))
                _priceHistory[key] = new List<PriceHistoryEntry>();

            var today = DateTimeOffset.UtcNow.Date;
            long dayTimestamp = new DateTimeOffset(today, TimeSpan.Zero).ToUnixTimeSeconds();
            var history = _priceHistory[key];

            // Update today's entry or create new
            if (history.Count > 0 && history[^1].Timestamp == dayTimestamp)
            {
                var entry = history[^1];
                entry.High = Math.Max(entry.High, price);
                entry.Low = Math.Min(entry.Low, price);
                entry.Volume += quantity;
                entry.OrderCount++;
                // Weighted average
                int totalVol = entry.Volume;
                entry.Average = ((entry.Average * (totalVol - quantity)) + (price * quantity)) / totalVol;
                history[^1] = entry;
            }
            else
            {
                history.Add(new PriceHistoryEntry
                {
                    Timestamp = dayTimestamp,
                    Average = price,
                    High = price,
                    Low = price,
                    Volume = quantity,
                    OrderCount = 1
                });
            }
        }

        // ====================================================================
        // PROCESS (expiry check)
        // ====================================================================

        /// <summary>
        /// Check for expired orders. Call periodically.
        /// </summary>
        public void ProcessExpiry(long currentTime)
        {
            foreach (var order in _orders.Values.Where(o => o.State == OrderState.Open))
            {
                if (currentTime >= order.ExpiryTimestamp)
                {
                    order.State = OrderState.Expired;
                    OnOrderExpired?.Invoke(order);
                }
            }
        }
    }

    // ========================================================================
    // MARKET BOT — NPC seed orders
    // ========================================================================

    /// <summary>
    /// Generates NPC market orders to seed the economy.
    /// Source: EvEmu market/MarketBotMgr.cpp + NPCMarket.cpp
    /// </summary>
    public class MarketBot
    {
        /// <summary>
        /// Seed data for an NPC sell order.
        /// </summary>
        public struct SeedOrder
        {
            public int TypeID;
            public int RegionID;
            public int StationID;
            public float Price;
            public int Quantity;
        }

        /// <summary>
        /// Generate NPC seed orders for a station.
        /// </summary>
        public static List<SeedOrder> GenerateSeedOrders(int regionID, int stationID,
            IEnumerable<(int typeID, float basePrice, int qty)> items)
        {
            var orders = new List<SeedOrder>();
            foreach (var (typeID, basePrice, qty) in items)
            {
                orders.Add(new SeedOrder
                {
                    TypeID = typeID,
                    RegionID = regionID,
                    StationID = stationID,
                    Price = basePrice * 1.1f,   // NPC markup 10%
                    Quantity = qty
                });
            }
            return orders;
        }

        /// <summary>
        /// Estimate base price from mineral composition.
        /// Source: MarketMgr::SetBasePrice / UpdateMineralPrice
        /// </summary>
        public static float EstimateBasePrice(Dictionary<int, int> mineralComposition,
                                               Dictionary<int, float> mineralPrices)
        {
            float total = 0;
            foreach (var (mineralID, qty) in mineralComposition)
            {
                if (mineralPrices.TryGetValue(mineralID, out var price))
                    total += price * qty;
            }
            return total;
        }
    }
}
