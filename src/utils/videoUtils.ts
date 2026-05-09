export const generateVideoThumbnail = (videoFile: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    video.style.display = 'none';
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoFile);
    video.src = url;

    video.onloadedmetadata = () => {
      // Seek to 1 second (or midpoint if shorter)
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          URL.revokeObjectURL(url);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
      }, 'image/jpeg', 0.7);
    };

    video.onerror = (e) => {
      reject(e);
      URL.revokeObjectURL(url);
    };
  });
};

export const formatDuration = (seconds: number): string => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};
