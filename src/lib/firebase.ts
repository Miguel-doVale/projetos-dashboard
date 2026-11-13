import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Placeholders evitam que o SDK lance no import quando as variáveis não
// existem (testes, build sem .env.local). Nenhuma chamada de rede acontece aqui.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'placeholder-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'placeholder-project',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'placeholder-app-id',
}

export const app = initializeApp(config)
export const auth = getAuth(app)
export const db = getFirestore(app)
