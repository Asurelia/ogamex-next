'use client'

/**
 * Corporation Window
 *
 * 5 tabs: Info, Members, Applications, Wallet, Hangar
 */

import { useState, useCallback, memo } from 'react'
import { ManagedWindow } from '../WindowManager'
import { useRTGameStore } from '@/stores/rtGameStore'

// ============================================================================
// TYPES
// ============================================================================

type CorpTab = 'info' | 'members' | 'applications' | 'wallet' | 'hangar'

const CORP_TABS: { key: CorpTab; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'members', label: 'Members' },
  { key: 'applications', label: 'Apps' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'hangar', label: 'Hangar' },
]

// ============================================================================
// TAB CONTENT
// ============================================================================

const InfoTab = memo(function InfoTab() {
  const { corpData } = useRTGameStore()
  const [createName, setCreateName] = useState('')
  const [createTicker, setCreateTicker] = useState('')

  const handleCreate = useCallback(() => {
    if (!createName.trim() || !createTicker.trim()) return
    useRTGameStore.getState().corpCreate(createName, createTicker)
    setCreateName('')
    setCreateTicker('')
  }, [createName, createTicker])

  if (!corpData) {
    return (
      <div className="p-3 space-y-3">
        <div className="text-xs text-slate-400 mb-2">You are not in a corporation.</div>
        <div className="space-y-2">
          <div className="text-xs text-slate-300 font-medium">Create Corporation</div>
          <input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Corporation Name"
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
          />
          <input
            value={createTicker}
            onChange={(e) => setCreateTicker(e.target.value.toUpperCase().slice(0, 5))}
            placeholder="Ticker (2-5 chars)"
            maxLength={5}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
          />
          <button
            onClick={handleCreate}
            disabled={!createName.trim() || createTicker.length < 2}
            className="w-full px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs rounded transition-colors"
          >
            Create Corporation
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-200">{corpData.name}</span>
        <span className="text-xs text-cyan-400">[{corpData.ticker}]</span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-xs">
        <span className="text-slate-400">Members:</span>
        <span className="text-slate-200">{corpData.memberCount}</span>
        <span className="text-slate-400">Tax Rate:</span>
        <span className="text-slate-200">{(corpData.taxRate * 100).toFixed(1)}%</span>
        <span className="text-slate-400">Recruiting:</span>
        <span className={corpData.isRecruiting ? 'text-green-400' : 'text-red-400'}>
          {corpData.isRecruiting ? 'Yes' : 'No'}
        </span>
      </div>
      {corpData.description && (
        <p className="text-xs text-slate-400 mt-2 border-t border-slate-700 pt-2">{corpData.description}</p>
      )}
      <button
        onClick={() => useRTGameStore.getState().corpLeave()}
        className="mt-2 px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-xs rounded transition-colors"
      >
        Leave Corporation
      </button>
    </div>
  )
})

const MembersTab = memo(function MembersTab() {
  const { corpMembers } = useRTGameStore()

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs text-slate-400 mb-1">{corpMembers.length} member(s)</div>
      <div className="space-y-0.5 max-h-[300px] overflow-y-auto">
        {corpMembers.map((member) => (
          <div key={member.userId} className="flex items-center justify-between px-2 py-1 bg-slate-800/50 rounded text-xs">
            <span className="text-slate-200">{member.userName || member.userId.slice(0, 8)}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${
              member.role === 'ceo' ? 'bg-yellow-900/50 text-yellow-300' :
              member.role === 'director' ? 'bg-blue-900/50 text-blue-300' :
              'bg-slate-700 text-slate-400'
            }`}>
              {member.role}
            </span>
          </div>
        ))}
        {corpMembers.length === 0 && (
          <div className="text-center text-slate-500 py-4 text-xs">No members loaded</div>
        )}
      </div>
    </div>
  )
})

const ApplicationsTab = memo(function ApplicationsTab() {
  const { corpApplications } = useRTGameStore()

  return (
    <div className="p-2 space-y-1">
      <div className="text-xs text-slate-400 mb-1">{corpApplications.length} pending</div>
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        {corpApplications.map((app) => (
          <div key={app.id} className="p-2 bg-slate-800/50 rounded space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-200">{app.applicantName || app.applicantId.slice(0, 8)}</span>
              <div className="flex gap-1">
                <button
                  onClick={() => useRTGameStore.getState().corpAcceptApplication(app.id)}
                  className="px-2 py-0.5 bg-green-900/50 hover:bg-green-800/50 text-green-300 text-[10px] rounded"
                >
                  Accept
                </button>
                <button
                  onClick={() => useRTGameStore.getState().corpRejectApplication(app.id)}
                  className="px-2 py-0.5 bg-red-900/50 hover:bg-red-800/50 text-red-300 text-[10px] rounded"
                >
                  Reject
                </button>
              </div>
            </div>
            {app.message && <p className="text-[10px] text-slate-400">{app.message}</p>}
          </div>
        ))}
        {corpApplications.length === 0 && (
          <div className="text-center text-slate-500 py-4 text-xs">No pending applications</div>
        )}
      </div>
    </div>
  )
})

const WalletTab = memo(function WalletTab() {
  const { corpWalletBalances, corpWalletJournal } = useRTGameStore()
  const [depositAmount, setDepositAmount] = useState('')

  return (
    <div className="p-2 space-y-2">
      <div className="text-xs text-slate-400">Corporation Wallet</div>
      <div className="grid grid-cols-2 gap-1">
        {corpWalletBalances.map((balance, idx) => (
          <div key={idx} className="px-2 py-1 bg-slate-800/50 rounded text-xs">
            <span className="text-slate-400">Div {idx + 1}: </span>
            <span className="text-green-400">{balance.toLocaleString()} ISK</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-2">
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Amount"
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-600"
        />
        <button
          onClick={() => {
            const amount = parseFloat(depositAmount)
            if (amount > 0) {
              useRTGameStore.getState().corpDeposit(amount)
              setDepositAmount('')
            }
          }}
          className="px-2 py-1 bg-green-800 hover:bg-green-700 text-white text-xs rounded"
        >
          Deposit
        </button>
      </div>
      <div className="space-y-0.5 max-h-[200px] overflow-y-auto mt-2">
        {corpWalletJournal.map((entry, i) => (
          <div key={i} className="flex justify-between px-2 py-0.5 text-[10px]">
            <span className="text-slate-400">{entry.description || entry.refType}</span>
            <span className={entry.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
              {entry.amount >= 0 ? '+' : ''}{entry.amount.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

const HangarTab = memo(function HangarTab() {
  return (
    <div className="p-3 text-center text-slate-500 text-xs">
      Corporate hangar - items shared with corp members
      <div className="mt-2 text-[10px] text-slate-600">Coming with full inventory integration</div>
    </div>
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CorpContent = memo(function CorpContent() {
  const [activeTab, setActiveTab] = useState<CorpTab>('info')

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-slate-700">
        {CORP_TABS.map((tab) => (
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
        {activeTab === 'info' && <InfoTab />}
        {activeTab === 'members' && <MembersTab />}
        {activeTab === 'applications' && <ApplicationsTab />}
        {activeTab === 'wallet' && <WalletTab />}
        {activeTab === 'hangar' && <HangarTab />}
      </div>
    </div>
  )
})

export function CorpWindow() {
  return (
    <ManagedWindow
      id="rt-corp"
      title="Corporation"
      icon="🏢"
      defaultPosition={{ x: 300, y: 100 }}
      defaultSize={{ width: 420, height: 400 }}
      minWidth={350}
      minHeight={300}
    >
      <CorpContent />
    </ManagedWindow>
  )
}
