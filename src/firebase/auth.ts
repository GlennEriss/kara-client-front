import { connectAuthEmulator, getAuth } from "firebase/auth";
import { app } from "./app";

export const auth = getAuth(app);

/* if (process.env.NODE_ENV === 'development') {
  connectAuthEmulator(auth, `http://127.0.0.1:9099`);
} */

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
