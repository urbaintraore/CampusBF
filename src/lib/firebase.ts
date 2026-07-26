import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, persistentSingleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
auth.languageCode = 'fr';
setPersistence(auth, browserLocalPersistence).catch(e => console.error("Persistence setup failed", e));
let localCacheOption: any = undefined;
try {
  // Use standard multi-tab management so new tabs can access the shared persistent cache
  localCacheOption = persistentLocalCache({ tabManager: persistentMultipleTabManager() });
  console.log("[Firebase init] Persistent cache initialized for multi-tab support.");
} catch (e1) {
  console.warn("[Firebase init] Forced single-tab persistence setup failed, trying standard multi-tab management...", e1);
  try {
    localCacheOption = persistentLocalCache({ tabManager: persistentMultipleTabManager() });
  } catch (e2) {
    console.warn("[Firebase init] Multi-tab persistence failed, trying simple local cache...", e2);
    try {
      localCacheOption = persistentLocalCache();
    } catch (e3) {
      console.warn("[Firebase init] Persistent cache not supported or blocked in this browser context. Falling back to memory cache.", e3);
    }
  }
}

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ...(localCacheOption ? { localCache: localCacheOption } : {})
}, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

export const messaging = async () => {
  const supported = await isSupported();
  return supported ? getMessaging(app) : null;
};

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

  // Safe circular reference handler
  const safeStringify = (obj: any) => {
    try {
      const cache = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
          
          // Basic check for common non-serializable objects that aren't circular but cause issues
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack
            };
          }
        }
        return value;
      });
    } catch (err) {
      return `[Serialization Error: ${err instanceof Error ? err.message : String(err)}]`;
    }
  };

  const errorJson = safeStringify(errInfo);
  console.error('Firestore Error: ', errorJson);
  
  // Don't throw just the JSON, throw a proper Error object
  const finalError = new Error(errInfo.error);
  (finalError as any).details = errInfo;
  throw finalError;
}

export interface AuthErrorInfo {
  error: string;
  code: string | null;
  context: string | null;
  online: boolean;
  timestamp: string;
  message: string;
}

export function handleAuthError(error: unknown, context: string | null = null): Error {
  const code = (error as any)?.code || null;
  const message = (error as any)?.message || String(error);
  
  const authErrInfo: AuthErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    code,
    context,
    online: navigator.onLine,
    timestamp: new Date().toISOString(),
    message
  };

  console.group(`[Firebase Auth Error Interceptor] Occurred in: ${context || 'Unknown Context'}`);
  console.error("Firebase Raw Auth Error:", error);
  console.log("Details:", authErrInfo);

  if (code === 'auth/network-request-failed' || message.includes('network-request-failed') || message.includes('Failed to fetch')) {
    console.warn("CRITICAL [auth/network-request-failed]: Network Request Failed detected. Auth server is unreachable, or Google Secure Token/Identity Toolkit APIs are blocked.");
  }
  console.groupEnd();

  let friendlyMessage = message;
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed') || message.includes('Failed to fetch')) {
    friendlyMessage = "Impossible de se connecter aux serveurs d'authentification. Veuillez vérifier votre connexion réseau et vos bloqueurs de publicité.";
  } else if (code === 'auth/invalid-credential') {
    friendlyMessage = "Identifiants de connexion invalides ou incorrects.";
  } else if (code === 'auth/too-many-requests') {
    friendlyMessage = "Trop de tentatives de connexion échouées. Veuillez réessayer plus tard.";
  }

  const enhancedError = new Error(friendlyMessage);
  (enhancedError as any).code = code;
  (enhancedError as any).details = authErrInfo;
  return enhancedError;
}

