import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

export interface LogData {
  userId?: string;
  userName?: string;
  email?: string;
  filiere?: string;
  universite?: string;
  action: string;
  module: string;
  details?: string;
  metadata?: any;
  severity?: 'info' | 'warning' | 'error';
}

function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let device = 'Desktop';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    device = 'Mobile';
  }
  return { browser, device };
}

export const logService = {
  async logActivity(data: LogData) {
    try {
      const { browser, device } = getBrowserInfo();
      
      const logEntry = {
        userId: data.userId || 'anonymous',
        userName: data.userName || 'Anonyme',
        email: data.email || '',
        filiere: data.filiere || '',
        universite: data.universite || '',
        action: data.action,
        module: data.module,
        details: data.details || '',
        metadata: data.metadata || {},
        device,
        browser,
        ipAddress: '', // Impossible via standard client JS without ext API
        createdAt: serverTimestamp(),
        severity: data.severity || 'info'
      };

      await addDoc(collection(db, 'activity_logs'), logEntry);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  },

  // Keep for backward compatibility for a moment, then optionally remove
  async logAction(user: User | null, action: string, details?: string) {
    if (!user) return;
    return this.logActivity({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      email: user.email,
      universite: user.university,
      filiere: user.major || '',
      action,
      module: 'General',
      details
    });
  }
};
