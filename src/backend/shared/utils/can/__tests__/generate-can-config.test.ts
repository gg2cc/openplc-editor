import type { PLCRemoteDevice } from '../../../types/PLC/open-plc'
import {
  getNextCanopenBusNumber,
  makeCanopenOdEntry,
  makeCanopenPdo,
  makeCanopenPdoMapping,
  makeCanopenSdoEntry,
} from '../../../../../frontend/components/_features/[workspace]/editor/device/canopen/canopen-utils'
import { generateCanConfig } from '../generate-can-config'
import { generateCanopenConfig } from '../generate-canopen-config'

describe('generateCanConfig', () => {
  it('auto-increments CANopen bus, OD, PDO, and SDO numbering from the highest existing values', () => {
    expect(
      getNextCanopenBusNumber([
        { name: 'bus2', interface: 'can2', bitrate: 500000, enabled: true, localNodeId: 127, slaves: [] },
        { name: 'can5', interface: 'can5', bitrate: 500000, enabled: true, localNodeId: 127, slaves: [] },
      ]),
    ).toBe(6)

    const firstOd = makeCanopenOdEntry()
    expect(firstOd.index).toBe(0x1000)
    expect(firstOd.subIndex).toBe(0)
    expect(firstOd.defaultValue).toBe(0)

    const odEntry = makeCanopenOdEntry([{ index: 0x1000 }, { index: 0x1300 }])
    expect(odEntry.index).toBe(0x1310)

    const firstTpdo = makeCanopenPdo('output')
    expect(firstTpdo.index).toBe(0x1800)
    expect(firstTpdo.subIndex).toBe(0)

    const pdo = makeCanopenPdo('output', [{ index: 0x1800 }, { index: 0x1a00 }])
    expect(pdo.index).toBe(0x1a10)

    const firstMapping = makeCanopenPdoMapping('output')
    expect(firstMapping.index).toBe(0x2000)
    expect(firstMapping.subIndex).toBe(0)

    const mapping = makeCanopenPdoMapping('output', [{ index: 0x2000, plcAddress: '%QW0' }, { index: 0x3200, plcAddress: '%QW10' }])
    expect(mapping.index).toBe(0x3210)
    expect(mapping.plcAddress).toBe('%QW11')

    const firstSdo = makeCanopenSdoEntry()
    expect(firstSdo.index).toBe(0x2000)
    expect(firstSdo.subIndex).toBe(0)
    expect(firstSdo.defaultValue).toBe(0)

    const sdo = makeCanopenSdoEntry([{ index: 0x4000 }, { index: 0x4400 }])
    expect(sdo.index).toBe(0x4410)
    expect(sdo.defaultValue).toBe(0)
  })

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

  it('emits a bus-master-slave CANopen structure with explicit slave node ids', () => {
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
              localNodeId: 127,
              bitrate: 500000,
              heartbeatMs: 1000,
              slaves: [
                {
                  name: 'servo-1',
                  nodeId: 3,
                  enabled: true,
                  protectionMode: 'heartbeat_producer',
                  nodeGuardTimeMs: 500,
                  nodeGuardLifeFactor: 3,
                  heartbeatProducerTimeMs: 200,
                  tpdo: [
                    {
                      name: 'tpdo_1',
                      index: 0x1800,
                      subIndex: 0,
                      mapping: [
                        { index: 0x2000, subIndex: 0, bitLength: 16, name: 'out_a', plcAddress: '%QW0', direction: 'output' },
                      ],
                    },
                  ],
                  rpdo: [
                    {
                      name: 'rpdo_1',
                      index: 0x1400,
                      subIndex: 0,
                      mapping: [
                        { index: 0x2100, subIndex: 0, bitLength: 16, name: 'in_a', plcAddress: '%IW0', direction: 'input' },
                      ],
                    },
                  ],
                  sdo: [{ name: 'param_1', index: 0x2000, subIndex: 0, dataType: 'u16', defaultValue: 0 }],
                },
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
    expect(json.buses[0].local_node_id).toBe(127)
    expect(json.buses[0].slaves).toHaveLength(1)
    expect(json.buses[0].slaves[0].node_id).toBe(3)
    expect(json.buses[0].slaves[0].protection_mode).toBe('heartbeat_producer')
    expect(json.buses[0].slaves[0].node_guard_time_ms).toBe(500)
    expect(json.buses[0].slaves[0].node_guard_life_factor).toBe(3)
    expect(json.buses[0].slaves[0].heartbeat_producer_time_ms).toBe(200)
    expect(json.buses[0].slaves[0].tpdo[0].name).toBe('tpdo_1')
    expect(json.buses[0].slaves[0].tpdo[0].mapping[0].plc_address).toBe('%QW0')
    expect(json.buses[0].slaves[0].rpdo[0].name).toBe('rpdo_1')
    expect(json.buses[0].slaves[0].rpdo[0].mapping[0].plc_address).toBe('%IW0')
    expect(json.buses[0].slaves[0].sdo[0].default_value).toBe(0)
  })

  it('keeps local master node and remote slave node ids separate and never defaults slave to 127', () => {
    const remoteDevices: PLCRemoteDevice[] = [
      {
        name: 'canopen-master-only',
        protocol: 'canopen',
        canopenConfig: {
          buses: [
            {
              name: 'bus0',
              enabled: true,
              interface: 'can0',
              localNodeId: 127,
              bitrate: 500000,
              heartbeatMs: 1000,
              slaves: [
                {
                  name: 'servo-1',
                  enabled: true,
                  nodeId: 3,
                  tpdo: [],
                  rpdo: [],
                  sdo: [],
                },
              ],
            },
          ],
        },
      },
    ]

    const output = generateCanopenConfig(remoteDevices)
    expect(output).not.toBeNull()

    const json = JSON.parse(output as string)
    expect(json.buses[0].local_node_id).toBe(127)
    expect(json.buses[0].slaves[0].node_id).toBe(3)
    expect(json.buses[0].slaves[0].node_id).not.toBe(127)
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
              localNodeId: 1,
              bitrate: 500000,
              sjw: 1,
              samplePoint: 0.875,
              restartMs: 100,
              tripleSampling: false,
              heartbeatMs: 1000,
              slaves: [
                {
                  name: 'slave_1',
                  enabled: true,
                  nodeId: 1,
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
                  sdo: [{ name: 'deviceTypeSdo', index: 0x2000, subIndex: 0, dataType: 'u32', defaultValue: 0 }],
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
              localNodeId: 2,
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
    expect(output).toContain('"local_node_id": 1')
    expect(output).toContain('"local_node_id": 2')
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
    expect(output).not.toContain('"plc_address": "%IW0"')
    expect(output).not.toContain('"direction": "input"')
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
              localNodeId: 3,
              bitrate: 500000,
              heartbeatMs: 1000,
              slaves: [
                {
                  name: 'slave_1',
                  enabled: true,
                  nodeId: 3,
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
                    { name: 'sdo_1', index: 0x2000, subIndex: 0, dataType: 'u16', defaultValue: 0 },
                    { name: 'sdo_2', index: 0x2001, subIndex: 0, dataType: 'u32', defaultValue: 0 },
                    { name: 'sdo_3', index: 0x2002, subIndex: 0, dataType: 'u8', defaultValue: 0 },
                  ],
                },
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
    expect(json.buses[0].slaves).toHaveLength(1)
    expect(json.buses[0].slaves[0].sdo).toHaveLength(3)
    expect(json.buses[0].slaves[0].tpdo).toHaveLength(2)
    expect(json.buses[0].slaves[0].rpdo).toHaveLength(1)

    expect(json.buses[0].slaves[0].sdo.map((item: { name: string }) => item.name)).toEqual(['sdo_1', 'sdo_2', 'sdo_3'])
    expect(json.buses[0].slaves[0].tpdo[0].mapping[0].plc_address).toBe('%QW0')
    expect(json.buses[0].slaves[0].tpdo[1].mapping[0].plc_address).toBe('%QB2')
    expect(json.buses[0].slaves[0].rpdo[0].mapping[0].plc_address).toBe('%IW10')
    expect(json.buses[0].slaves[0].sdo[0].default_value).toBe(0)
    expect(json.buses[0].slaves[0].sdo[1].default_value).toBe(0)
    expect(json.buses[0].slaves[0].sdo[2].default_value).toBe(0)
    expect(json.buses[0].slaves[0].sdo[0]).not.toHaveProperty('binding')
    expect(json.buses[0].slaves[0].tpdo[0].mapping[0]).not.toHaveProperty('binding')

    expect(output).toContain('"plc_address": "%QW0"')
    expect(output).toContain('"plc_address": "%QB2"')
    expect(output).toContain('"plc_address": "%IW10"')
    expect(output).not.toContain('"plc_address": "%IW0"')
    expect(output).not.toContain('"plc_address": "%ID1"')
    expect(output).not.toContain('"plc_address": "%IB2"')
    expect(output).not.toContain('"binding"')
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
              localNodeId: 1,
              bitrate: 500000,
              sjw: 1,
              samplePoint: 0.875,
              restartMs: 100,
              tripleSampling: false,
              heartbeatMs: 1000,
              syncPeriodMs: 1000,
              slaves: [
                {
                  name: 'slave_1',
                  enabled: true,
                  nodeId: 1,
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
                  sdo: [{ name: 'param_1', index: 0x2000, subIndex: 0, dataType: 'u32', defaultValue: 0 }],
                },
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
    expect(json.buses[0].local_node_id).toBe(1)
    expect(json.buses[0].bitrate).toBe(500000)
    expect(json.buses[0].sjw).toBe(1)
    expect(json.buses[0].sample_point).toBe(0.875)
    expect(json.buses[0].restart_ms).toBe(100)
    expect(json.buses[0].triple_sampling).toBe(false)
    expect(json.buses[0].heartbeat_ms).toBe(1000)
    expect(json.buses[0].sync_period_ms).toBe(1000)
    expect(json.buses[0].slaves[0].od_entries).toHaveLength(2)
    expect(json.buses[0].slaves[0].od_entries[0].name).toBe('entry_1')
    expect(json.buses[0].slaves[0].od_entries[0].index).toBe(4096)
    expect(json.buses[0].slaves[0].tpdo[0].mapping[0].plc_address).toBe('%QW0')
    expect(json.buses[0].slaves[0].rpdo[0].mapping[0].plc_address).toBe('%IW0')
    expect(json.buses[0].slaves[0].sdo[0].default_value).toBe(0)
    expect(output).toContain('"can0"')
    expect(output).toContain('"bus0"')
    expect(output).toContain('"entry_1"')
    expect(output).toContain('"%QW0"')
    expect(output).toContain('"%IW0"')
  })
})
