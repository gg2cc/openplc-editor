import type { ModbusIOGroup } from '../../ports/types'
import { formatAddress, parseAddress, prefixOf } from '../iec-address/registry/address-space'

type ModbusFunctionCode = ModbusIOGroup['functionCode']

type ModbusLocalAddressRange =
  | { ok: true; startAddress?: string; addresses?: string[] }
  | { ok: false; message: string }

const LOCAL_ADDRESS_PREFIXES: Record<ModbusFunctionCode, string> = {
  '1': '%IX',
  '2': '%IX',
  '3': '%IW',
  '4': '%IW',
  '5': '%QX',
  '6': '%QW',
  '15': '%QX',
  '16': '%QW',
}

export const getModbusLocalAddressPrefix = (functionCode: ModbusFunctionCode): string =>
  LOCAL_ADDRESS_PREFIXES[functionCode]

export function resolveModbusLocalAddressRange(
  functionCode: ModbusFunctionCode,
  rawStartAddress: string | undefined,
  length: number,
): ModbusLocalAddressRange {
  const trimmed = rawStartAddress?.trim() ?? ''
  if (!trimmed) return { ok: true }

  const parsed = parseAddress(trimmed.toUpperCase())
  if (!parsed) {
    return { ok: false, message: 'Enter a valid IEC address, for example %IW100 or %IX5.2.' }
  }

  const expectedPrefix = getModbusLocalAddressPrefix(functionCode)
  if (prefixOf(parsed.cls) !== expectedPrefix) {
    return {
      ok: false,
      message: `Function Code ${functionCode} requires a local address beginning with ${expectedPrefix}.`,
    }
  }

  if (!Number.isSafeInteger(length) || length < 1 || !Number.isSafeInteger(parsed.linear + (length - 1))) {
    return { ok: false, message: 'The local address range is invalid or too large.' }
  }

  return {
    ok: true,
    startAddress: formatAddress(parsed.cls, parsed.linear),
    addresses: Array.from({ length }, (_, index) => formatAddress(parsed.cls, parsed.linear + index)),
  }
}
