const DEFAULT_RETAIN_PATH = '/var/lib/openplc-runtime/retain.bin'
const DEFAULT_FLUSH_SECONDS = 5
const RETAIN_DECLARATION = /\bVAR(?:_GLOBAL)?\s+RETAIN\b/i

/** Emit the Runtime v4 retain configuration when the generated program uses RETAIN. */
export function generateRetainConf(programSt: string): string | null {
  if (!RETAIN_DECLARATION.test(programSt)) return null

  return [
    '# Persistent storage for RETAIN variables.',
    'enabled=1',
    `path=${DEFAULT_RETAIN_PATH}`,
    `flush_seconds=${DEFAULT_FLUSH_SECONDS}`,
    '',
  ].join('\n')
}