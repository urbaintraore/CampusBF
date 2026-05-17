import { collection, doc, setDoc, updateDoc, increment, getDocs, query, orderBy, limit, addDoc, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { CommunityVideo } from '@/types';
import { analyzeCommunityVideo } from './geminiService';

class CommunityVideoService {
  private collectionName = 'community_videos';

  async publishVideo(metadata: Omit<CommunityVideo, 'id' | 'likesCount' | 'commentsCount' | 'viewsCount' | 'sharesCount' | 'aiModerationScore' | 'status' | 'createdAt'>, user: any) {
    
    // AI Moderation Analysis
    const analysis = await analyzeCommunityVideo(metadata.title, metadata.description, metadata.hashtags, metadata.category, metadata.videoUrl);

    const videoId = crypto.randomUUID();
    const videoDataToSave: CommunityVideo = {
      id: videoId,
      userId: user.uid,
      username: user.displayName || 'Anonyme',
      userPhoto: user.photoURL || '',
      university: metadata.university || '',
      platform: metadata.platform,
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      hashtags: metadata.hashtags,
      videoUrl: metadata.videoUrl,
      thumbnail: metadata.thumbnail,
      duration: metadata.duration,
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      sharesCount: 0,
      aiModerationScore: analysis.score,
      status: analysis.status,
      createdAt: serverTimestamp()
    };

    if (analysis.status === 'rejected') {
        throw new Error(`Vidéo rejetée par la modération IA : ${analysis.reason}`);
    }

    await setDoc(doc(db, this.collectionName, videoId), videoDataToSave);
    
    return videoId;
  }

  async getCommunityVideos(category?: string, limitCount: number = 20) {
    const collectionRef = collection(db, this.collectionName);
    let q;
    if (category && category !== 'Tous') {
         q = query(collectionRef, where('category', '==', category), where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(limitCount));
    } else {
         q = query(collectionRef, where('status', '==', 'approved'), orderBy('createdAt', 'desc'), limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as CommunityVideo));
  }
}

export const communityVideoService = new CommunityVideoService();
