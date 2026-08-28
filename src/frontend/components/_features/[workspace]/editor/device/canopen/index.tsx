import * as Tabs from '@radix-ui/react-tabs'
import type {
  CanopenBusConfig,
  CanopenConfig,
  CanopenOdEntry,
  CanopenPdo,
  CanopenPdoMapping,
  CanopenSdoEntry,
  CanopenSlaveConfig,
} from '@root/middleware/shared/ports/types'
import { useCallback, useMemo, useState } from 'react'

import { PlusIcon } from '../../../../../../assets/icons/interface/Plus'
import { useOpenPLCStore } from '../../../../../../store'
import { InputWithRef } from '../../../../../_atoms/input'
import { Label } from '../../../../../_atoms/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../../../_atoms/select'
import { ToggleSwitch } from '../../../../../_atoms/toggle-switch'
import {
  getNextCanopenBusNumber,
  makeCanopenOdEntry,
  makeCanopenPdo,
  makeCanopenPdoMapping,
  makeCanopenSdoEntry,
} from './canopen-utils'

const CANOPEN_BITRATE_OPTIONS = [
  { value: '100000', label: '100 kbps' },
  { value: '125000', label: '125 kbps' },
  { value: '250000', label: '250 kbps' },
  { value: '500000', label: '500 kbps' },
  { value: '1000000', label: '1 Mbps' },
]

const CAN_SELECT_TRIGGER_STYLES =
  'flex h-[30px] w-full items-center justify-between gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 font-caption !text-xs font-medium text-neutral-850 outline-none data-[state=open]:border-brand-medium-dark dark:border-neutral-850 dark:bg-neutral-950 dark:text-neutral-300'

const CAN_SELECT_CONTENT_STYLES =
  'h-fit max-h-[200px] w-[--radix-select-trigger-width] overflow-y-auto rounded-lg border border-neutral-300 bg-white outline-none drop-shadow-lg dark:border-brand-medium-dark dark:bg-neutral-950'

const CAN_SELECT_ITEM_STYLES =
  'data-[state=checked]:[&:not(:hover)]:bg-neutral-100 data-[state=checked]:dark:[&:not(:hover)]:bg-neutral-900 flex w-full cursor-pointer items-center justify-start px-2 py-1 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800'

const inputStyles =
  'h-[30px] w-full rounded-md border border-neutral-300 bg-white px-2 py-1 font-caption text-cp-sm font-medium text-neutral-850 outline-none focus:border-brand-medium-dark dark:border-neutral-850 dark:bg-neutral-950 dark:text-neutral-300'

const defaultCanopenSlave = (): CanopenSlaveConfig => ({
  name: 'slave_1',
  enabled: true,
  nodeId: 1,
  odEntries: [],
  tpdo: [],
  rpdo: [],
  sdo: [],
})


const defaultCanopenBus = (buses: CanopenBusConfig[] = []): CanopenBusConfig => {
  const nextBusNumber = getNextCanopenBusNumber(buses)
  return {
    name: `bus${nextBusNumber}`,
    enabled: true,
    interface: `can${nextBusNumber}`,
    localNodeId: 127,
    bitrate: 500000,
    sjw: 1,
    samplePoint: 0.875,
    restartMs: 100,
    tripleSampling: false,
    heartbeatMs: 1000,
    syncPeriodMs: 0,
    slaves: [defaultCanopenSlave()],
  }
}

const defaultCanopenConfig = (): CanopenConfig => ({
  buses: [defaultCanopenBus()],
})

const CANOPEN_DATA_TYPES = ['bool', 'u8', 'i8', 'u16', 'i16', 'u32', 'i32', 'u64', 'i64', 'f32', 'f64'] as const
const CANOPEN_ACCESS_OPTIONS = ['ro', 'wo', 'rw', 'rwr', 'const'] as const
const CANOPEN_DIRECTION_OPTIONS = ['input', 'output'] as const


const updateCanopenBus = (buses: CanopenBusConfig[], index: number, updates: Partial<CanopenBusConfig>): CanopenBusConfig[] => {
  const next = [...buses]
  next[index] = { ...next[index], ...updates }
  return next
}

type CanopenSlaveArrayKey = 'odEntries' | 'tpdo' | 'rpdo' | 'sdo'

type CanopenSlaveArrayMap = {
  odEntries: CanopenOdEntry[]
  tpdo: CanopenPdo[]
  rpdo: CanopenPdo[]
  sdo: CanopenSdoEntry[]
}

