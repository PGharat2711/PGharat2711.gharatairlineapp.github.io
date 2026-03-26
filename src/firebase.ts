import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
console.log('Firebase initialized successfully');
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Analytics safely
let analyticsInstance = null;
const measurementId = firebaseConfig.measurementId || 'G-XXXXXXXXXX'; // Placeholder if missing

if (typeof window !== 'undefined' && measurementId) {
  try {
    // Configure gtag to route to sGTM
    const sGtmUrl = 'https://server-side-tagging-14619807999.us-east1.run.app'; 
    
    window.gtag = window.gtag || function() { (window.dataLayer = window.dataLayer || []).push(arguments); };
    window.gtag('config', measurementId, {
      'transport_url': sGtmUrl,
      'first_party_collection': true
    });

    analyticsInstance = getAnalytics(app);
    console.log('Firebase Analytics initialized with sGTM routing');
  } catch (error) {
    console.warn('Firebase Analytics failed to initialize:', error);
  }
}

declare global {
  interface Window {
    gtag: any;
    dataLayer: any[];
  }
}

export const analytics = analyticsInstance;
export const googleProvider = new GoogleAuthProvider();

// Analytics Helpers
export const trackEvent = (eventName: string, params?: any) => {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
};

// Auth Helpers
export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

// Error Handling Helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
