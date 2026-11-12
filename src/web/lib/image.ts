/**
 * Achica la foto en el celu antes de subirla (menos datos móviles y subida más rápida).
 * Si el navegador no puede (ej. HEIC), sube el original y el servidor la comprime igual.
 */
const MAX_SIDE = 1600
const QUALITY = 0.8

async function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', QUALITY))
  // Algunos navegadores ignoran WebP y devuelven PNG (enorme): en ese caso, JPEG.
  if (webp && webp.type === 'image/webp') return webp
  return new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', QUALITY))
}

export async function resizeImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale)
    const h = Math.round(bmp.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    bmp.close()
    const blob = await encode(canvas)
    if (!blob || blob.size >= file.size) return file
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    return new File([blob], `${file.name.replace(/\.\w+$/, '') || 'foto'}.${ext}`, { type: blob.type })
  } catch {
    return file
  }
}

export const formatBytes = (n: number) =>
  n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : n < 1024 ** 3 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`
