import type {
  CanopenBusConfig,
  CanopenOdEntry,
  CanopenPdo,
  CanopenPdoMapping,
  CanopenSdoEntry,
} from '@root/middleware/shared/ports/types'

export const getNextCanopenBusNumber = (buses: CanopenBusConfig[] = []) => {
  const numbers = buses.map((bus) => {
    const match = /^(?:bus|can)?(\d+)$/i.exec(bus.interface ?? bus.name ?? '')
    const explicit = match ? Number(match[1]) : NaN
    return Number.isFinite(explicit) ? explicit : 0
  })

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 0
}

const getNextCanopenIndex = (existing: Array<{ index?: number }>, base: number, step = 0x10) => {
  if (existing.length === 0) return base

  const maxIndex = existing.reduce((max, item) => Math.max(max, Number.isFinite(item.index) ? (item.index as number) : 0), 0)
  return maxIndex >= base ? maxIndex + step : base
}

export const getNextPlcWordAddress = (direction: 'input' | 'output', existing: Array<{ plcAddress?: string }>) => {
  const existingWords = existing
    .map((entry) => entry.plcAddress)
    .filter((value): value is string => typeof value === 'string' && /^%[IQ][BW][0-9]+$/i.test(value))
    .map((value) => Number.parseInt(value.replace(/^%[IQ][BW]/i, ''), 10))

  const nextWord = existingWords.length > 0 ? Math.max(...existingWords) + 1 : 0
  return direction === 'output' ? `%QW${nextWord}` : `%IW${nextWord}`
}

export const makeCanopenOdEntry = (existing: CanopenOdEntry[] = []): CanopenOdEntry => {
  const nextIndex = getNextCanopenIndex(existing, 0x1000)

  return {
    name: `entry_${existing.length + 1}`,
    index: nextIndex,
    subIndex: 0,
    dataType: 'u32',
    access: 'rw',
    defaultValue: 0,
    description: '',
  }
}

export const makeCanopenPdoMapping = (
  direction: 'input' | 'output' = 'output',
  existing: CanopenPdoMapping[] = [],
): CanopenPdoMapping => {
  const nextIndex = getNextCanopenIndex(existing, 0x2000)

  return {
    index: nextIndex,
    subIndex: 0,
    bitLength: 16,
    name: `value_${existing.length + 1}`,
    plcAddress: getNextPlcWordAddress(direction, existing),
    direction,
  }
}

export const makeCanopenPdo = (
  direction: 'input' | 'output' = 'output',
  existing: CanopenPdo[] = [],
): CanopenPdo => {
  const baseIndex = direction === 'output' ? 0x1400 : 0x1800
  const nextIndex = Array.from({ length: 4 }, (_, offset) => baseIndex + offset).find(
    (index) => !existing.some((pdo) => pdo.index === index),
  ) ?? baseIndex

  return {
    name: direction === 'output' ? `tpdo_${existing.length + 1}` : `rpdo_${existing.length + 1}`,
    index: nextIndex,
    subIndex: 0,
    mapping: [makeCanopenPdoMapping(direction)],
  }
}

export const formatCanopenHex = (value: number | undefined, width = 4) =>
  `0x${Math.max(0, value ?? 0).toString(16).toUpperCase().padStart(width, '0')}`

export const parseCanopenHex = (value: string) => {
  const normalized = value.trim().replace(/^0x/i, '')
  if (normalized === '' || !/^[0-9a-f]+$/i.test(normalized)) return 0
  return Number.parseInt(normalized, 16)
}

export const makeCanopenSdoEntry = (existing: CanopenSdoEntry[] = []): CanopenSdoEntry => {
  const nextIndex = getNextCanopenIndex(existing, 0x2000)

  return {
    name: `param_${existing.length + 1}`,
    index: nextIndex,
    subIndex: 0,
    dataType: 'u32',
    defaultValue: 0,
    description: '',
  }
}
