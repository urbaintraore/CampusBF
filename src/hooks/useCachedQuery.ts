import { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  getDocs, 
  QueryConstraint,
  QueryDocumentSnapshot,
  DocumentData,
  limit,
  startAfter,
  Query
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface CacheEntry {
  data: any[];
  lastDocs: QueryDocumentSnapshot<DocumentData>[];
  timestamp: number;
}

const queryCache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 1000 * 60 * 5; // 5 minutes cache

export function useCachedQuery(
  collectionName: string, 
  queryConstraints: QueryConstraint[], 
  cacheKey: string,
  pageSize: number = 20
) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      if (queryCache.has(cacheKey)) {
        const cached = queryCache.get(cacheKey)!;
        if (Date.now() - cached.timestamp < CACHE_DURATION_MS) {
          setData(cached.data);
          lastDocRef.current = cached.lastDocs[cached.lastDocs.length - 1] || null;
          setLoading(false);
          // If cached data length is less than pageSize, we might not have more
          setHasMore(cached.data.length >= pageSize);
          return;
        }
      }

      setLoading(true);
      try {
        const q = query(collection(db, collectionName), ...queryConstraints, limit(pageSize));
        const snapshot = await getDocs(q);
        
        const results = snapshot.docs.map(doc => {
          const docData = doc.data();
          // Remove heavy fields like questions from the list view if necessary
          return { id: doc.id, ...docData };
        });

        if (mounted) {
          setData(results);
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
          setHasMore(snapshot.docs.length >= pageSize);
          
          queryCache.set(cacheKey, {
            data: results,
            lastDocs: snapshot.docs,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        console.error("Error fetching", collectionName, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialData();

    return () => { mounted = false; };
  }, [cacheKey]); // Dependency on cacheKey to re-fetch if queries change

  const loadMore = async () => {
    if (loadingMore || !hasMore || !lastDocRef.current) return;
    setLoadingMore(true);

    try {
      const q = query(
        collection(db, collectionName), 
        ...queryConstraints, 
        startAfter(lastDocRef.current),
        limit(pageSize)
      );
      const snapshot = await getDocs(q);
      
      const newResults = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setData(prev => {
        const updated = [...prev, ...newResults];
        // update cache
        const cached = queryCache.get(cacheKey);
        if (cached) {
          queryCache.set(cacheKey, {
            data: updated,
            lastDocs: [...cached.lastDocs, ...snapshot.docs],
            timestamp: Date.now()
          });
        }
        return updated;
      });
      
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] || null;
      setHasMore(snapshot.docs.length >= pageSize);
    } catch (err) {
      console.error("Error loading more", collectionName, err);
    } finally {
      setLoadingMore(false);
    }
  };

  const invalidateCache = () => {
    queryCache.delete(cacheKey);
  };

  return { data, loading, loadingMore, hasMore, loadMore, invalidateCache };
}
