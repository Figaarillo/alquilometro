import { z } from 'zod'

type Opt = readonly (readonly [string, string])[]

/** Opciones de cada campo enumerado: [valor, etiqueta]. Única fuente de verdad para UI y validación. */
export const OPTIONS = {
  kind: [['casa', 'Casa'], ['departamento', 'Departamento'], ['ph', 'PH']],
  condition: [['excelente', 'Excelente'], ['bueno', 'Bueno'], ['regular', 'Regular'], ['malo', 'Malo']],
  kitchen: [['separada', 'Cocina separada'], ['cocina_comedor', 'Cocina comedor'], ['integrada', 'Integrada / americana']],
  patioSurface: [['pasto', 'Pasto'], ['cemento', 'Cemento / baldosa'], ['mixto', 'Mixto'], ['tierra', 'Tierra'], ['otro', 'Otro']],
  patioSize: [['chico', 'Chico'], ['mediano', 'Mediano'], ['grande', 'Grande']],
  parking: [['auto', 'Cochera para auto'], ['moto', 'Lugar para moto'], ['ninguno', 'Sin cochera']],
  currency: [['ARS', '$ ARS'], ['USD', 'US$']],
  service: [['agua', 'Agua'], ['luz', 'Luz'], ['gas', 'Gas'], ['internet', 'Internet'], ['cable', 'Cable'], ['limpieza', 'Limpieza'], ['seguridad', 'Seguridad']],
  guarantee: [['propietaria', 'Propietaria'], ['recibo', 'Recibo de sueldo'], ['monotributo_ri', 'Monotributo / Resp. inscripto'], ['caucion', 'Seguro de caución'], ['otra', 'Otra']],
  increaseIndex: [['IPC', 'IPC (inflación)'], ['ICL', 'ICL (BCRA)'], ['casa_propia', 'Casa Propia'], ['fijo', '% fijo'], ['otro', 'Otro']],
  gas: [['natural', 'Gas natural'], ['garrafa', 'Garrafa'], ['ninguno', 'Todo eléctrico']],
  heating: [['gas', 'A gas'], ['electrica', 'Eléctrica'], ['ninguna', 'No tiene']],
  hotWater: [['gas', 'A gas'], ['electrico', 'Eléctrico']],
  humidity: [['no', 'Sin humedad'], ['leve', 'Leve'], ['mucha', 'Mucha']],
  naturalLight: [['mucha', 'Mucha'], ['media', 'Media'], ['poca', 'Poca']],
  ventilation: [['buena', 'Buena'], ['regular', 'Regular'], ['mala', 'Mala']],
  orientation: [['N', 'Norte'], ['NE', 'Noreste'], ['E', 'Este'], ['SE', 'Sureste'], ['S', 'Sur'], ['SO', 'Suroeste'], ['O', 'Oeste'], ['NO', 'Noroeste']],
  noise: [['tranquilo', 'Tranquilo'], ['medio', 'Medio'], ['ruidoso', 'Ruidoso']],
  traffic: [['bajo', 'Bajo'], ['medio', 'Medio'], ['alto', 'Alto']],
  safety: [['buena', 'Buena'], ['regular', 'Regular'], ['mala', 'Mala']],
} as const satisfies Record<string, Opt>

export type OptionKey = keyof typeof OPTIONS
export type OptionValue<K extends OptionKey> = (typeof OPTIONS)[K][number][0]

const enumOf = <K extends OptionKey>(key: K) =>
  z.enum(OPTIONS[key].map(([v]) => v) as unknown as [OptionValue<K>, ...OptionValue<K>[]])

export function optionLabel<K extends OptionKey>(key: K, value: string | null | undefined): string {
  if (value == null) return '—'
  return (OPTIONS[key] as Opt).find(([v]) => v === value)?.[1] ?? value
}

const yesNo = z.boolean().nullish()
const money = z.number().min(0).nullish()
const int = z.number().int().min(0).nullish()
const text = z.string().max(5000).nullish()

export const patioSchema = z.object({
  surface: enumOf('patioSurface').nullish(),
  size: enumOf('patioSize').nullish(),
  hasPool: yesNo,
  notes: text,
})
export type Patio = z.infer<typeof patioSchema>

