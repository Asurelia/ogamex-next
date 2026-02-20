'use client'

/**
 * Contracts Window
 *
 * 3 tabs: Browse, My Contracts, Create
 */

import { useState, useCallback, memo, useMemo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

type ContractTab = 'browse' | 'mine' | 'create'

const CONTRACT_TABS: { key: ContractTab; label: string }[] = [
  { key: 'browse', label: 'Browse' },
  { key: 'mine', label: 'My Contracts' },
  { key: 'create', label: 'Create' },
]

const CONTRACT_TYPE_COLORS: Record<string, string> = {
  item_exchange: 'text-green-400',
  courier: 'text-blue-400',
  auction: 'text-purple-400',
}

const BrowseTab = memo(function BrowseTab() {
  const { browseContracts } = useRTGameStore()
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return browseContracts
    return browseContracts.filter(c => c.contractType === typeFilter)
  }, [browseContracts, typeFilter])

  return (
    <div className="p-2 space-y-1">
      <div className="flex gap-1 mb-2">
        {['all', 'item_exchange', 'courier', 'auction'].map(t => (
          <button
            key={t}
            className={`px-2 py-0.5 text-[10px] rounded ${typeFilter === t ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-400'}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === 'all' ? 'All' : t.replace(/_/g, ' ')}
          </button>
        ))}
        <button
          onClick={() => useRTGameStore.getState().contractBrowse(typeFilter === 'all' ? undefined : typeFilter)}
          className="ml-auto px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-white text-[10px] rounded"
        >
          Refresh
        </button>
      </div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {filtered.map((contract) => (
          <div key={contract.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-200">{contract.title || 'Untitled'}</span>
              <span className={`text-[10px] ${CONTRACT_TYPE_COLORS[contract.contractType] || 'text-slate-400'}`}>
                {contract.contractType.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-green-400">{contract.price.toLocaleString()} ISK</span>
              {contract.contractType === 'courier' && (
                <span className="text-[10px] text-blue-400">Reward: {contract.reward.toLocaleString()}</span>
              )}
              <button
                onClick={() => useRTGameStore.getState().contractAccept(contract.id)}
                className="px-2 py-0.5 bg-green-800 hover:bg-green-700 text-white text-[10px] rounded"
              >
                {contract.contractType === 'auction' ? 'Bid' : 'Accept'}
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">No contracts available</div>
        )}
      </div>
    </div>
  )
})

const MyContractsTab = memo(function MyContractsTab() {
  const { myContracts } = useRTGameStore()

  return (
    <div className="p-2 space-y-1">
      <button
        onClick={() => useRTGameStore.getState().contractGetMine()}
        className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-white text-[10px] rounded mb-1"
      >
        Refresh
      </button>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {myContracts.map((contract) => (
          <div key={contract.id} className="p-2 bg-slate-800/50 rounded border border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-200">{contract.title || 'Untitled'}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                contract.status === 'finished' ? 'bg-green-900/50 text-green-300' :
                contract.status === 'in_progress' ? 'bg-blue-900/50 text-blue-300' :
                contract.status === 'outstanding' ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-slate-700 text-slate-400'
              }`}>
                {contract.status}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {contract.price.toLocaleString()} ISK | {contract.contractType.replace(/_/g, ' ')}
            </div>
          </div>
        ))}
        {myContracts.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-xs">No contracts</div>
        )}
      </div>
    </div>
  )
})

const CreateTab = memo(function CreateTab() {
  const [contractType, setContractType] = useState<'item_exchange' | 'courier' | 'auction'>('item_exchange')
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [reward, setReward] = useState('')
  const [collateral, setCollateral] = useState('')

  const handleCreate = useCallback(() => {
    if (!title.trim()) return
    useRTGameStore.getState().contractCreate({
      contractType,
      title,
      price: parseFloat(price) || 0,
      reward: parseFloat(reward) || 0,
      collateral: parseFloat(collateral) || 0,
    })
    setTitle('')
    setPrice('')
    setReward('')
    setCollateral('')
  }, [contractType, title, price, reward, collateral])

  return (
    <div className="p-3 space-y-2">
      <div>
        <label className="text-[10px] text-slate-400">Type</label>
        <select
          value={contractType}
          onChange={(e) => setContractType(e.target.value as typeof contractType)}
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 mt-0.5"
        >
          <option value="item_exchange">Item Exchange</option>
          <option value="courier">Courier</option>
          <option value="auction">Auction</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] text-slate-400">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contract title"
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 mt-0.5"
        />
      </div>
      <div>
        <label className="text-[10px] text-slate-400">Price (ISK)</label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
          className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 mt-0.5"
        />
      </div>
      {contractType === 'courier' && (
        <>
          <div>
            <label className="text-[10px] text-slate-400">Reward (ISK)</label>
            <input
              type="number"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 mt-0.5"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">Collateral (ISK)</label>
            <input
              type="number"
              value={collateral}
              onChange={(e) => setCollateral(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 mt-0.5"
            />
          </div>
        </>
      )}
      <button
        onClick={handleCreate}
        disabled={!title.trim()}
        className="w-full px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs rounded transition-colors"
      >
        Create Contract
      </button>
    </div>
  )
})

const ContractsContent = memo(function ContractsContent() {
  const [activeTab, setActiveTab] = useState<ContractTab>('browse')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700">
        {CONTRACT_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'browse' && <BrowseTab />}
        {activeTab === 'mine' && <MyContractsTab />}
        {activeTab === 'create' && <CreateTab />}
      </div>
    </div>
  )
})

export function ContractsWindow() {
  return (
    <ManagedWindow
      id="rt-contracts"
      title="Contracts"
      icon="📜"
      defaultPosition={{ x: 250, y: 110 }}
      defaultSize={{ width: 420, height: 400 }}
      minWidth={350}
      minHeight={300}
    >
      <ContractsContent />
    </ManagedWindow>
  )
}
