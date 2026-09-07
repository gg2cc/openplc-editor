import { generateRetainConf } from '../generate-retain-conf'

describe('generateRetainConf', () => {
  it('enables the default file store for retained variables', () => {
    expect(generateRetainConf('PROGRAM main\nVAR RETAIN\n  value : DINT;\nEND_VAR')).toBe(
      '# Persistent storage for RETAIN variables.\nenabled=1\n' +
        'path=/var/lib/openplc-runtime/retain.bin\nflush_seconds=5\n',
    )
  })

  it('recognises global retained variables', () => {
    expect(generateRetainConf('VAR_GLOBAL RETAIN\n  value : DINT;\nEND_VAR')).not.toBeNull()
  })

  it('does not add storage for programs without RETAIN', () => {
    expect(generateRetainConf('PROGRAM main\nVAR\n  value : DINT;\nEND_VAR')).toBeNull()
  })
})