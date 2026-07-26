import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
// import { registerSW } from 'virtual:pwa-register';
import './index.css';

// Global circular-safe JSON.stringify patch to prevent crashes with circular or Firestore objects
(function() {
  const originalStringify = JSON.stringify;
  JSON.stringify = function (value: any, replacer?: any, space?: any) {
    const seen = new WeakSet();
    
    const safeReplacer = function (this: any, key: string, val: any) {
      let processedVal = val;
      if (replacer) {
        if (typeof replacer === 'function') {
          processedVal = replacer.call(this, key, val);
        } else if (Array.isArray(replacer)) {
          if (key !== "" && !replacer.includes(key) && !replacer.includes(Number(key))) {
            return undefined;
          }
        }
      }
      
      if (processedVal && typeof processedVal === 'object') {
        if (seen.has(processedVal)) {
          return '[Circular]';
        }
        seen.add(processedVal);
        
        // Handle Firestore Timestamp safely
        if (typeof processedVal.seconds === 'number' && typeof processedVal.nanoseconds === 'number') {
          return {
            seconds: processedVal.seconds,
            nanoseconds: processedVal.nanoseconds,
            formatted: new Date(processedVal.seconds * 1000).toISOString()
          };
        }
        
        // Handle Firestore DocumentReference / Query / CollectionReference safely
        if ('_firestore' in processedVal || 'path' in processedVal || (processedVal.type === 'query' || processedVal.type === 'collection')) {
          return processedVal.path || '[Reference]';
        }
      }
      return processedVal;
    };

    try {
      return originalStringify(value, safeReplacer, space);
    } catch (err) {
      try {
        const backupSeen = new Set();
        const fallbackReplacer = (k: string, v: any) => {
          if (v && typeof v === 'object') {
            if (backupSeen.has(v)) return '[Circular]';
            backupSeen.add(v);
          }
          return v;
        };
        return originalStringify(value, fallbackReplacer, space);
      } catch {
        return '"[Unserializable]"';
      }
    }
  };
})();


// Register service worker for offline support
// registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
