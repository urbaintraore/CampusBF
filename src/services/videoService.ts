import { collection, doc, setDoc, updateDoc, increment, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp, Timestamp, getDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { CommunityVideo, VideoComment, VideoLike, VideoReport } from '@/types';

class VideoService {
  private collectionName = 'community_videos';

  async uploadVideo(
    videoSource: File | string,
    thumbnailFile: Blob | null,
    metadata: Partial<CommunityVideo>
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    const videoId = crypto.randomUUID();
    let finalVideoUrl = '';
    let finalThumbnailUrl = '';

    // Handle Video
    if (typeof videoSource === 'string') {
      finalVideoUrl = videoSource;
    } else {
      const videoExt = videoSource.name.split('.').pop();
      const videoPath = `${user.uid}/${videoId}.${videoExt}`;
      const { error: videoError } = await supabase.storage
        .from('videos')
        .upload(videoPath, videoSource, { contentType: videoSource.type || 'video/mp4' });
      if (videoError) throw videoError;
      
      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoPath);
      finalVideoUrl = videoUrlData.publicUrl;
    }

    // Handle Thumbnail
    if (thumbnailFile) {
      const thumbnailPath = `${user.uid}/${videoId}.jpg`;
      const { error: thumbnailError } = await supabase.storage
        .from('thumbnails')
        .upload(thumbnailPath, thumbnailFile, { contentType: 'image/jpeg' });
      
      if (thumbnailError) {
        if (typeof videoSource !== 'string') {
          // Cleanup video if thumbnail fails
          await supabase.storage.from('videos').remove([`${user.uid}/${videoId}.${videoSource.name.split('.').pop()}`]);
        }
        throw thumbnailError;
      }
      
      const { data: thumbnailUrlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(thumbnailPath);
      finalThumbnailUrl = thumbnailUrlData.publicUrl;
    } else {
      // Create a default placeholder thumbnail if none provided
      finalThumbnailUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(metadata.title || 'Vidéo')}&background=random&size=512`;
    }

    // Save metadata to Firestore
    const videoDataToSave: any = {
      id: videoId,
      userId: user.uid,
      username: metadata.username || user.displayName || 'Anonyme',
      userPhoto: metadata.userPhoto || user.photoURL || '',
      university: metadata.university || '',
      title: metadata.title || '',
      description: metadata.description || '',
      hashtags: metadata.hashtags || [],
      category: metadata.category,
      platform: metadata.platform || 'youtube',
      videoUrl: finalVideoUrl,
      thumbnail: finalThumbnailUrl,
      duration: metadata.duration || '0:00',
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      sharesCount: 0,
      aiModerationScore: 100, // Assuming trusted upload?
      status: 'approved',
      createdAt: serverTimestamp()
    };
    
    await setDoc(doc(db, this.collectionName, videoId), videoDataToSave);
    
    return videoId;
  }

  async getVideos(category?: string, limitCount: number = 20) {
    const q = query(
      collection(db, this.collectionName),
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityVideo));
    
    if (category && category !== 'Tous') {
      docs = docs.filter(doc => doc.category === category);
    }
    
    return docs;
  }

  async likeVideo(videoId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    const likeId = `${videoId}_${user.uid}`;
    const likeRef = doc(db, 'video_likes', likeId);

    // Check if already liked
    const likeDoc = await getDoc(likeRef);
    if (likeDoc.exists()) {
      // Unlike
      await deleteDoc(likeRef);
      await updateDoc(doc(db, this.collectionName, videoId), {
        likesCount: increment(-1)
      });
      return false;
    } else {
      // Like
      await setDoc(likeRef, {
        userId: user.uid,
        videoId,
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, this.collectionName, videoId), {
        likesCount: increment(1)
      });
      return true;
    }
  }

  async addComment(videoId: string, message: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    const commentData = {
      userId: user.uid,
      username: user.displayName || 'Anonyme',
      photo: user.photoURL || '',
      message,
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, this.collectionName, videoId, 'comments'), commentData);
    
    await updateDoc(doc(db, this.collectionName, videoId), {
      commentsCount: increment(1)
    });

    return { id: docRef.id, ...commentData };
  }

  async getComments(videoId: string) {
    const q = query(
      collection(db, this.collectionName, videoId, 'comments'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VideoComment));
  }

  async incrementView(videoId: string) {
    await updateDoc(doc(db, this.collectionName, videoId), {
      viewsCount: increment(1)
    });
  }

  async reportVideo(videoId: string, reason: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    await addDoc(collection(db, 'video_reports'), {
      videoId,
      reportedBy: user.uid,
      reason,
      createdAt: serverTimestamp()
    } as VideoReport);
  }
  async shareVideo(videoId: string, platform: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    await addDoc(collection(db, 'video_shares'), {
      videoId,
      userId: user.uid,
      platform,
      createdAt: serverTimestamp()
    });

    await updateDoc(doc(db, this.collectionName, videoId), {
      sharesCount: increment(1)
    });
  }

  async deleteComment(videoId: string, commentId: string) {
    await deleteDoc(doc(db, this.collectionName, videoId, 'comments', commentId));
    await updateDoc(doc(db, this.collectionName, videoId), {
      commentsCount: increment(-1)
    });
  }
}

export const videoService = new VideoService();