const updateCanopenSlaveArray = <K extends CanopenSlaveArrayKey>(
  buses: CanopenBusConfig[],
  busIndex: number,
  slaveIndex: number,
  key: K,
  updater: (items: CanopenSlaveArrayMap[K]) => CanopenSlaveArrayMap[K],
): CanopenBusConfig[] => {
  const nextBuses = [...buses]
  const current = nextBuses[busIndex]?.slaves ?? []
  const next = [...current]
  const slave: CanopenSlaveConfig = { ...(next[slaveIndex] ?? defaultCanopenSlave()) }
  const items = (slave[key] ?? []) as CanopenSlaveArrayMap[K]
  const updatedItems = updater(items)

  switch (key) {
    case 'odEntries':
      slave.odEntries = updatedItems as CanopenOdEntry[]
      break
    case 'tpdo':
      slave.tpdo = updatedItems as CanopenPdo[]
      break
    case 'rpdo':
      slave.rpdo = updatedItems as CanopenPdo[]
      break
    case 'sdo':
      slave.sdo = updatedItems as CanopenSdoEntry[]
      break
  }

  next[slaveIndex] = slave
  nextBuses[busIndex] = { ...nextBuses[busIndex], slaves: next }
  return nextBuses
}

const updateCanopenPdo = (
  buses: CanopenBusConfig[],
  busIndex: number,
  slaveIndex: number,
  pdoType: 'tpdo' | 'rpdo',
  pdoIndex: number,
  updates: Partial<CanopenPdo>,
): CanopenBusConfig[] => {
  const nextBuses = [...buses]
  const current = nextBuses[busIndex]?.slaves ?? []
  const next = [...current]
  const slave: CanopenSlaveConfig = { ...(next[slaveIndex] ?? defaultCanopenSlave()) }
  const pdos: CanopenPdo[] = [...(slave[pdoType] ?? [])]
  const currentPdo = pdos[pdoIndex] ?? makeCanopenPdo(pdoType === 'rpdo' ? 'input' : 'output')
  pdos[pdoIndex] = { ...currentPdo, ...updates }
  slave[pdoType] = pdos
  next[slaveIndex] = slave
  nextBuses[busIndex] = { ...nextBuses[busIndex], slaves: next }
  return nextBuses
}

const updateCanopenPdoMapping = (
  buses: CanopenBusConfig[],
  busIndex: number,
  slaveIndex: number,
  pdoType: 'tpdo' | 'rpdo',
  pdoIndex: number,
  mappingIndex: number,
  updates: Partial<CanopenPdoMapping>,
): CanopenBusConfig[] => {
  const nextBuses = [...buses]
  const current = nextBuses[busIndex]?.slaves ?? []
  const next = [...current]
  const slave: CanopenSlaveConfig = { ...(next[slaveIndex] ?? defaultCanopenSlave()) }
  const pdos: CanopenPdo[] = [...(slave[pdoType] ?? [])]
  const currentPdo = pdos[pdoIndex] ?? makeCanopenPdo(pdoType === 'rpdo' ? 'input' : 'output')
  const mappings: CanopenPdoMapping[] = [...(currentPdo.mapping ?? [])]
  mappings[mappingIndex] = { ...mappings[mappingIndex], ...updates }
  pdos[pdoIndex] = { ...currentPdo, mapping: mappings }
  slave[pdoType] = pdos
  next[slaveIndex] = slave
  nextBuses[busIndex] = { ...nextBuses[busIndex], slaves: next }
  return nextBuses
}

