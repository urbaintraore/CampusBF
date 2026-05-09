import { collection, doc, setDoc, updateDoc, increment, getDocs, query, where, orderBy, limit, addDoc, serverTimestamp, Timestamp, getDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { CommunityVideo, VideoComment, VideoLike, VideoReport } from '@/types';

class VideoService {
  private collectionName = 'community_videos';

  async uploadVideo(
    file: File,
    thumbnailFile: Blob,
    metadata: Partial<CommunityVideo>
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    const videoId = crypto.randomUUID();
    const videoExt = file.name.split('.').pop();
    const videoPath = `${user.uid}/${videoId}.${videoExt}`;
    const thumbnailPath = `${user.uid}/${videoId}.jpg`;

    // 1. Upload video to Supabase
    const { error: videoError, data: videoData } = await supabase.storage
      .from('videos') // User requested 'videos' bucket
      .upload(videoPath, file);

    if (videoError) throw videoError;

    // 2. Upload thumbnail to Supabase
    const { error: thumbnailError, data: thumbnailData } = await supabase.storage
      .from('thumbnails') // User requested 'thumbnails' bucket or folder, assuming bucket based on wording
      .upload(thumbnailPath, thumbnailFile, { contentType: 'image/jpeg' });

    if (thumbnailError) {
      // Cleanup video if thumbnail fails
      await supabase.storage.from('videos').remove([videoPath]);
      throw thumbnailError;
    }

    // 3. Get Public URLs
    const { data: videoUrlData } = supabase.storage
      .from('videos')
      .getPublicUrl(videoPath);
    
    const { data: thumbnailUrlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(thumbnailPath);

    // 4. Save metadata to Firestore
    const videoDataToSave: any = {
      id: videoId,
      userId: user.uid,
      username: metadata.username || user.displayName || 'Anonyme',
      userPhoto: metadata.userPhoto || user.photoURL || '',
      university: metadata.university || '',
      groupId: metadata.groupId || '',
      title: metadata.title || '',
      description: metadata.description || '',
      hashtags: metadata.hashtags || [],
      category: metadata.category,
      visibility: metadata.visibility,
      videoUrl: videoUrlData.publicUrl,
      thumbnailUrl: thumbnailUrlData.publicUrl,
      likesCount: 0,
      commentsCount: 0,
      viewsCount: 0,
      sharesCount: 0,
      isVerifiedEducational: false,
      createdAt: serverTimestamp()
    };

    await setDoc(doc(db, this.collectionName, videoId), videoDataToSave);
    
    return videoId;
  }

  async getVideos(category?: string, visibility: string = 'public', limitCount: number = 20) {
    const q = query(
      collection(db, this.collectionName),
      where('visibility', '==', visibility),
      ...(category ? [where('category', '==', category)] : []),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityVideo));
  }

  async likeVideo(videoId: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Utilisateur non connecté');

    const likeId = `${user.uid}_${videoId}`;
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
}

export const videoService = new VideoService();
