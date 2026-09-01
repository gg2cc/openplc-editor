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

    return config.buses.filter((bus) => bus.enabled !== false).map((bus) => {
      const localNodeId = bus.localNodeId ?? 127
      const fallbackSlaveNodeId = 1
      const baseSlaves = bus.slaves && bus.slaves.length > 0
        ? bus.slaves
        : [
            {
              name: bus.name || 'main_slave',
              nodeId: fallbackSlaveNodeId,
              enabled: true,
              tpdo: [],
              rpdo: [],
              sdo: [],
            },
          ]

      const slaves = baseSlaves.map((slave, index) => ({
        ...slave,
        nodeId: slave.nodeId ?? (index + 1),
      }))

      return {
        name: bus.name,
        interface: bus.interface,
        enabled: bus.enabled ?? true,
        local_node_id: localNodeId,
        bitrate: bus.bitrate,
        sjw: bus.sjw ?? 1,
        sample_point: bus.samplePoint ?? 0.875,
        restart_ms: bus.restartMs ?? 100,
        triple_sampling: bus.tripleSampling ?? false,
        heartbeat_ms: bus.heartbeatMs ?? 1000,
        sync_period_ms: bus.syncPeriodMs ?? 0,
        slaves: slaves.filter((slave) => slave.enabled !== false).map((slave) => ({
          name: slave.name,
          node_id: slave.nodeId,
          enabled: slave.enabled ?? true,
          protection_mode: slave.protectionMode ?? 'node_guarding',
          node_guard_time_ms: slave.nodeGuardTimeMs ?? 500,
          node_guard_life_factor: slave.nodeGuardLifeFactor ?? 3,
          heartbeat_producer_time_ms: slave.heartbeatProducerTimeMs ?? 500,
          tpdo: (slave.tpdo ?? []).map((pdo) => ({
            name: pdo.name ?? '',
            index: pdo.index,
            sub_index: pdo.subIndex ?? 0,
            mapping: (pdo.mapping ?? []).map((entry) => ({
              index: entry.index,
              sub_index: entry.subIndex ?? 0,
              data_type: entry.dataType ?? 'u16',
              name: entry.name ?? '',
              plc_address: entry.plcAddress ?? null,
              direction: entry.direction ?? null,
            })),
          })),
          rpdo: (slave.rpdo ?? []).map((pdo) => ({
            name: pdo.name ?? '',
            index: pdo.index,
            sub_index: pdo.subIndex ?? 0,
            mapping: (pdo.mapping ?? []).map((entry) => ({
              index: entry.index,
              sub_index: entry.subIndex ?? 0,
              data_type: entry.dataType ?? 'u16',
              name: entry.name ?? '',
              plc_address: entry.plcAddress ?? null,
              direction: entry.direction ?? null,
            })),
          })),
          sdo: (slave.sdo ?? []).map((entry) => ({
            name: entry.name ?? '',
            index: entry.index,
            sub_index: entry.subIndex ?? 0,
            data_type: entry.dataType ?? 'u32',
            default_value: entry.defaultValue ?? 0,
            description: entry.description ?? '',
          })),
        })),
      }
    })
  })

  if (buses.length === 0) return null

  const deduped = buses.slice(0, 8)
  return JSON.stringify({ buses: deduped }, null, 2)
}
