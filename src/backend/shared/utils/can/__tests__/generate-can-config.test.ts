import type { PLCRemoteDevice } from '../../../types/PLC/open-plc'
import { generateCanConfig } from '../generate-can-config'
import { generateCanopenConfig } from '../generate-canopen-config'

describe('generateCanConfig', () => {
  it('returns null when no CAN remote device is configured', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'modbus',
        protocol: 'modbus-tcp',
        modbusTcpConfig: { host: '127.0.0.1', port: 502, slaveId: 1, timeout: 1000, ioGroups: [] },
      },
    ]

    expect(generateCanConfig(remoteDevices)).toBeNull()
  })

  it('returns null when CAN exists only with the default empty hardware template', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'can-bus',
        protocol: 'can',
        canConfig: {
          hardwareConfig: {
            interface: 'can0',
            bitrate: 500000,
            sjw: 1,
            samplePoint: 0.875,
            restartMs: 100,
            tripleSampling: false,
          },
          rxFrames: [],
          txFrames: [],
        },
      },
    ]

    expect(generateCanConfig(remoteDevices)).toBeNull()
  })

  it('returns multi-interface JSON when CAN devices have real runtime configuration', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'can0',
        protocol: 'can',
        canConfig: {
          hardwareConfig: {
            interface: 'can0',
            bitrate: 250000,
            sjw: 2,
            samplePoint: 0.8,
            restartMs: 200,
            tripleSampling: true,
          },
          rxFrames: [
            {
              canId: '0x123',
              dlc: 8,
              mappings: [{ byteOffset: 0, iecType: 'BYTE_INPUT', iecIndex: 0 }],
            },
          ],
          txFrames: [],
        },
      },
      {
        name: 'can1',
        protocol: 'can',
        canConfig: {
          hardwareConfig: {
            interface: 'can1',
            bitrate: 500000,
            sjw: 1,
            samplePoint: 0.875,
            restartMs: 100,
            tripleSampling: false,
          },
          rxFrames: [],
          txFrames: [
            {
              canId: '0x456',
              dlc: 8,
              mappings: [{ byteOffset: 0, iecType: 'BYTE_OUTPUT', iecIndex: 0 }],
            },
          ],
        },
      },
    ]

    const output = generateCanConfig(remoteDevices)

    expect(output).not.toBeNull()
    expect(output).toContain('"interfaces"')
    expect(output).toContain('"interface": "can0"')
    expect(output).toContain('"interface": "can1"')
    expect(output).toContain('"rx_frames"')
    expect(output).toContain('"tx_frames"')
  })

  it('creates a CANopen multi-bus config for up to 8 buses', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'canopen-bus-0',
        protocol: 'canopen',
        canopenConfig: {
          buses: [
            {
              name: 'bus0',
              enabled: true,
              interface: 'can0',
              nodeId: 1,
              bitrate: 500000,
              sjw: 1,
              samplePoint: 0.875,
              restartMs: 100,
              tripleSampling: false,
              heartbeatMs: 1000,
              tpdo: [{ index: 0x1800, subIndex: 0, mapping: [{ index: 0x2000, subIndex: 0, bitLength: 16 }] }],
            },
          ],
        },
      },
      {
        name: 'canopen-bus-1',
        protocol: 'canopen',
        canopenConfig: {
          buses: [
            {
              name: 'bus1',
              enabled: true,
              interface: 'can1',
              nodeId: 2,
              bitrate: 250000,
              heartbeatMs: 2000,
            },
          ],
        },
      },
    ]

    const output = generateCanopenConfig(remoteDevices)

    expect(output).not.toBeNull()
    expect(output).toContain('"buses"')
    expect(output).toContain('"interface": "can0"')
    expect(output).toContain('"interface": "can1"')
    expect(output).toContain('"node_id": 1')
    expect(output).toContain('"node_id": 2')
    expect(output).toContain('"sjw": 1')
    expect(output).toContain('"sample_point": 0.875')
    expect(output).toContain('"restart_ms": 100')
    expect(output).toContain('"triple_sampling": false')
  })
})
