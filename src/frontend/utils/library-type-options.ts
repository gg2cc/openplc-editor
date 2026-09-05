import type { SystemLibrary } from '../../middleware/shared/ports/library-types'

const isNamed = (value: { name?: unknown }): value is { name: string } =>
  typeof value.name === 'string' && value.name.length > 0

/** Return exported struct/enum/alias names for display in IEC type selectors. */
export function getSystemLibraryDataTypeNames(libraries: SystemLibrary[], excludedName?: string): string[] {
  const excluded = excludedName?.toUpperCase()
  const names = new Map<string, string>()
  for (const type of libraries.flatMap((library) => library.types ?? []).filter(isNamed)) {
    const name = type.name
    const key = name.toUpperCase()
    if (key === 'ARRAY' || key === excluded || names.has(key)) continue
    names.set(key, name)
  }
  return [...names.values()]
}

/** Merge sorted type groups while keeping the first spelling for each case-insensitive name. */
export function mergeTypeNames(...nameLists: string[][]): string[] {
  const names = new Map<string, string>()
  for (const nameList of nameLists) {
    const sortedNames = [...nameList].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }))
    for (const name of sortedNames) {
      const key = name.toUpperCase()
      if (!names.has(key)) names.set(key, name)
    }
  }
  return [...names.values()]
}
