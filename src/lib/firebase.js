import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let app = null
let db = null
let auth = null
let isFirebaseEnabled = false

// Only init if required keys present — safe fallback to local-only mode
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId) {
  try {
    app = initializeApp(firebaseConfig)
    db = getFirestore(app)
    auth = getAuth(app)
    isFirebaseEnabled = true
    console.log('[firebase] enabled for project', firebaseConfig.projectId)
  } catch (e) {
    console.warn('[firebase] init failed, falling back to local mode:', e?.message)
    isFirebaseEnabled = false
  }
} else {
  console.log('[firebase] not configured — running in local/GitHub mode. Set VITE_FIREBASE_* env to enable instant sync.')
}

export { app, db, auth, isFirebaseEnabled, firebaseConfig }
