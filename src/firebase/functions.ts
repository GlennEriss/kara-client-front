import { getFunctions } from 'firebase/functions'
import { app } from './app'

let functionsInstance
try {
    functionsInstance = getFunctions(app)
} catch (e) {
    console.warn('Firebase Functions initialization failed:', e)
    // Export a dummy object to avoid import errors in non‑browser environments
    functionsInstance = {} as any
}
export const functions = functionsInstance
