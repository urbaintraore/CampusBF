import { collection, addDoc, updateDoc, doc, getDocs, getDoc, query, where, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { PrintOrder, PrintRates } from '../types';

// Tarifs par défaut (pourraient être stockés en base plus tard)
export const defaultPrintRates: PrintRates = {
  bwPage: 25,
  colorPage: 100,
  twoSidedDiscount: 0.1, // 10% de réduction pour le recto-verso
  bindingStaple: 0,
  bindingSpiral: 500
};

export const calculatePrintPrice = (pageCount: number, options: PrintOrder['options'], rates: PrintRates = defaultPrintRates): number => {
  let costPerPage = options.color ? rates.colorPage : rates.bwPage;
  
  if (options.twoSided) {
    costPerPage = costPerPage * (1 - rates.twoSidedDiscount);
  }
  
  let basePrice = pageCount * costPerPage * options.copies;
  
  let bindingCost = 0;
  if (options.binding === 'staple') bindingCost = rates.bindingStaple;
  if (options.binding === 'spiral') bindingCost = rates.bindingSpiral;
  
  return Math.ceil(basePrice + (bindingCost * options.copies));
};

export const createPrintOrder = async (orderData: Omit<PrintOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'commandes_impression'), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating print order", error);
    throw error;
  }
};

export const getUserPrintOrders = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'commandes_impression'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintOrder));
  } catch (error) {
    console.error("Error fetching user print orders", error);
    // Index might be missing initially, handle gracefully
    try {
       const qFallback = query(
        collection(db, 'commandes_impression'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(qFallback);
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintOrder));
      return orders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    } catch(e) {
       throw e;
    }
  }
};

export const getAllPrintOrders = async () => {
  try {
    const q = query(collection(db, 'commandes_impression'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintOrder));
  } catch (error) {
    console.error("Error fetching all print orders", error);
    try {
      const snapshot = await getDocs(collection(db, 'commandes_impression'));
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrintOrder));
      return orders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    } catch(e) {
      throw e;
    }
  }
};

export const updatePrintOrderStatus = async (orderId: string, status: PrintOrder['status']) => {
  try {
    const docRef = doc(db, 'commandes_impression', orderId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error updating print order status", error);
    throw error;
  }
};