/** Características de la propiedad. Todo es opcional: null/undefined = "no sé todavía". */
export const detailsSchema = z.object({
  // Tipo y espacio
  kind: enumOf('kind').nullish(),
  isDuplex: yesNo,
  floor: int,
  bedrooms: int,
  bathrooms: int,
  areaM2: money,
  kitchen: enumOf('kitchen').nullish(),
  condition: enumOf('condition').nullish(),
  furnished: yesNo,
  // Exteriores
  hasPatio: yesNo,
  patios: z.array(patioSchema).nullish(),
  hasPool: yesNo,
  hasGrill: yesNo,
  hasBalcony: yesNo,
  hasSharedSpaces: yesNo,
  sharedSpacesNotes: text,
  parking: enumOf('parking').nullish(),
  // Costos mensuales
  currency: enumOf('currency').nullish(),
  rent: money,
  expenses: money,
  expensesInclude: z.array(enumOf('service')).nullish(),
  estElectricity: money,
  estGas: money,
  estWater: money,
  estInternet: money,
  // Costo de ingreso
  deposit: money,
  advanceMonths: int,
  agencyFee: money,
  otherEntryCosts: money,
  guarantees: z.array(enumOf('guarantee')).nullish(),
  guaranteesCount: int,
  guaranteeNotes: text,
  // Contrato
  petsAllowed: yesNo,
  contractMonths: int,
  increaseEveryMonths: int,
  increaseIndex: enumOf('increaseIndex').nullish(),
  increaseFixedPercent: z.number().min(0).nullish(),
  availableFrom: z.string().max(20).nullish(),
  // Servicios
  gas: enumOf('gas').nullish(),
  heating: enumOf('heating').nullish(),
  hotWater: enumOf('hotWater').nullish(),
  airConditioning: yesNo,
  fiber: yesNo,
  // Ambiente y entorno
  humidity: enumOf('humidity').nullish(),
  naturalLight: enumOf('naturalLight').nullish(),
  ventilation: enumOf('ventilation').nullish(),
  orientation: enumOf('orientation').nullish(),
  noise: enumOf('noise').nullish(),
  traffic: enumOf('traffic').nullish(),
  neighborhoodSafety: enumOf('safety').nullish(),
})
export type Details = z.infer<typeof detailsSchema>

export const STATUSES = [
  ['nuevo', 'Nuevo'],
  ['contactado', 'Contactado'],
  ['visita_agendada', 'Visita agendada'],
  ['visitado', 'Visitado'],
  ['aplicado', 'Aplicando / negociando'],
  ['descartado', 'Descartado'],
] as const
export type Status = (typeof STATUSES)[number][0]
const STATUS_KEYS = STATUSES.map(([k]) => k) as unknown as [Status, ...Status[]]
export const statusLabel = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s

const str = z.string().trim().max(2000).nullish()

export const propertyInputSchema = z.object({
  title: z.string().trim().min(1, 'Poné un nombre').max(200),
  status: z.enum(STATUS_KEYS).optional(),
  description: z.string().max(20000).nullish(),
  address: str,
  lat: z.number().min(-90).max(90).nullish(),
  lng: z.number().min(-180).max(180).nullish(),
  listingUrl: str,
  contactName: str,
  contactPhone: str,
  myRating: z.number().int().min(1).max(10).nullish(),
  notes: z.string().max(20000).nullish(),
  details: detailsSchema.optional(),
})
export const propertyPatchSchema = propertyInputSchema.partial()
export type PropertyInput = z.infer<typeof propertyInputSchema>

export const CHECK_STATES = [
  ['pendiente', 'Pendiente'],
  ['ok', 'OK'],
  ['problema', 'Problema'],
  ['na', 'N/A'],
] as const
export type CheckState = (typeof CHECK_STATES)[number][0]
const CHECK_KEYS = CHECK_STATES.map(([k]) => k) as unknown as [CheckState, ...CheckState[]]

export const checkInputSchema = z.object({
  state: z.enum(CHECK_KEYS),
  comment: z.string().max(5000).nullish(),
})

export const checklistItemInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  category: z.string().trim().max(100).nullish(),
  position: z.number().int().optional(),
  active: z.boolean().optional(),
})

