import { StatsTable, type StatsTableColumn } from '@root/frontend/components/_molecules/stats-table'
import type { PluginStatsField, PluginStatsPayload, PluginStatsRow, TimingStats } from '@root/middleware/shared/ports/types'

interface PluginStatsPanelProps {
  /** Optional opaque plugin-contributed stats from the runtime. Each
   *  entry is rendered as its own labelled stats table. Renders nothing
   *  when undefined or empty. */
  pluginStats: TimingStats['plugin_stats']
}

interface FlattenedPluginStatsEntry {
  key: string
  title: string
  fields: PluginStatsField[]
  rows?: PluginStatsRow[]
}

const flattenPluginStats = (
  pluginName: string,
  payload: PluginStatsPayload | Record<string, PluginStatsPayload> | undefined,
): FlattenedPluginStatsEntry[] => {
  if (!payload || typeof payload !== 'object') return []

  const hasInterfaceGroup =
    'interfaces' in payload &&
    payload.interfaces &&
    typeof payload.interfaces === 'object' &&
    !Array.isArray(payload.interfaces)

  if (hasInterfaceGroup) {
    const groupedInterfaces = payload.interfaces as Record<string, PluginStatsPayload>
    return Object.entries(groupedInterfaces).map(([ifaceName, ifacePayload]) => ({
      key: `${pluginName}-${ifaceName}`,
      title: ifacePayload?.label ?? `${pluginName} (${ifaceName})`,
      fields: ifacePayload?.fields ?? [],
      rows: ifacePayload?.rows,
    }))
  }

  const legacyPayload = payload as PluginStatsPayload
  if ('label' in legacyPayload && 'fields' in legacyPayload && Array.isArray(legacyPayload.fields)) {
    return [
      {
        key: `${pluginName}`,
        title: legacyPayload.label,
        fields: legacyPayload.fields,
        rows: legacyPayload.rows,
      },
    ]
  }

  return Object.entries(payload).map(([key, val]) => ({
    key: `${pluginName}-${key}`,
    title: val && typeof val === 'object' && 'label' in val ? String(val.label) : `${pluginName} (${key})`,
    fields:
      val && typeof val === 'object' && 'fields' in val && Array.isArray(val.fields)
        ? (val.fields as PluginStatsField[])
        : [],
    rows:
      val && typeof val === 'object' && 'rows' in val && Array.isArray(val.rows)
        ? (val.rows as PluginStatsRow[])
        : undefined,
  }))
}

const renderField = (field?: PluginStatsField) => {
  if (!field) return <span className='font-semibold text-neutral-500 dark:text-neutral-400'>-</span>
  const display = typeof field.value === 'boolean' ? (field.value ? 'Yes' : 'No') : field.value
  return (
    <span className='inline-flex items-baseline justify-center gap-1'>
      <span className='font-semibold text-neutral-900 dark:text-white'>{display}</span>
      {field.unit && <span className='text-[10px] text-neutral-500 dark:text-neutral-400'>{field.unit}</span>}
    </span>
  )
}

/**
 * Plugin-contributed statistics panel.
 *
 * The runtime's `STATS` response can carry an opaque
 * `plugin_stats: Record<pluginName, { label, fields }>` map populated by
 * any plugin that exports `get_stats`. The editor doesn't know what the
 * fields semantically represent — it just renders them under each
 * plugin's label so users see the metrics the plugin author intends to
 * surface.
 *
 * Each plugin renders as a single-row StatsTable: one column per declared
 * field, the row carries the values. This keeps every stats section on
 * the device-config screen visually uniform with scan-cycle / EtherCAT
 * (same table chrome, same monospaced metric font, same `min/max` layout
 * when a plugin opts into RangeCell). Used both on the device-board
 * screen (Electron) and the orchestrators screen (web) so VPP packages
 * contribute identical telemetry regardless of how the user navigated to
 * the device.
 */
export const PluginStatsPanel = ({ pluginStats }: PluginStatsPanelProps) => {
  if (!pluginStats || Object.keys(pluginStats).length === 0) return null

  return (
    <>
      {Object.entries(pluginStats).flatMap(([pluginName, payload]) => {
        const flattenedRows = flattenPluginStats(pluginName, payload as PluginStatsPayload | Record<string, PluginStatsPayload>)

        return flattenedRows.map((row) => {
          const tableRows = row.rows && row.rows.length > 0 ? row.rows : [{ key: row.key, fields: row.fields }]
          const columnFields = tableRows[0]?.fields ?? []
          const columns: StatsTableColumn<PluginStatsRow>[] = columnFields.map((field, idx) => ({
            key: `${row.key}-${idx}`,
            header: field.label,
            render: (p) => renderField(p.fields[idx]),
          }))

          return (
            <StatsTable
              key={row.key}
              context={`plugin-stats-${row.key}`}
              title={row.title}
              columns={columns}
              rows={tableRows}
              rowKey={(tableRow) => `${row.key}-${tableRow.key}`}
            />
          )
        })
      })}
    </>
  )
}
