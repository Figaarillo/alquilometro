import sharp, { type Metadata } from 'sharp'

/** Lado máximo guardado: alcanza para verla a pantalla completa en el celu y en la compu. */
export const MAX_SIDE = 1600
const WEBP_QUALITY = 75
/** Si ya llega optimizada (WebP chico) no la recomprimimos: cada pasada pierde calidad. */
const ALREADY_SMALL = 450 * 1024

export class ImageError extends Error {}

const HEIC = /\.(heic|heif)$/i

/**
 * Normaliza cualquier foto a WebP de hasta 1600px, respetando la rotación de la cámara (EXIF).
 * Es la red de seguridad del servidor: aunque el celu no haya podido achicarla, acá se achica.
 */
export async function optimizeImage(input: Buffer, fileName = ''): Promise<{ data: Buffer; mime: string }> {
  let meta: Metadata
  try {
    meta = await sharp(input).metadata()
  } catch {
    if (HEIC.test(fileName)) {
      throw new ImageError('Formato HEIC (iPhone/Samsung) no soportado: mandala como JPG o poné la cámara en "Más compatible"')
    }
    throw new ImageError('No es una imagen válida o el formato no está soportado')
  }

  const fits = (meta.width ?? 0) <= MAX_SIDE && (meta.height ?? 0) <= MAX_SIDE
  if (meta.format === 'webp' && fits && input.length <= ALREADY_SMALL && !meta.orientation) {
    return { data: input, mime: 'image/webp' }
  }

  const data = await sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
  return { data, mime: 'image/webp' }
}
