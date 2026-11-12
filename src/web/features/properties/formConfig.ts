import { OPTIONS, type Details, type OptionKey } from '../../../shared/domain'

type K = keyof Details

export type FieldDef =
  | { kind: 'enum'; key: K; label: string; options: OptionKey }
  | { kind: 'multi'; key: K; label: string; options: OptionKey }
  | { kind: 'bool'; key: K; label: string; hint?: string }
  | { kind: 'number'; key: K; label: string; suffix?: string; step?: number }
  | { kind: 'money'; key: K; label: string; hint?: string }
  | { kind: 'date'; key: K; label: string }
  | { kind: 'text'; key: K; label: string; placeholder?: string }
  /** Casilla que, tildada, guarda false (ej. "No aceptan mascotas"). Sin tildar = sin dato. */
  | { kind: 'negflag'; key: K; label: string; hint?: string }
  /** Tamaño: chica/mediana/grande o m² exactos. */
  | { kind: 'size' }
  | { kind: 'patios' }

export interface Section {
  title: string
  fields: FieldDef[]
}

/** Formulario declarativo: agregar un campo = agregar una línea acá (y en detailsSchema). */
export const SECTIONS: Section[] = [
  {
    title: 'Tipo y espacio',
    fields: [
      { kind: 'enum', key: 'kind', label: 'Tipo', options: 'kind' },
      { kind: 'bool', key: 'isDuplex', label: 'Dúplex' },
      { kind: 'number', key: 'bedrooms', label: 'Habitaciones' },
      { kind: 'number', key: 'bathrooms', label: 'Baños' },
      { kind: 'number', key: 'floor', label: 'Piso' },
      { kind: 'size' },
      { kind: 'enum', key: 'kitchen', label: 'Cocina', options: 'kitchen' },
      { kind: 'enum', key: 'condition', label: 'Estado general', options: 'condition' },
    ],
  },
  {
    title: 'Exteriores y privacidad',
    fields: [
      { kind: 'bool', key: 'hasPatio', label: 'Patio' },
      { kind: 'patios' },
      { kind: 'bool', key: 'hasPool', label: 'Pileta' },
      { kind: 'bool', key: 'hasGrill', label: 'Asador' },
      { kind: 'bool', key: 'hasBalcony', label: 'Balcón', hint: 'No suma ni resta' },
      { kind: 'bool', key: 'hasSharedSpaces', label: 'Espacios compartidos' },
      { kind: 'text', key: 'sharedSpacesNotes', label: '¿Qué se comparte?', placeholder: 'Ej: pasillo, lavadero, patio' },
      { kind: 'enum', key: 'parking', label: 'Cochera', options: 'parking' },
    ],
  },
  {
    title: 'Costos mensuales',
    fields: [
      { kind: 'money', key: 'rent', label: 'Alquiler' },
      { kind: 'money', key: 'expenses', label: 'Expensas', hint: 'Poné 0 si no tiene' },
      { kind: 'multi', key: 'expensesInclude', label: 'Las expensas incluyen', options: 'service' },
      { kind: 'money', key: 'estElectricity', label: 'Luz estimada ($)' },
      { kind: 'money', key: 'estGas', label: 'Gas estimado ($)' },
      { kind: 'money', key: 'estWater', label: 'Agua estimada ($)' },
      { kind: 'money', key: 'estInternet', label: 'Internet estimado ($)' },
    ],
  },
  {
    title: 'Ingreso y garantías',
    fields: [
      { kind: 'money', key: 'deposit', label: 'Depósito' },
      { kind: 'number', key: 'advanceMonths', label: 'Meses adelantados' },
      { kind: 'money', key: 'agencyFee', label: 'Comisión inmobiliaria' },
      { kind: 'money', key: 'otherEntryCosts', label: 'Otros gastos (sellado, informes…)' },
      { kind: 'multi', key: 'guarantees', label: 'Garantías que aceptan', options: 'guarantee' },
      { kind: 'number', key: 'guaranteesCount', label: 'Cantidad de garantías que piden' },
      {
        kind: 'text',
        key: 'guaranteeNotes',
        label: 'Detalle de garantías',
        placeholder: 'Ej: recibos > $1.000.000, 3 años de antigüedad, monto según el alquiler',
      },
    ],
  },
  {
    title: 'Contrato',
    fields: [
      { kind: 'negflag', key: 'petsAllowed', label: 'No aceptan mascotas', hint: 'Tildalo solo si te lo dicen' },
      { kind: 'number', key: 'contractMonths', label: 'Duración', suffix: 'meses' },
      { kind: 'number', key: 'increaseEveryMonths', label: 'Aumenta cada', suffix: 'meses' },
      { kind: 'enum', key: 'increaseIndex', label: 'Índice de aumento', options: 'increaseIndex' },
      { kind: 'number', key: 'increaseFixedPercent', label: '% fijo (si aplica)', suffix: '%', step: 0.5 },
      { kind: 'date', key: 'availableFrom', label: 'Disponible desde' },
    ],
  },
  {
    title: 'Servicios',
    fields: [
      { kind: 'enum', key: 'gas', label: 'Gas', options: 'gas' },
      { kind: 'enum', key: 'heating', label: 'Calefacción', options: 'heating' },
      { kind: 'enum', key: 'hotWater', label: 'Agua caliente', options: 'hotWater' },
      { kind: 'multi', key: 'equipment', label: 'Viene con (instalado)', options: 'equipment' },
      { kind: 'bool', key: 'airConditioning', label: 'Aire acondicionado' },
      { kind: 'bool', key: 'fiber', label: 'Fibra óptica disponible' },
    ],
  },
  {
    title: 'Ambiente y entorno',
    fields: [
      { kind: 'enum', key: 'humidity', label: 'Humedad', options: 'humidity' },
      { kind: 'enum', key: 'naturalLight', label: 'Luz natural', options: 'naturalLight' },
      { kind: 'enum', key: 'ventilation', label: 'Ventilación', options: 'ventilation' },
      { kind: 'enum', key: 'orientation', label: 'Orientación (frente / ventanas principales)', options: 'orientation' },
      { kind: 'enum', key: 'noise', label: 'Ruido', options: 'noise' },
      { kind: 'enum', key: 'traffic', label: 'Tránsito', options: 'traffic' },
      { kind: 'enum', key: 'neighborhoodSafety', label: 'Seguridad del barrio', options: 'safety' },
    ],
  },
]

export const optionsOf = (k: OptionKey) => OPTIONS[k] as readonly (readonly [string, string])[]
