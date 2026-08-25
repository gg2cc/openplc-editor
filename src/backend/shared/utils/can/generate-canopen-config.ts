import type { PLCRemoteDevice } from '../../types/PLC/open-plc'

/**
 * Generates the runtime multi-bus CANopen config, matching the CANopenNode
 * multi-interface model while remaining compatible with the editor's project
 * schema. Supports up to 8 buses total.
 */
export function generateCanopenConfig(remoteDevices: PLCRemoteDevice[] | undefined): string | null {
  if (!remoteDevices) return null

  const canopenDevices = remoteDevices.filter((device) => device.protocol === 'canopen' && device.canopenConfig)
  if (canopenDevices.length === 0) return null

  const buses = canopenDevices.flatMap((device) => {
    const config = device.canopenConfig
    if (!config || !config.buses?.length) return []

    return config.buses.filter((bus) => bus.enabled !== false).map((bus) => ({
      name: bus.name,
      interface: bus.interface,
      enabled: bus.enabled ?? true,
      node_id: bus.nodeId,
      bitrate: bus.bitrate,
      heartbeat_ms: bus.heartbeatMs ?? 1000,
      sync_period_ms: bus.syncPeriodMs ?? 0,
      tpdo: (bus.tpdo ?? []).map((pdo) => ({
        index: pdo.index,
        sub_index: pdo.subIndex ?? 0,
        mapping: (pdo.mapping ?? []).map((entry) => ({
          index: entry.index,
          sub_index: entry.subIndex ?? 0,
          bit_length: entry.bitLength ?? 8,
          name: entry.name ?? '',
        })),
      })),
      rpdo: (bus.rpdo ?? []).map((pdo) => ({
        index: pdo.index,
        sub_index: pdo.subIndex ?? 0,
        mapping: (pdo.mapping ?? []).map((entry) => ({
          index: entry.index,
          sub_index: entry.subIndex ?? 0,
          bit_length: entry.bitLength ?? 8,
          name: entry.name ?? '',
        })),
      })),
    }))
  })

  if (buses.length === 0) return null

  const deduped = buses.slice(0, 8)
  return JSON.stringify({ buses: deduped }, null, 2)
}
