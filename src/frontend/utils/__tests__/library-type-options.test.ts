import type { SystemLibrary } from '../../../middleware/shared/ports/library-types'
import { getSystemLibraryDataTypeNames, mergeTypeNames } from '../library-type-options'

const library = (types: SystemLibrary['types']): SystemLibrary => ({
  name: 'test',
  author: '',
  version: '1.0.0',
  stPath: '',
  cPath: '',
  pous: [],
  types,
})

describe('getSystemLibraryDataTypeNames', () => {
  it('returns unique exported data type names and excludes ARRAY', () => {
    expect(
      getSystemLibraryDataTypeNames([
        library([
          { name: 'SRTWODATA', kind: 'struct' },
          { name: 'array', kind: 'alias', baseType: 'DINT' },
        ]),
        library([{ name: 'srtwodata', kind: 'enum' }]),
      ]),
    ).toEqual(['SRTWODATA'])
  })

  it('can exclude the current local type name', () => {
    expect(getSystemLibraryDataTypeNames([library([{ name: 'SRTWODATA', kind: 'struct' }])], 'srTwoData')).toEqual([])
  })

  it('merges local and library names without case-insensitive duplicates', () => {
    expect(mergeTypeNames(['zLocalType', 'aLocalType', 'SRTWODATA'], ['srtwodata', 'LibraryType'])).toEqual([
      'aLocalType',
      'SRTWODATA',
      'zLocalType',
      'LibraryType',
    ])
  })

  it('preserves the original library type spelling while sorting', () => {
    expect(getSystemLibraryDataTypeNames([library([{ name: 'test123', kind: 'struct' }])])).toEqual(['test123'])
  })
})