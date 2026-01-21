/**
 * Image utilities for compression and processing
 * Optimized for mobile devices with limited bandwidth
 */

interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  type?: 'image/jpeg' | 'image/png' | 'image/webp'
}

const DEFAULT_OPTIONS: CompressOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  type: 'image/jpeg',
}

/**
 * Compress an image file for upload
 * - Resizes to max dimensions while maintaining aspect ratio
 * - Converts to JPEG for smaller file size
 * - Targets ~200-500KB output for typical photos
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Could not get canvas context'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = img
      const maxW = opts.maxWidth!
      const maxH = opts.maxHeight!

      if (width > maxW) {
        height = (height * maxW) / width
        width = maxW
      }
      if (height > maxH) {
        width = (width * maxH) / height
        height = maxH
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw image with white background (for transparency)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        opts.type,
        opts.quality
      )
    }

    img.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // Load the image
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validate image file
 * - Check file type
 * - Check file size (max 10MB before compression)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!validTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Please select a valid image file (JPEG, PNG, or WebP)',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Image is too large. Please select an image under 10MB.',
    }
  }

  return { valid: true }
}

/**
 * Generate a unique filename for upload
 */
export function generateImageFilename(userId: string | undefined): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const prefix = userId ? userId.substring(0, 8) : 'anon'
  return `${prefix}_${timestamp}_${random}.jpg`
}

/**
 * Convert file to base64 for preview
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
