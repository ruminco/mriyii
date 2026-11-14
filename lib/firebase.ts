import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  UserCredential,
  Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Ініціалізація клієнтського Firebase App (Singleton).
 */
export function getFirebaseApp(): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Отримання клієнтського екземпляра Firebase Auth.
 */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

/**
 * Вхід через Google OAuth.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithPopup(auth, googleProvider);
}

/**
 * Вхід через Apple OAuth.
 */
export async function signInWithApple(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithPopup(auth, appleProvider);
}

/**
 * Вхід через Email та пароль.
 */
export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Реєстрація через Email та пароль.
 */
export async function registerWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Вихід із системи.
 */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  return firebaseSignOut(auth);
}
