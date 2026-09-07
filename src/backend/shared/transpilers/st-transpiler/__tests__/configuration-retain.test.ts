import { generateConfigurations } from '../emit/configuration'
import type { TranspileProject } from '../types'

function configurationFor(globalVariables: TranspileProject['configuration']['globalVariables']): TranspileProject {
  return {
    dataTypes: [],
    pous: [],
    configuration: {
      tasks: [],
      instances: [],
      globalVariables,
    },
  }
}

describe('configuration global variable emission', () => {
  it('preserves RETAIN on configuration-level globals', () => {
    const chunks = generateConfigurations(
      configurationFor([
        {
          name: 'g_i',
          retain: true,
          type: { definition: 'base-type', value: 'DINT' },
        },
        {
          name: 'g_j',
          type: { definition: 'base-type', value: 'DINT' },
        },
      ]),
    )

    const program = chunks.map(([text]) => text).join('')
    expect(program).toContain('VAR_GLOBAL RETAIN\n    g_i : DINT;\n  END_VAR\n')
    expect(program).toContain('VAR_GLOBAL\n    g_j : DINT;\n  END_VAR\n')
    expect(program).not.toContain('VAR_GLOBAL RETAIN\n    g_j')
  })
})