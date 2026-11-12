import { sql } from 'drizzle-orm'
import { db } from './client'
import { checklistItems, messageTemplates, messageVersions } from './schema'

/** Lo que conviene revisar en cada visita. Se puede editar desde la sección Checklist. */
const DEFAULT_CHECKLIST: [string, string[]][] = [
  ['Humedad', [
    'Manchas de humedad en paredes, techos y esquinas',
    'Mirar detrás de muebles y dentro de placares',
    'Olor a encierro o moho',
  ]],
  ['Agua y baño', [
    'Presión del agua (abrir ducha y canilla a la vez)',
    'Cuánto tarda en salir el agua caliente',
    'Pérdidas bajo bachas y en el inodoro',
    'Olor a cloaca en desagües',
  ]],
  ['Gas y calefacción', [
    'Medidor de gas natural propio',
    'Estado de calefactores y sus ventilaciones',
    'Termotanque / calefón: antigüedad y estado',
  ]],
  ['Electricidad', [
    'Probar enchufes (llevar un cargador)',
    'Tiene disyuntor y térmica',
    'Cantidad de enchufes por ambiente',
  ]],
  ['Aberturas y seguridad', [
    'Puertas y ventanas cierran bien',
    'Rejas / cerraduras',
    'Mosquiteros y persianas',
  ]],
  ['Cocina', [
    'Hornallas y horno funcionan',
    'Espacio y conexión para lavarropas',
    'Lugar para heladera',
  ]],
  ['Entorno', [
    'Ruido a distintas horas (pasar también de noche)',
    'Señal del celular adentro',
    'Iluminación de la calle',
    'Vecinos / perros / bares cerca',
  ]],
  ['Papeles y condiciones', [
    'Quién paga impuestos (municipal, rentas)',
    'Medidores individuales de luz, agua y gas',
    'Qué incluyen exactamente las expensas',
    'Requisitos de garantía y antigüedad laboral',
    'Fecha posible de ingreso',
    'Se puede pintar / colgar cosas',
    'Quién se hace cargo de los arreglos',
  ]],
]

const DEFAULT_MESSAGE = `Hola! ¿Cómo estás? Vi la publicación del alquiler y me interesa.
¿Sigue disponible? ¿Me podrías pasar:
- Valor del alquiler y expensas (y qué incluyen)
- Cada cuánto son los aumentos y por qué índice
- Requisitos de garantía
- Si aceptan mascotas
¡Muchas gracias!`

export async function seed() {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(checklistItems)
  if (n === 0) {
    let position = 0
    const rows = DEFAULT_CHECKLIST.flatMap(([category, items]) =>
      items.map((text) => ({ text, category, position: position++ })),
    )
    await db.insert(checklistItems).values(rows)
  }

  const [{ m }] = await db.select({ m: sql<number>`count(*)::int` }).from(messageTemplates)
  if (m === 0) {
    const [t] = await db.insert(messageTemplates).values({ name: 'Consulta inicial' }).returning()
    await db.insert(messageVersions).values({ templateId: t.id, version: 1, body: DEFAULT_MESSAGE, note: 'Versión inicial' })
  }
}
