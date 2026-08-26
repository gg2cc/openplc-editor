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

  it('creates a CANopen multi-bus config for up to 8 buses and keeps OD metadata separate from PLC binding', () => {
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
              odEntries: [
                {
                  name: 'deviceType',
                  index: 0x1000,
                  subIndex: 0,
                  dataType: 'u32',
                  access: 'ro',
                  defaultValue: 0,
                },
              ],
              tpdo: [
                {
                  index: 0x1800,
                  subIndex: 0,
                  mapping: [
                    {
                      index: 0x2000,
                      subIndex: 0,
                      bitLength: 16,
                      name: 'deviceType',
                      plcAddress: '%QW0',
                      direction: 'output',
                    },
                  ],
                },
              ],
              sdo: [
                {
                  name: 'deviceTypeSdo',
                  index: 0x2000,
                  subIndex: 0,
                  dataType: 'u32',
                  access: 'rw',
                  plcAddress: '%IW0',
                  direction: 'input',
                },
              ],
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
    expect(output).toContain('"od_entries"')
    expect(output).toContain('"index": 4096')
    expect(output).toContain('"data_type": "u32"')
    expect(output).toContain('"access": "ro"')
    expect(output).toContain('"mapping"')
    expect(output).toContain('"plc_address": "%QW0"')
    expect(output).toContain('"direction": "output"')
    expect(output).toContain('"sdo"')
    expect(output).toContain('"plc_address": "%IW0"')
    expect(output).toContain('"direction": "input"')
  })

  it('generates JSON with 3 SDO entries and 2 PDO groups and bound PLC addresses', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'canopen-demo',
        protocol: 'canopen',
        canopenConfig: {
          buses: [
            {
              name: 'bus0',
              enabled: true,
              interface: 'can0',
              nodeId: 3,
              bitrate: 500000,
              heartbeatMs: 1000,
              tpdo: [
                {
                  index: 0x1800,
                  subIndex: 0,
                  mapping: [
                    { index: 0x2000, subIndex: 0, bitLength: 16, name: 'out_a', plcAddress: '%QW0', direction: 'output' },
                    { index: 0x2001, subIndex: 0, bitLength: 32, name: 'out_b', plcAddress: '%QD1', direction: 'output' },
                  ],
                },
                {
                  index: 0x1801,
                  subIndex: 0,
                  mapping: [
                    { index: 0x2002, subIndex: 0, bitLength: 8, name: 'out_c', plcAddress: '%QB2', direction: 'output' },
                  ],
                },
              ],
              rpdo: [
                {
                  index: 0x1400,
                  subIndex: 0,
                  mapping: [
                    { index: 0x2100, subIndex: 0, bitLength: 16, name: 'in_a', plcAddress: '%IW10', direction: 'input' },
                  ],
                },
              ],
              sdo: [
                { name: 'sdo_1', index: 0x2000, subIndex: 0, dataType: 'u16', access: 'rw', plcAddress: '%IW0', direction: 'input' },
                { name: 'sdo_2', index: 0x2001, subIndex: 0, dataType: 'u32', access: 'rw', plcAddress: '%ID1', direction: 'input' },
                { name: 'sdo_3', index: 0x2002, subIndex: 0, dataType: 'u8', access: 'rw', plcAddress: '%IB2', direction: 'output' },
              ],
            },
          ],
        },
      },
    ]

    const output = generateCanopenConfig(remoteDevices)
    expect(output).not.toBeNull()

    const json = JSON.parse(output as string)
    expect(json.buses).toHaveLength(1)
    expect(json.buses[0].sdo).toHaveLength(3)
    expect(json.buses[0].tpdo).toHaveLength(2)
    expect(json.buses[0].rpdo).toHaveLength(1)

    expect(json.buses[0].sdo.map((item: { name: string }) => item.name)).toEqual(['sdo_1', 'sdo_2', 'sdo_3'])
    expect(json.buses[0].tpdo[0].mapping[0].plc_address).toBe('%QW0')
    expect(json.buses[0].tpdo[1].mapping[0].plc_address).toBe('%QB2')
    expect(json.buses[0].rpdo[0].mapping[0].plc_address).toBe('%IW10')
    expect(json.buses[0].sdo[0].plc_address).toBe('%IW0')
    expect(json.buses[0].sdo[1].plc_address).toBe('%ID1')
    expect(json.buses[0].sdo[2].plc_address).toBe('%IB2')

    expect(output).toContain('"plc_address": "%QW0"')
    expect(output).toContain('"plc_address": "%QB2"')
    expect(output).toContain('"plc_address": "%IW10"')
    expect(output).toContain('"plc_address": "%IW0"')
    expect(output).toContain('"plc_address": "%ID1"')
    expect(output).toContain('"plc_address": "%IB2"')
  })

  it('matches a multi-bus CANopen profile with OD entries and bus metadata from the editor form', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'canopen-test',
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
              syncPeriodMs: 1000,
              odEntries: [
                { name: 'entry_1', index: 0x1000, subIndex: 0, dataType: 'u32', access: 'ro', defaultValue: 1 },
                { name: 'entry_2', index: 0x1001, subIndex: 0, dataType: 'u32', access: 'rw', defaultValue: 2 },
              ],
              tpdo: [
                {
                  index: 0x1800,
                  subIndex: 0,
                  mapping: [
                    { index: 0x2000, subIndex: 0, bitLength: 16, name: 'out_word', plcAddress: '%QW0', direction: 'output' },
                  ],
                },
              ],
              rpdo: [
                {
                  index: 0x1400,
                  subIndex: 0,
                  mapping: [
                    { index: 0x2100, subIndex: 0, bitLength: 16, name: 'in_word', plcAddress: '%IW0', direction: 'input' },
                  ],
                },
              ],
              sdo: [
                { name: 'param_1', index: 0x2000, subIndex: 0, dataType: 'u32', access: 'rw', plcAddress: '%ID10', direction: 'input' },
              ],
            },
          ],
        },
      },
    ]

    const output = generateCanopenConfig(remoteDevices)
    expect(output).not.toBeNull()

    const json = JSON.parse(output as string)
    expect(json.buses).toHaveLength(1)
    expect(json.buses[0].name).toBe('bus0')
    expect(json.buses[0].interface).toBe('can0')
    expect(json.buses[0].node_id).toBe(1)
    expect(json.buses[0].bitrate).toBe(500000)
    expect(json.buses[0].sjw).toBe(1)
    expect(json.buses[0].sample_point).toBe(0.875)
    expect(json.buses[0].restart_ms).toBe(100)
    expect(json.buses[0].triple_sampling).toBe(false)
    expect(json.buses[0].heartbeat_ms).toBe(1000)
    expect(json.buses[0].sync_period_ms).toBe(1000)
    expect(json.buses[0].od_entries).toHaveLength(2)
    expect(json.buses[0].od_entries[0].name).toBe('entry_1')
    expect(json.buses[0].od_entries[0].index).toBe(4096)
    expect(json.buses[0].tpdo[0].mapping[0].plc_address).toBe('%QW0')
    expect(json.buses[0].rpdo[0].mapping[0].plc_address).toBe('%IW0')
    expect(json.buses[0].sdo[0].plc_address).toBe('%ID10')
    expect(output).toContain('"can0"')
    expect(output).toContain('"bus0"')
    expect(output).toContain('"entry_1"')
    expect(output).toContain('"%QW0"')
    expect(output).toContain('"%IW0"')
    expect(output).toContain('"%ID10"')
  })
})
