'use client'
import React, { createContext, useContext, useReducer, ReactNode } from 'react'
import { SubscriptionCI } from '@/types/types'

// Types d'actions
type SubscriptionCIAction =
  | { type: 'SET_SUBSCRIPTIONS'; payload: SubscriptionCI[] }
  | { type: 'ADD_SUBSCRIPTION'; payload: SubscriptionCI }
  | { type: 'UPDATE_SUBSCRIPTION'; payload: SubscriptionCI }
  | { type: 'DELETE_SUBSCRIPTION'; payload: string } // ID de la subscription
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SELECTED'; payload: SubscriptionCI | null }
  | { type: 'OPEN_CREATE_MODAL' }
  | { type: 'CLOSE_CREATE_MODAL' }
  | { type: 'OPEN_EDIT_MODAL'; payload: SubscriptionCI }
  | { type: 'CLOSE_EDIT_MODAL' }
  | { type: 'OPEN_VIEW_MODAL'; payload: SubscriptionCI }
  | { type: 'CLOSE_VIEW_MODAL' }
  | { type: 'OPEN_DELETE_DIALOG'; payload: SubscriptionCI }
  | { type: 'CLOSE_DELETE_DIALOG' }

// État du contexte
interface SubscriptionCIState {
  subscriptions: SubscriptionCI[]
  isLoading: boolean
  selectedSubscription: SubscriptionCI | null
  showCreateModal: boolean
  showEditModal: boolean
  showViewModal: boolean
  showDeleteDialog: boolean
  subscriptionToDelete: SubscriptionCI | null
}

// État initial
const initialState: SubscriptionCIState = {
  subscriptions: [],
  isLoading: false,
  selectedSubscription: null,
  showCreateModal: false,
  showEditModal: false,
  showViewModal: false,
  showDeleteDialog: false,
  subscriptionToDelete: null,
}

// Reducer
function subscriptionCIReducer(
  state: SubscriptionCIState,
  action: SubscriptionCIAction
): SubscriptionCIState {
  switch (action.type) {
    case 'SET_SUBSCRIPTIONS':
      return { ...state, subscriptions: action.payload, isLoading: false }

    case 'ADD_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: [action.payload, ...state.subscriptions],
        showCreateModal: false,
      }

    case 'UPDATE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.map((sub) =>
          sub.id === action.payload.id ? action.payload : sub
        ),
        showEditModal: false,
        selectedSubscription: null,
      }

    case 'DELETE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.filter((sub) => sub.id !== action.payload),
        showDeleteDialog: false,
        subscriptionToDelete: null,
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

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
  state: SubscriptionCIState
  dispatch: React.Dispatch<SubscriptionCIAction>
}

const SubscriptionCIContext = createContext<SubscriptionCIContextType | undefined>(undefined)

// Provider
interface SubscriptionCIProviderProps {
  children: ReactNode
}

export function SubscriptionCIProvider({ children }: SubscriptionCIProviderProps) {
  const [state, dispatch] = useReducer(subscriptionCIReducer, initialState)

  return (
    <SubscriptionCIContext.Provider value={{ state, dispatch }}>
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