const CanopenDeviceEditor = () => {
  const {
    editor,
    project,
    projectActions,
    sharedWorkspaceActions: { handleFileAndWorkspaceSavedState },
  } = useOpenPLCStore()

  const deviceName = editor.type === 'plc-remote-device' ? editor.meta.name : ''

  const device = useMemo(() => {
    return project.data.remoteDevices?.find((d) => d.name === deviceName)
  }, [project.data.remoteDevices, deviceName])

  const canopenConfig: CanopenConfig = useMemo(() => {
    return device?.canopenConfig ?? defaultCanopenConfig()
  }, [device])

  const updateCanopenStore = useCallback(
    (newConfig: CanopenConfig) => {
      if (!deviceName) return
      projectActions.updateCanopenConfig(deviceName, newConfig)
      handleFileAndWorkspaceSavedState(deviceName)
    },
    [deviceName, projectActions, handleFileAndWorkspaceSavedState],
  )

  const [activeBusTab, setActiveBusTab] = useState('0')
  const [activeSlaveTab, setActiveSlaveTab] = useState<Record<number, string>>({})

  const handleCanopenBusChange = useCallback(
    (busIndex: number, updates: Partial<CanopenBusConfig>) => {
      updateCanopenStore({ buses: updateCanopenBus(canopenConfig.buses, busIndex, updates) })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleCanopenSlaveChange = useCallback(
    (busIndex: number, slaveIndex: number, updates: Partial<CanopenSlaveConfig>) => {
      const nextBuses = [...canopenConfig.buses]
      const current = nextBuses[busIndex]?.slaves ?? []
      const next = [...current]
      next[slaveIndex] = { ...(next[slaveIndex] ?? defaultCanopenSlave()), ...updates }
      nextBuses[busIndex] = { ...nextBuses[busIndex], slaves: next }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleAddCanopenSlave = useCallback(
    (busIndex: number) => {
      const nextBuses = [...canopenConfig.buses]
      const next = [...(nextBuses[busIndex]?.slaves ?? [])]
      const nextNodeId = next.length > 0 ? Math.max(...next.map((slave) => slave.nodeId)) + 1 : 1
      next.push({ ...defaultCanopenSlave(), name: `slave_${next.length + 1}`, nodeId: nextNodeId })
      nextBuses[busIndex] = { ...nextBuses[busIndex], slaves: next }
      setActiveSlaveTab((prev) => ({ ...prev, [busIndex]: String(next.length - 1) }))
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleRemoveCanopenSlave = useCallback(
    (busIndex: number, slaveIndex: number) => {
      const nextBuses = [...canopenConfig.buses]
      const current = nextBuses[busIndex]?.slaves ?? []
      if (current.length <= 1) return
      const next = current.filter((_, i) => i !== slaveIndex)
      nextBuses[busIndex] = { ...nextBuses[busIndex], slaves: next }
      setActiveSlaveTab((prev) => ({ ...prev, [busIndex]: String(Math.max(0, Math.min(slaveIndex, next.length - 1))) }))
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleAddCanopenBus = () => {
    if (canopenConfig.buses.length >= 8) return
    const nextBuses = [...canopenConfig.buses, defaultCanopenBus(canopenConfig.buses)]
    setActiveBusTab(String(nextBuses.length - 1))
    updateCanopenStore({ buses: nextBuses })
  }

  const handleRemoveCanopenBus = (index: number) => {
    if (canopenConfig.buses.length <= 1) return
    const nextBuses = canopenConfig.buses.filter((_, i) => i !== index)
    const nextTabIndex = Math.max(0, Math.min(index, nextBuses.length - 1))
    setActiveBusTab(String(nextTabIndex))
    updateCanopenStore({ buses: nextBuses })
  }

  const renderPdoSection = (busIndex: number, slaveIndex: number, pdoType: 'tpdo' | 'rpdo') => {
    const slave = canopenConfig.buses[busIndex]?.slaves?.[slaveIndex]
    const pdos: CanopenPdo[] = slave?.[pdoType] ?? []
    const title = pdoType === 'tpdo' ? 'TPDO' : 'RPDO'

    return (
      <div className='rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300'>
            {title}
          </h4>
          <button
            type='button'
            onClick={() => {
              const nextBuses = updateCanopenSlaveArray(
                canopenConfig.buses,
                busIndex,
                slaveIndex,
                pdoType,
                (items) => [...items, makeCanopenPdo(pdoType === 'tpdo' ? 'output' : 'input', items)],
              )
              updateCanopenStore({ buses: nextBuses })
            }}
            className='rounded bg-brand px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-medium-dark'
          >
            Add {title}
          </button>
        </div>

        <div className='space-y-3'>
          {pdos.length === 0 && (
            <div className='rounded border border-dashed border-neutral-300 p-2 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'>
              No {title} configured for this slave.
            </div>
          )}

          {pdos.map((pdo, pdoIndex) => (
            <div key={`${pdoType}-${pdoIndex}`} className='rounded border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950'>
              <div className='mb-2 flex items-center justify-between gap-2'>
                <span className='text-[11px] font-medium text-neutral-700 dark:text-neutral-300'>
                  {title} #{pdoIndex + 1}
                </span>
                <button
                  type='button'
                  onClick={() => {
                    const nextBuses = updateCanopenSlaveArray(
                      canopenConfig.buses,
                      busIndex,
                      slaveIndex,
                      pdoType,
                      (items) => items.filter((_, index) => index !== pdoIndex),
                    )
                    updateCanopenStore({ buses: nextBuses })
                  }}
                  className='text-[10px] font-medium text-red-500 hover:text-red-600'
                >
                  Delete
                </button>
              </div>

              <div className='grid grid-cols-2 gap-2 md:grid-cols-4'>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                  <InputWithRef
                    type='number'
                    value={pdo.index ?? 0}
                    onChange={(e) => {
                      const nextBuses = updateCanopenPdo(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        pdoType,
                        pdoIndex,
                        {
                          index: Number(e.target.value) || 0,
                        },
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>SubIndex</Label>
                  <InputWithRef
                    type='number'
                    value={pdo.subIndex ?? 0}
                    onChange={(e) => {
                      const nextBuses = updateCanopenPdo(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        pdoType,
                        pdoIndex,
                        {
                          subIndex: Number(e.target.value) || 0,
                        },
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                  <InputWithRef
                    value={pdo.name ?? ''}
                    onChange={(e) => {
                      const nextBuses = updateCanopenPdo(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        pdoType,
                        pdoIndex,
                        {
                          name: e.target.value,
                        },
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
              </div>

              <div className='mt-3 space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400'>
                    Mappings
                  </span>
                  <button
                    type='button'
                    onClick={() => {
                      const nextBuses = updateCanopenPdo(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        pdoType,
                        pdoIndex,
                        {
                          mapping: [...(pdo.mapping ?? []), makeCanopenPdoMapping(pdoType === 'tpdo' ? 'output' : 'input', pdo.mapping ?? [])],
                        },
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className='rounded bg-neutral-800 px-2 py-1 text-[10px] font-medium text-white hover:bg-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600'
                  >
                    Add Mapping
                  </button>
                </div>

                {(pdo.mapping ?? []).length === 0 && (
                  <div className='rounded border border-dashed border-neutral-300 p-2 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'>
                    No mapping entries.
                  </div>
                )}

                {(pdo.mapping ?? []).map((mapping, mappingIndex) => (
                  <div key={`${title}-mapping-${mappingIndex}`} className='rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-950'>
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-[10px] font-medium text-neutral-700 dark:text-neutral-300'>
                        Mapping #{mappingIndex + 1}
                      </span>
                      <button
                        type='button'
                        onClick={() => {
                          const nextBuses = updateCanopenPdo(
                            canopenConfig.buses,
                            busIndex,
                            slaveIndex,
                            pdoType,
                            pdoIndex,
                            {
                              mapping: (pdo.mapping ?? []).filter((_, index) => index !== mappingIndex),
                            },
                          )
                          updateCanopenStore({ buses: nextBuses })
                        }}
                        className='text-[10px] font-medium text-red-500 hover:text-red-600'
                      >
                        Remove
                      </button>
                    </div>

                    <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                        <InputWithRef
                          value={mapping.name ?? ''}
                          onChange={(e) => {
                            const nextBuses = updateCanopenPdoMapping(
                              canopenConfig.buses,
                              busIndex,
                              slaveIndex,
                              pdoType,
                              pdoIndex,
                              mappingIndex,
                              {
                                name: e.target.value,
                              },
                            )
                            updateCanopenStore({ buses: nextBuses })
                          }}
                          className={inputStyles}
                        />
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                        <InputWithRef
                          type='number'
                          value={mapping.index ?? 0}
                          onChange={(e) => {
                            const nextBuses = updateCanopenPdoMapping(
                              canopenConfig.buses,
                              busIndex,
                              slaveIndex,
                              pdoType,
                              pdoIndex,
                              mappingIndex,
                              {
                                index: Number(e.target.value) || 0,
                              },
                            )
                            updateCanopenStore({ buses: nextBuses })
                          }}
                          className={inputStyles}
                        />
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>SubIndex</Label>
                        <InputWithRef
                          type='number'
                          value={mapping.subIndex ?? 0}
                          onChange={(e) => {
                            const nextBuses = updateCanopenPdoMapping(
                              canopenConfig.buses,
                              busIndex,
                              slaveIndex,
                              pdoType,
                              pdoIndex,
                              mappingIndex,
                              {
                                subIndex: Number(e.target.value) || 0,
                              },
                            )
                            updateCanopenStore({ buses: nextBuses })
                          }}
                          className={inputStyles}
                        />
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Bit Length</Label>
                        <InputWithRef
                          type='number'
                          value={mapping.bitLength ?? 8}
                          onChange={(e) => {
                            const nextBuses = updateCanopenPdoMapping(
                              canopenConfig.buses,
                              busIndex,
                              slaveIndex,
                              pdoType,
                              pdoIndex,
                              mappingIndex,
                              {
                                bitLength: Number(e.target.value) || 8,
                              },
                            )
                            updateCanopenStore({ buses: nextBuses })
                          }}
                          className={inputStyles}
                        />
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>PLC Addr</Label>
                        <InputWithRef
                          value={mapping.plcAddress ?? ''}
                          onChange={(e) => {
                            const nextBuses = updateCanopenPdoMapping(
                              canopenConfig.buses,
                              busIndex,
                              slaveIndex,
                              pdoType,
                              pdoIndex,
                              mappingIndex,
                              {
                                plcAddress: e.target.value,
                              },
                            )
                            updateCanopenStore({ buses: nextBuses })
                          }}
                          className={inputStyles}
                        />
                      </div>
                      <div className='flex flex-col gap-1'>
                        <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Direction</Label>
                        <Select
                          value={mapping.direction ?? (pdoType === 'tpdo' ? 'output' : 'input')}
                          onValueChange={(value) => {
                            const nextBuses = updateCanopenPdoMapping(
                              canopenConfig.buses,
                              busIndex,
                              slaveIndex,
                              pdoType,
                              pdoIndex,
                              mappingIndex,
                              {
                                direction: value as 'input' | 'output',
                              },
                            )
                            updateCanopenStore({ buses: nextBuses })
                          }}
                        >
                          <SelectTrigger withIndicator className={CAN_SELECT_TRIGGER_STYLES} />
                          <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                            {CANOPEN_DIRECTION_OPTIONS.map((option) => (
                              <SelectItem key={option} value={option} className={CAN_SELECT_ITEM_STYLES}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderSdoSection = (busIndex: number, slaveIndex: number) => {
    const slave = canopenConfig.buses[busIndex]?.slaves?.[slaveIndex]
    const sdos: CanopenSdoEntry[] = slave?.sdo ?? []

    return (
      <div className='rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300'>
            SDO
          </h4>
          <button
            type='button'
            onClick={() => {
              const nextBuses = updateCanopenSlaveArray(
                canopenConfig.buses,
                busIndex,
                slaveIndex,
                'sdo',
                (items) => [...items, makeCanopenSdoEntry('input', items)],
              )
              updateCanopenStore({ buses: nextBuses })
            }}
            className='rounded bg-brand px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-medium-dark'
          >
            Add SDO
          </button>
        </div>

        <div className='space-y-3'>
          {sdos.length === 0 && (
            <div className='rounded border border-dashed border-neutral-300 p-2 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'>
              No SDO entries configured for this slave.
            </div>
          )}

          {sdos.map((entry, index) => (
            <div key={`sdo-${index}`} className='rounded border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-[11px] font-medium text-neutral-700 dark:text-neutral-300'>SDO #{index + 1}</span>
                <button
                  type='button'
                  onClick={() => {
                    const nextBuses = updateCanopenSlaveArray(
                      canopenConfig.buses,
                      busIndex,
                      slaveIndex,
                      'sdo',
                      (items) => items.filter((_, i) => i !== index),
                    )
                    updateCanopenStore({ buses: nextBuses })
                  }}
                  className='text-[10px] font-medium text-red-500 hover:text-red-600'
                >
                  Delete
                </button>
              </div>

              <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                  <InputWithRef
                    value={entry.name ?? ''}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) => items.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                  <InputWithRef
                    type='number'
                    value={entry.index ?? 0}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) => items.map((item, i) => (i === index ? { ...item, index: Number(e.target.value) || 0 } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>SubIndex</Label>
                  <InputWithRef
                    type='number'
                    value={entry.subIndex ?? 0}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) => items.map((item, i) => (i === index ? { ...item, subIndex: Number(e.target.value) || 0 } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Type</Label>
                  <Select
                    value={entry.dataType ?? 'u32'}
                    onValueChange={(value) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, dataType: value as CanopenSdoEntry['dataType'] } : item,
                          ),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                  >
                    <SelectTrigger withIndicator className={CAN_SELECT_TRIGGER_STYLES} />
                    <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                      {CANOPEN_DATA_TYPES.map((option) => (
                        <SelectItem key={option} value={option} className={CAN_SELECT_ITEM_STYLES}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Access</Label>
                  <Select
                    value={entry.access ?? 'rw'}
                    onValueChange={(value) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, access: value as CanopenSdoEntry['access'] } : item,
                          ),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                  >
                    <SelectTrigger withIndicator className={CAN_SELECT_TRIGGER_STYLES} />
                    <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                      {CANOPEN_ACCESS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className={CAN_SELECT_ITEM_STYLES}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>PLC Addr</Label>
                  <InputWithRef
                    value={entry.plcAddress ?? ''}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) => items.map((item, i) => (i === index ? { ...item, plcAddress: e.target.value } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Direction</Label>
                  <Select
                    value={entry.direction ?? 'input'}
                    onValueChange={(value) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'sdo',
                        (items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, direction: value as 'input' | 'output' } : item,
                          ),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                  >
                    <SelectTrigger withIndicator className={CAN_SELECT_TRIGGER_STYLES} />
                    <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                      {CANOPEN_DIRECTION_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className={CAN_SELECT_ITEM_STYLES}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderOdSection = (busIndex: number, slaveIndex: number) => {
    const slave = canopenConfig.buses[busIndex]?.slaves?.[slaveIndex]
    const entries: CanopenOdEntry[] = slave?.odEntries ?? []

    return (
      <div className='rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900'>
        <div className='mb-3 flex items-center justify-between'>
          <h4 className='text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300'>
            Object Dictionary
          </h4>
          <button
            type='button'
            onClick={() => {
              const nextBuses = updateCanopenSlaveArray(
                canopenConfig.buses,
                busIndex,
                slaveIndex,
                'odEntries',
                (items) => [...items, makeCanopenOdEntry(items)],
              )
              updateCanopenStore({ buses: nextBuses })
            }}
            className='rounded bg-brand px-2 py-1 text-[10px] font-medium text-white hover:bg-brand-medium-dark'
          >
            Add OD Entry
          </button>
        </div>

        <div className='space-y-3'>
          {entries.length === 0 && (
            <div className='rounded border border-dashed border-neutral-300 p-2 text-[11px] text-neutral-500 dark:border-neutral-700 dark:text-neutral-400'>
              No OD entries configured.
            </div>
          )}

          {entries.map((entry, index) => (
            <div key={`od-${index}`} className='rounded border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950'>
              <div className='mb-2 flex items-center justify-between'>
                <span className='text-[11px] font-medium text-neutral-700 dark:text-neutral-300'>OD #{index + 1}</span>
                <button
                  type='button'
                  onClick={() => {
                    const nextBuses = updateCanopenSlaveArray(
                      canopenConfig.buses,
                      busIndex,
                      slaveIndex,
                      'odEntries',
                      (items) => items.filter((_, i) => i !== index),
                    )
                    updateCanopenStore({ buses: nextBuses })
                  }}
                  className='text-[10px] font-medium text-red-500 hover:text-red-600'
                >
                  Delete
                </button>
              </div>

              <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                  <InputWithRef
                    value={entry.name ?? ''}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'odEntries',
                        (items) => items.map((item, i) => (i === index ? { ...item, name: e.target.value } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                  <InputWithRef
                    type='number'
                    value={entry.index ?? 0}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'odEntries',
                        (items) => items.map((item, i) => (i === index ? { ...item, index: Number(e.target.value) || 0 } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>SubIndex</Label>
                  <InputWithRef
                    type='number'
                    value={entry.subIndex ?? 0}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'odEntries',
                        (items) => items.map((item, i) => (i === index ? { ...item, subIndex: Number(e.target.value) || 0 } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Type</Label>
                  <Select
                    value={entry.dataType ?? 'u32'}
                    onValueChange={(value) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'odEntries',
                        (items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, dataType: value as CanopenOdEntry['dataType'] } : item,
                          ),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                  >
                    <SelectTrigger withIndicator className={CAN_SELECT_TRIGGER_STYLES} />
                    <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                      {CANOPEN_DATA_TYPES.map((option) => (
                        <SelectItem key={option} value={option} className={CAN_SELECT_ITEM_STYLES}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Access</Label>
                  <Select
                    value={entry.access ?? 'rw'}
                    onValueChange={(value) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'odEntries',
                        (items) =>
                          items.map((item, i) =>
                            i === index ? { ...item, access: value as CanopenOdEntry['access'] } : item,
                          ),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                  >
                    <SelectTrigger withIndicator className={CAN_SELECT_TRIGGER_STYLES} />
                    <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                      {CANOPEN_ACCESS_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option} className={CAN_SELECT_ITEM_STYLES}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='flex flex-col gap-1'>
                  <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Default</Label>
                  <InputWithRef
                    type='number'
                    value={String(entry.defaultValue ?? 0)}
                    onChange={(e) => {
                      const nextBuses = updateCanopenSlaveArray(
                        canopenConfig.buses,
                        busIndex,
                        slaveIndex,
                        'odEntries',
                        (items) => items.map((item, i) => (i === index ? { ...item, defaultValue: Number(e.target.value) || 0 } : item)),
                      )
                      updateCanopenStore({ buses: nextBuses })
                    }}
                    className={inputStyles}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col overflow-y-auto bg-neutral-100 p-6 dark:bg-neutral-900'>
      <div className='mb-6 flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800'>
        <div>
          <h1 className='font-display text-xl font-bold text-neutral-950 dark:text-white'>{deviceName}</h1>
          <p className='text-sm text-neutral-600 dark:text-neutral-400'>Protocol: CANopen</p>
        </div>
      </div>

      <div className='flex flex-col gap-6'>
        <div className='rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='font-display text-sm font-semibold text-neutral-950 dark:text-white'>
                CANopen Bus Configuration
              </h2>
              <p className='text-xs text-neutral-500'>Multi-bus profile for CANopenNode runtime, max 8 buses</p>
            </div>
            <button
              type='button'
              onClick={handleAddCanopenBus}
              disabled={canopenConfig.buses.length >= 8}
              className='flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-medium-dark disabled:cursor-not-allowed disabled:opacity-60'
            >
              <PlusIcon className='h-3.5 w-3.5 stroke-white' />
              <span>Add Bus</span>
            </button>
          </div>

          <Tabs.Root
            value={activeBusTab}
            onValueChange={setActiveBusTab}
            className='flex flex-col gap-4'
          >
            <Tabs.List className='flex flex-wrap gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800'>
              {canopenConfig.buses.map((bus, busIndex) => (
                <Tabs.Trigger
                  key={`${bus.name || 'bus'}-${busIndex}`}
                  value={String(busIndex)}
                  className='rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 data-[state=active]:border-brand data-[state=active]:text-brand dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300'
                >
                  {bus.name || `bus${busIndex + 1}`} ({bus.interface || 'can0'})
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {canopenConfig.buses.map((bus, busIndex) => (
              <Tabs.Content key={`bus-content-${busIndex}`} value={String(busIndex)} className='space-y-4'>
                <div className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900'>
                  <div className='mb-4 flex items-center justify-between gap-3'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center gap-2'>
                        <ToggleSwitch
                          checked={bus.enabled ?? true}
                          onCheckedChange={(checked) => handleCanopenBusChange(busIndex, { enabled: checked })}
                        />
                        <span className='text-xs font-medium text-neutral-700 dark:text-neutral-300'>Enabled</span>
                      </div>
                      <span className='rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300'>
                        Bus {busIndex + 1}
                      </span>
                    </div>
                    {canopenConfig.buses.length > 1 && (
                      <button
                        type='button'
                        onClick={() => handleRemoveCanopenBus(busIndex)}
                        className='text-xs font-medium text-red-500 hover:text-red-600'
                      >
                        Remove Bus
                      </button>
                    )}
                  </div>

                  <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Name (总线名称)</Label>
                      <InputWithRef
                        value={bus.name}
                        onChange={(e) => handleCanopenBusChange(busIndex, { name: e.target.value || `bus${busIndex}` })}
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Interface (接口名称)</Label>
                      <InputWithRef
                        value={bus.interface}
                        onChange={(e) => handleCanopenBusChange(busIndex, { interface: e.target.value })}
                        placeholder='can0'
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Local Node ID (本地节点 ID)</Label>
                      <InputWithRef
                        type='number'
                        min={1}
                        max={127}
                        value={bus.localNodeId ?? 127}
                        onChange={(e) =>
                          handleCanopenBusChange(busIndex, {
                            localNodeId: Math.min(127, Math.max(1, Number(e.target.value) || 1)),
                          })
                        }
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Bitrate (波特率 bps)</Label>
                      <Select
                        value={String(bus.bitrate)}
                        onValueChange={(value) => handleCanopenBusChange(busIndex, { bitrate: Number(value) })}
                      >
                        <SelectTrigger
                          withIndicator
                          placeholder='Select bitrate'
                          className={CAN_SELECT_TRIGGER_STYLES}
                        />
                        <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                          {CANOPEN_BITRATE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value} className={CAN_SELECT_ITEM_STYLES}>
                              <span className='text-start font-caption text-xs font-normal text-neutral-700 dark:text-neutral-100'>
                                {option.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>SJW (再同步跳转宽度)</Label>
                      <InputWithRef
                        type='number'
                        min={1}
                        max={4}
                        value={bus.sjw ?? 1}
                        onChange={(e) =>
                          handleCanopenBusChange(busIndex, {
                            sjw: Math.min(4, Math.max(1, Number(e.target.value) || 1)),
                          })
                        }
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Sample Point (采样点比例)</Label>
                      <InputWithRef
                        type='number'
                        step='0.005'
                        min={0.5}
                        max={0.95}
                        value={bus.samplePoint ?? 0.875}
                        onChange={(e) =>
                          handleCanopenBusChange(busIndex, {
                            samplePoint: Math.min(0.95, Math.max(0.5, Number(e.target.value) || 0.875)),
                          })
                        }
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Bus-Off Restart (重启时间 ms)</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        value={bus.restartMs ?? 100}
                        onChange={(e) => handleCanopenBusChange(busIndex, { restartMs: Number(e.target.value) || 0 })}
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex items-center gap-2 pt-5'>
                      <ToggleSwitch
                        checked={bus.tripleSampling ?? false}
                        onCheckedChange={(checked) => handleCanopenBusChange(busIndex, { tripleSampling: checked })}
                      />
                      <Label className='cursor-pointer text-xs text-neutral-700 dark:text-neutral-300'>Triple Sampling (三重采样)</Label>
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Heartbeat (心跳 ms)</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        value={bus.heartbeatMs ?? 1000}
                        onChange={(e) => handleCanopenBusChange(busIndex, { heartbeatMs: Number(e.target.value) || 0 })}
                        className={inputStyles}
                      />
                    </div>
                    <div className='flex flex-col gap-1.5'>
                      <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Sync Period (同步周期 ms)</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        value={bus.syncPeriodMs ?? 0}
                        onChange={(e) => handleCanopenBusChange(busIndex, { syncPeriodMs: Number(e.target.value) || 0 })}
                        className={inputStyles}
                      />
                    </div>
                  </div>

                  <div className='mt-5 rounded border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950'>
                    <div className='mb-3 flex items-center justify-between'>
                      <h3 className='text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300'>
                        Slaves
                      </h3>
                      <button
                        type='button'
                        onClick={() => handleAddCanopenSlave(busIndex)}
                        className='flex items-center gap-1 rounded bg-brand px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-medium-dark'
                      >
                        <PlusIcon className='h-3 w-3 stroke-white' />
                        Add Slave
                      </button>
                    </div>
                    <Tabs.Root
                      value={activeSlaveTab[busIndex] ?? '0'}
                      onValueChange={(value) => setActiveSlaveTab((prev) => ({ ...prev, [busIndex]: value }))}
                      className='flex flex-col gap-3'
                    >
                      <Tabs.List className='flex flex-wrap gap-2 border-b border-neutral-200 pb-2 dark:border-neutral-800'>
                        {(bus.slaves ?? [defaultCanopenSlave()]).map((slave, slaveIndex) => (
                          <Tabs.Trigger
                            key={`${bus.name}-slave-${slaveIndex}`}
                            value={String(slaveIndex)}
                            className='rounded border border-neutral-300 bg-white px-2 py-1 text-[11px] font-medium text-neutral-700 data-[state=active]:border-brand data-[state=active]:text-brand dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300'
                          >
                            {slave.name || `slave_${slaveIndex + 1}`} (NID {slave.nodeId})
                          </Tabs.Trigger>
                        ))}
                      </Tabs.List>
                      {(bus.slaves ?? [defaultCanopenSlave()]).map((slave, slaveIndex) => (
                        <Tabs.Content key={`${bus.name}-slave-content-${slaveIndex}`} value={String(slaveIndex)} className='space-y-4'>
                          <div className='grid grid-cols-2 gap-3'>
                            <div className='flex flex-col gap-1.5'>
                              <Label className='text-[11px] text-neutral-700 dark:text-neutral-300'>Slave Name</Label>
                              <InputWithRef
                                value={slave.name}
                                onChange={(e) => handleCanopenSlaveChange(busIndex, slaveIndex, { name: e.target.value || `slave_${slaveIndex + 1}` })}
                                className={inputStyles}
                              />
                            </div>
                            <div className='flex flex-col gap-1.5'>
                              <Label className='text-[11px] text-neutral-700 dark:text-neutral-300'>Node ID</Label>
                              <InputWithRef
                                type='number'
                                min={1}
                                max={127}
                                value={slave.nodeId}
                                onChange={(e) =>
                                  handleCanopenSlaveChange(busIndex, slaveIndex, {
                                    nodeId: Math.min(127, Math.max(1, Number(e.target.value) || 1)),
                                  })
                                }
                                className={inputStyles}
                              />
                            </div>
                          </div>
                          <div className='flex items-center justify-between'>
                            <div className='flex items-center gap-2'>
                              <ToggleSwitch
                                checked={slave.enabled ?? true}
                                onCheckedChange={(checked) => handleCanopenSlaveChange(busIndex, slaveIndex, { enabled: checked })}
                              />
                              <span className='text-[11px] text-neutral-700 dark:text-neutral-300'>Enabled</span>
                            </div>
                            {(bus.slaves ?? []).length > 1 && (
                              <button
                                type='button'
                                onClick={() => handleRemoveCanopenSlave(busIndex, slaveIndex)}
                                className='text-[11px] font-medium text-red-500 hover:text-red-600'
                              >
                                Remove Slave
                              </button>
                            )}
                          </div>
                          <div className='space-y-4'>
                            <div className='rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-[11px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'>
                              PDO/SDO and OD bindings for this slave are scoped to node {slave.nodeId}.
                            </div>

                            {renderOdSection(busIndex, slaveIndex)}
                            {renderPdoSection(busIndex, slaveIndex, 'tpdo')}
                            {renderPdoSection(busIndex, slaveIndex, 'rpdo')}
                            {renderSdoSection(busIndex, slaveIndex)}
                          </div>
                        </Tabs.Content>
                      ))}
                    </Tabs.Root>
                  </div>

                  <div className='mt-5 rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-[11px] text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'>
                    PDO/SDO/OD definitions belong to each slave and are configured under the per-slave tabs above.
                  </div>
                </div>
              </Tabs.Content>
            ))}
          </Tabs.Root>
        </div>
      </div>
    </div>
  )
}

export { CanopenDeviceEditor }
export default CanopenDeviceEditor