export const visitInputSchema = z.object({
  /** Puede no tener propiedad: ej. "pasar por la oficina de la inmobiliaria". */
  propertyId: z.uuid().nullish(),
  title: z.string().trim().max(200).nullish(),
  location: z.string().trim().max(500).nullish(),
  scheduledAt: z.coerce.date(),
  /** Fin de la franja horaria ("de 9:30 a 12"). */
  endAt: z.coerce.date().nullish(),
  notes: z.string().max(5000).nullish(),
  done: z.boolean().optional(),
})
export const visitPatchSchema = visitInputSchema.partial()

export const messageCreateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  body: z.string().max(20000),
})
export const messageVersionSchema = z.object({
  body: z.string().max(20000),
  note: z.string().trim().max(500).nullish(),
})

// ---- Ajustes / puntaje ----

export const CATEGORIES = [
  ['ubicacion', 'Ubicación y entorno'],
  ['costo', 'Costo mensual'],
  ['espacio', 'Espacio'],
  ['servicios', 'Servicios (gas, calefacción)'],
  ['estado', 'Estado y confort'],
  ['exteriores', 'Exteriores y privacidad'],
  ['cochera', 'Cochera'],
  ['contrato', 'Contrato e ingreso'],
] as const
export type CategoryKey = (typeof CATEGORIES)[number][0]
const CATEGORY_KEYS = CATEGORIES.map(([k]) => k) as unknown as [CategoryKey, ...CategoryKey[]]

export const refPointSchema = z.object({
  name: z.string().min(1).max(100),
  lat: z.number(),
  lng: z.number(),
})
export type RefPoint = z.infer<typeof refPointSchema>

export const settingsSchema = z.object({
  /** Alquiler máximo "ideal". */
  maxRent: z.number().min(0),
  /** Tope de alquiler + expensas. */
  maxMonthlyTotal: z.number().min(0),
  /** Alquiler a partir del cual es "muy elevado" pase lo que pase. */
  rentHardCap: z.number().min(0),
  usdRate: z.number().min(0),
  weights: z.record(z.enum(CATEGORY_KEYS), z.number().min(0).max(100)),
  refPoints: z.array(refPointSchema).max(10),
})
export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  maxRent: 550_000,
  maxMonthlyTotal: 650_000,
  rentHardCap: 700_000,
  usdRate: 1_400,
  weights: {
    ubicacion: 20,
    costo: 20,
    espacio: 14,
    servicios: 12,
    estado: 12,
    exteriores: 10,
    cochera: 6,
    contrato: 6,
  },
  // Coordenadas aproximadas: ajustalas en "Ajustes" haciendo click en el mapa.
  refPoints: [
    { name: 'Centro (Plaza Independencia)', lat: -32.4113, lng: -63.2437 },
    { name: 'Costanera', lat: -32.4026, lng: -63.2372 },
  ],
}

export function mergeSettings(partial: Partial<Settings> | null | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    weights: { ...DEFAULT_SETTINGS.weights, ...partial?.weights },
    refPoints: partial?.refPoints?.length ? partial.refPoints : DEFAULT_SETTINGS.refPoints,
  }
}

// ---- Compartir ----

export const shareOptionsSchema = z.object({
  showNotes: z.boolean(),
  showContact: z.boolean(),
  showMyRating: z.boolean(),
  showScore: z.boolean(),
  allowRatings: z.boolean(),
})
export type ShareOptions = z.infer<typeof shareOptionsSchema>

export const DEFAULT_SHARE_OPTIONS: ShareOptions = {
  showNotes: false,
  showContact: false,
  showMyRating: false,
  showScore: true,
  allowRatings: true,
}

export const shareCreateSchema = shareOptionsSchema.partial().extend({
  name: z.string().trim().min(1, 'Poné un nombre').max(120),
  propertyIds: z.array(z.uuid()).min(1, 'Elegí al menos un alquiler').max(200),
})

export const sharePatchSchema = shareOptionsSchema.partial().extend({
  name: z.string().trim().min(1).max(120).optional(),
  propertyIds: z.array(z.uuid()).min(1).max(200).optional(),
  revoked: z.boolean().optional(),
})

export const guestRatingSchema = z.object({
  propertyId: z.uuid(),
  guestName: z.string().trim().min(1, 'Poné tu nombre').max(80),
  rating: z.number().int().min(1).max(10).nullish(),
  comment: z.string().trim().max(2000).nullish(),
})
