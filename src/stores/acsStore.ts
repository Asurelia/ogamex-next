import { create } from 'zustand'
import type {
  ACSOperation,
  ACSInvitation,
  ACSOperationType,
  ACSOperationStatus,
} from '@/types/acs'

// ============================================================================
// ACS STORE TYPES
// ============================================================================

interface ACSState {
  // Current operations the user is part of
  currentOperations: ACSOperation[]
  setCurrentOperations: (operations: ACSOperation[]) => void
  addOperation: (operation: ACSOperation) => void
  updateOperation: (operationId: string, updates: Partial<ACSOperation>) => void
  removeOperation: (operationId: string) => void

  // Pending invitations
  invitations: ACSInvitation[]
  setInvitations: (invitations: ACSInvitation[]) => void
  addInvitation: (invitation: ACSInvitation) => void
  removeInvitation: (invitationId: string) => void
  updateInvitationStatus: (invitationId: string, status: ACSInvitation['status']) => void

  // UI state
  selectedOperationId: string | null
  setSelectedOperationId: (id: string | null) => void

  isCreateModalOpen: boolean
  openCreateModal: () => void
  closeCreateModal: () => void

  isJoinModalOpen: boolean
  joinOperationId: string | null
  openJoinModal: (operationId: string) => void
  closeJoinModal: () => void

  // Loading states
  isLoading: boolean
  setIsLoading: (loading: boolean) => void

  // Error handling
  error: string | null
  setError: (error: string | null) => void
  clearError: () => void

  // Reset
  reset: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState = {
  currentOperations: [] as ACSOperation[],
  invitations: [] as ACSInvitation[],
  selectedOperationId: null as string | null,
  isCreateModalOpen: false,
  isJoinModalOpen: false,
  joinOperationId: null as string | null,
  isLoading: false,
  error: null as string | null,
}

// ============================================================================
// ACS STORE
// ============================================================================

export const useACSStore = create<ACSState>((set, get) => ({
  ...initialState,

  // Operations management
  setCurrentOperations: (operations) => set({ currentOperations: operations }),

  addOperation: (operation) =>
    set((state) => ({
      currentOperations: [...state.currentOperations, operation],
    })),

  updateOperation: (operationId, updates) =>
    set((state) => ({
      currentOperations: state.currentOperations.map((op) =>
        op.id === operationId ? { ...op, ...updates } : op
      ),
    })),

  removeOperation: (operationId) =>
    set((state) => ({
      currentOperations: state.currentOperations.filter((op) => op.id !== operationId),
      selectedOperationId:
        state.selectedOperationId === operationId ? null : state.selectedOperationId,
    })),

  // Invitations management
  setInvitations: (invitations) => set({ invitations }),

  addInvitation: (invitation) =>
    set((state) => ({
      invitations: [...state.invitations, invitation],
    })),

  removeInvitation: (invitationId) =>
    set((state) => ({
      invitations: state.invitations.filter((inv) => inv.id !== invitationId),
    })),

  updateInvitationStatus: (invitationId, status) =>
    set((state) => ({
      invitations: state.invitations.map((inv) =>
        inv.id === invitationId ? { ...inv, status } : inv
      ),
    })),

  // UI state
  setSelectedOperationId: (id) => set({ selectedOperationId: id }),

  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),

  openJoinModal: (operationId) =>
    set({ isJoinModalOpen: true, joinOperationId: operationId }),
  closeJoinModal: () => set({ isJoinModalOpen: false, joinOperationId: null }),

  // Loading
  setIsLoading: (loading) => set({ isLoading: loading }),

  // Error handling
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  // Reset
  reset: () => set(initialState),
}))

// ============================================================================
// SELECTORS
// ============================================================================

export const selectActiveOperations = (state: ACSState) =>
  state.currentOperations.filter(
    (op) => op.status !== 'completed' && op.status !== 'cancelled'
  )

export const selectPendingInvitations = (state: ACSState) =>
  state.invitations.filter((inv) => inv.status === 'pending')

export const selectOperationById = (operationId: string) => (state: ACSState) =>
  state.currentOperations.find((op) => op.id === operationId)

export const selectOperationsByType = (type: ACSOperationType) => (state: ACSState) =>
  state.currentOperations.filter((op) => op.type === type)

export const selectOperationsByStatus = (status: ACSOperationStatus) => (state: ACSState) =>
  state.currentOperations.filter((op) => op.status === status)
