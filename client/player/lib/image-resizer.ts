export interface ResizeOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number;
  zoom?: number;
  panX?: number;
  panY?: number;
}

export interface ResizeResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Resize and center-crop any image file to Instagoon's standard dimensions (default 512x640, 4:5 ratio).
 * Re-encoding to WebP automatically strips all camera EXIF, GPS, and ComfyUI generation metadata.
 */
export async function resizeImageToStandard(file: File | Blob, options: ResizeOptions = {}): Promise<ResizeResult> {
  const targetWidth = options.targetWidth || 512;
  const targetHeight = options.targetHeight || 640;
  const quality = options.quality ?? 0.88;
  const zoom = Math.max(1, options.zoom ?? 1);
  const panX = options.panX ?? 0; // -100 to 100
  const panY = options.panY ?? 0; // -100 to 100

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Failed to get 2D canvas context'));

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const srcWidth = img.naturalWidth || img.width;
        const srcHeight = img.naturalHeight || img.height;
        const targetAspect = targetWidth / targetHeight;
        const srcAspect = srcWidth / srcHeight;

        let drawWidth: number;
        let drawHeight: number;

        if (srcAspect > targetAspect) {
          drawHeight = srcHeight / zoom;
          drawWidth = drawHeight * targetAspect;
        } else {
          drawWidth = srcWidth / zoom;
          drawHeight = drawWidth / targetAspect;
        }

        const maxOffsetX = (srcWidth - drawWidth) / 2;
        const maxOffsetY = (srcHeight - drawHeight) / 2;
        const startX = Math.max(0, Math.min(srcWidth - drawWidth, (srcWidth - drawWidth) / 2 + (panX / 100) * maxOffsetX));
        const startY = Math.max(0, Math.min(srcHeight - drawHeight, (srcHeight - drawHeight) / 2 + (panY / 100) * maxOffsetY));

        // Draw onto black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, startX, startY, drawWidth, drawHeight, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Failed to convert canvas to WebP'));
            const dataUrl = canvas.toDataURL('image/webp', quality);
            resolve({
              blob,
              dataUrl,
              width: targetWidth,
              height: targetHeight,
            });
          },
          'image/webp',
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
