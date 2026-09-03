import type { SystemLibrary } from '../../middleware/shared/ports/library-types'

const isNamed = (value: { name?: unknown }): value is { name: string } =>
  typeof value.name === 'string' && value.name.length > 0

/** Return exported struct/enum/alias names for display in IEC type selectors. */
export function getSystemLibraryDataTypeNames(libraries: SystemLibrary[], excludedName?: string): string[] {
  const excluded = excludedName?.toUpperCase()
  return Array.from(
    new Set(
      libraries
        .flatMap((library) => library.types ?? [])
        .filter(isNamed)
        .map((type) => type.name.toUpperCase())
        .filter((name) => name !== 'ARRAY' && name !== excluded),
    ),
  )
}
