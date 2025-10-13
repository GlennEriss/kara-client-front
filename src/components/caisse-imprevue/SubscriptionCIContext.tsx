'use client'
import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { SubscriptionCI } from '@/types/types'
import { useSubscriptionsCI } from '@/hooks/caisse-imprevue/useSubscriptionsCI'
import {
  useCreateSubscriptionCI,
  useUpdateSubscriptionCI,
  useDeleteSubscriptionCI,
} from '@/hooks/caisse-imprevue/useSubscriptionCIMutations'

// Types d'actions (uniquement pour l'UI maintenant, React Query gère les données)
type SubscriptionCIAction =
  | { type: 'SET_SELECTED'; payload: SubscriptionCI | null }
  | { type: 'OPEN_CREATE_MODAL' }
  | { type: 'CLOSE_CREATE_MODAL' }
  | { type: 'OPEN_EDIT_MODAL'; payload: SubscriptionCI }
  | { type: 'CLOSE_EDIT_MODAL' }
  | { type: 'OPEN_VIEW_MODAL'; payload: SubscriptionCI }
  | { type: 'CLOSE_VIEW_MODAL' }
  | { type: 'OPEN_DELETE_DIALOG'; payload: SubscriptionCI }
  | { type: 'CLOSE_DELETE_DIALOG' }

// État du contexte (simplifié - uniquement l'état UI)
interface SubscriptionCIState {
  selectedSubscription: SubscriptionCI | null
  showCreateModal: boolean
  showEditModal: boolean
  showViewModal: boolean
  showDeleteDialog: boolean
  subscriptionToDelete: SubscriptionCI | null
}

// État initial
const initialState: SubscriptionCIState = {
  selectedSubscription: null,
  showCreateModal: false,
  showEditModal: false,
  showViewModal: false,
  showDeleteDialog: false,
  subscriptionToDelete: null,
}

// Reducer (simplifié - gère uniquement l'UI)
function subscriptionCIReducer(
  state: SubscriptionCIState,
  action: SubscriptionCIAction
): SubscriptionCIState {
  switch (action.type) {
    case 'SET_SELECTED':
      return { ...state, selectedSubscription: action.payload }

    case 'OPEN_CREATE_MODAL':
      return { ...state, showCreateModal: true }

    case 'CLOSE_CREATE_MODAL':
      return { ...state, showCreateModal: false }

    case 'OPEN_EDIT_MODAL':
      return {
        ...state,
        showEditModal: true,
        selectedSubscription: action.payload,
      }

    case 'CLOSE_EDIT_MODAL':
      return {
        ...state,
        showEditModal: false,
        selectedSubscription: null,
      }

    case 'OPEN_VIEW_MODAL':
      return {
        ...state,
        showViewModal: true,
        selectedSubscription: action.payload,
      }

    case 'CLOSE_VIEW_MODAL':
      return {
        ...state,
        showViewModal: false,
        selectedSubscription: null,
      }

    case 'OPEN_DELETE_DIALOG':
      return {
        ...state,
        showDeleteDialog: true,
        subscriptionToDelete: action.payload,
      }

    case 'CLOSE_DELETE_DIALOG':
      return {
        ...state,
        showDeleteDialog: false,
        subscriptionToDelete: null,
      }

    default:
      return state
  }
}

// Contexte
interface SubscriptionCIContextType {
  // État UI
  state: SubscriptionCIState
  dispatch: React.Dispatch<SubscriptionCIAction>
  
  // Données (de React Query)
  subscriptions: SubscriptionCI[]
  isLoading: boolean
  isError: boolean
  
  // Mutations (de React Query)
  createSubscription: ReturnType<typeof useCreateSubscriptionCI>
  updateSubscription: ReturnType<typeof useUpdateSubscriptionCI>
  deleteSubscription: ReturnType<typeof useDeleteSubscriptionCI>
}

const SubscriptionCIContext = createContext<SubscriptionCIContextType | undefined>(undefined)

// Provider
interface SubscriptionCIProviderProps {
  children: ReactNode
}

export function SubscriptionCIProvider({ children }: SubscriptionCIProviderProps) {
  const [state, dispatch] = useReducer(subscriptionCIReducer, initialState)

  // React Query: récupération des données
  const { data: subscriptions = [], isLoading, isError } = useSubscriptionsCI()

  // React Query: mutations
  const createSubscription = useCreateSubscriptionCI()
  const updateSubscription = useUpdateSubscriptionCI()
  const deleteSubscription = useDeleteSubscriptionCI()

  return (
    <SubscriptionCIContext.Provider
      value={{
        state,
        dispatch,
        subscriptions,
        isLoading,
        isError,
        createSubscription,
        updateSubscription,
        deleteSubscription,
      }}
    >
      {children}
    </SubscriptionCIContext.Provider>
  )
}

// Hook personnalisé
export function useSubscriptionCI() {
  const context = useContext(SubscriptionCIContext)

  if (context === undefined) {
    throw new Error('useSubscriptionCI doit être utilisé à l\'intérieur de SubscriptionCIProvider')
  }

  return context
}
