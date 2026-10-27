import { getModbusLocalAddressPrefix, resolveModbusLocalAddressRange } from '../local-address'

describe('Modbus local start addresses', () => {
  it.each([
    ['1', '%IX'],
    ['2', '%IX'],
    ['3', '%IW'],
    ['4', '%IW'],
    ['5', '%QX'],
    ['6', '%QW'],
    ['15', '%QX'],
    ['16', '%QW'],
  ] as const)('maps FC %s to %s', (functionCode, prefix) => {
    expect(getModbusLocalAddressPrefix(functionCode)).toBe(prefix)
  })

  it('leaves automatic assignment enabled when the start address is blank', () => {
    expect(resolveModbusLocalAddressRange('3', '  ', 2)).toEqual({ ok: true })
  })

  it('returns a contiguous word range from an explicit address', () => {
    expect(resolveModbusLocalAddressRange('3', '%iw100', 3)).toEqual({
      ok: true,
      startAddress: '%IW100',
      addresses: ['%IW100', '%IW101', '%IW102'],
    })
  })

  it('increments bit addresses through byte boundaries', () => {
    expect(resolveModbusLocalAddressRange('15', '%QX2.6', 3)).toEqual({
      ok: true,
      startAddress: '%QX2.6',
      addresses: ['%QX2.6', '%QX2.7', '%QX3.0'],
    })
  })

  it('rejects a mismatched IEC area or size', () => {
    expect(resolveModbusLocalAddressRange('3', '%QW0', 1)).toEqual({
      ok: false,
      message: 'Function Code 3 requires a local address beginning with %IW.',
    })
  })

  it('rejects malformed or unsafe address ranges', () => {
    expect(resolveModbusLocalAddressRange('1', '%IX0', 1).ok).toBe(false)
    expect(resolveModbusLocalAddressRange('3', '%IW9007199254740991', 2)).toEqual({
      ok: false,
      message: 'The local address range is invalid or too large.',
    })
  })
})
