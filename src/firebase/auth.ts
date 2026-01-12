import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { app } from "./app";

// Toujours créer auth (même avec config mock pour le build)
export const auth: Auth = getAuth(app);

/* if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, `http://127.0.0.1:9099`);
} */

// Helper pour vérifier si l'auth utilise de vraies credentials
export const isAuthAvailable = (): boolean => {
  return !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
};

export {
  createUserWithEmailAndPassword,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithCustomToken,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updatePassword,
  updateProfile,
  updateEmail,
  signOut,
  signInWithPopup,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  type Auth,
  type User,
  GoogleAuthProvider,
  type Unsubscribe,
  // Phone auth exports
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  type ConfirmationResult
} from "firebase/auth";
