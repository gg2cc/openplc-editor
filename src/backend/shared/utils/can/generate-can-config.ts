import type { PLCRemoteDevice } from '../../types/PLC/open-plc'

/**
 * Generates the runtime `conf/can.json` file content from the project's
 * `remoteDevices`.
 * Returns `null` if no CAN remote device with valid `canConfig` is defined.
 */
export function generateCanConfig(remoteDevices: PLCRemoteDevice[] | undefined): string | null {
  if (!remoteDevices) return null

  const canDevices = remoteDevices.filter((device) => device.protocol === 'can' && device.canConfig)
  if (canDevices.length === 0) return null

  const interfaces = canDevices.flatMap((device) => {
    const { hardwareConfig, rxFrames = [], txFrames = [] } = device.canConfig ?? {}

    const hasRealConfig =
      (rxFrames?.length ?? 0) > 0 ||
      (txFrames?.length ?? 0) > 0 ||
      !!hardwareConfig &&
        (hardwareConfig.interface !== 'can0' ||
          hardwareConfig.bitrate !== 500000 ||
          hardwareConfig.sjw !== 1 ||
          hardwareConfig.samplePoint !== 0.875 ||
          hardwareConfig.restartMs !== 100 ||
          hardwareConfig.tripleSampling !== false)

    if (!hasRealConfig) return []

    return [
      {
        interface: hardwareConfig?.interface ?? 'can0',
        hardware_config: {
          interface: hardwareConfig?.interface ?? 'can0',
          bitrate: hardwareConfig?.bitrate ?? 500000,
          sjw: hardwareConfig?.sjw ?? 1,
          sample_point: hardwareConfig?.samplePoint ?? 0.875,
          restart_ms: hardwareConfig?.restartMs ?? 100,
          triple_sampling: hardwareConfig?.tripleSampling ?? false,
        },
        rx_frames: rxFrames.map((frame) => ({
          can_id: frame.canId || '0x0',
          eff: frame.eff ?? false,
          rtr: frame.rtr ?? false,
          dlc: frame.dlc ?? 8,
          mappings: (frame.mappings ?? []).map((m) => ({
            byte_offset: m.byteOffset ?? 0,
            iec_type: m.iecType ?? 'BYTE_INPUT',
            iec_index: m.iecIndex ?? 0,
          })),
        })),
        tx_frames: txFrames.map((frame) => ({
          can_id: frame.canId || '0x0',
          eff: frame.eff ?? false,
          dlc: frame.dlc ?? 8,
          trigger: frame.trigger ?? 'cyclic',
          cycle_time_ms: frame.cycleTimeMs ?? 10,
          mappings: (frame.mappings ?? []).map((m) => ({
            byte_offset: m.byteOffset ?? 0,
            iec_type: m.iecType ?? 'BYTE_OUTPUT',
            iec_index: m.iecIndex ?? 0,
          })),
        })),
      },
    ]
  })

  if (interfaces.length === 0) return null

  return JSON.stringify({ interfaces }, null, 2)
}
