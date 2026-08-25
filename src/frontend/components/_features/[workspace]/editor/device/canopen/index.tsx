import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons'
import type {
  CanopenBusConfig,
  CanopenConfig,
  CanopenPdo,
  CanopenPdoMapping,
} from '@root/middleware/shared/ports/types'
import { useCallback, useMemo } from 'react'

import { PlusIcon } from '../../../../../../assets/icons/interface/Plus'
import { useOpenPLCStore } from '../../../../../../store'
import { InputWithRef } from '../../../../../_atoms/input'
import { Label } from '../../../../../_atoms/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../../../_atoms/select'
import { ToggleSwitch } from '../../../../../_atoms/toggle-switch'

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

const defaultCanopenBus = (): CanopenBusConfig => ({
  name: 'bus0',
  enabled: true,
  interface: 'can0',
  nodeId: 1,
  bitrate: 500000,
  heartbeatMs: 1000,
  syncPeriodMs: 0,
  tpdo: [],
  rpdo: [],
})

const defaultCanopenConfig = (): CanopenConfig => ({
  buses: [defaultCanopenBus()],
})

const updateCanopenBus = (buses: CanopenBusConfig[], index: number, updates: Partial<CanopenBusConfig>) => {
  const next = [...buses]
  next[index] = { ...next[index], ...updates }
  return next
}

const updateCanopenPdoArray = (pdo: CanopenPdo[] | undefined, index: number, updates: Partial<CanopenPdo>) => {
  const next = [...(pdo ?? [])]
  next[index] = { ...(next[index] ?? { index: 0x1800 }), ...updates }
  return next
}

const updateCanopenMappingArray = (
  mapping: CanopenPdoMapping[] | undefined,
  index: number,
  updates: Partial<CanopenPdoMapping>,
) => {
  const next = [...(mapping ?? [])]
  next[index] = { ...(next[index] ?? { index: 0x2000, bitLength: 8 }), ...updates }
  return next
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

  const handleCanopenBusChange = useCallback(
    (busIndex: number, updates: Partial<CanopenBusConfig>) => {
      updateCanopenStore({ buses: updateCanopenBus(canopenConfig.buses, busIndex, updates) })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleCanopenPdoChange = useCallback(
    (busIndex: number, pdoType: 'tpdo' | 'rpdo', pdoIndex: number, updates: Partial<CanopenPdo>) => {
      const nextBuses = [...canopenConfig.buses]
      const currentPdo = nextBuses[busIndex]?.[pdoType] ?? []
      nextBuses[busIndex] = {
        ...nextBuses[busIndex],
        [pdoType]: updateCanopenPdoArray(currentPdo, pdoIndex, updates),
      }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleCanopenMappingChange = useCallback(
    (
      busIndex: number,
      pdoType: 'tpdo' | 'rpdo',
      pdoIndex: number,
      mappingIndex: number,
      updates: Partial<CanopenPdoMapping>,
    ) => {
      const nextBuses = [...canopenConfig.buses]
      const pdo = nextBuses[busIndex]?.[pdoType]?.[pdoIndex] ?? { index: 0x1800, mapping: [] }
      const nextPdo = {
        ...pdo,
        mapping: updateCanopenMappingArray(pdo.mapping, mappingIndex, updates),
      }
      const currentPdo = nextBuses[busIndex]?.[pdoType] ?? []
      currentPdo[pdoIndex] = nextPdo
      nextBuses[busIndex] = { ...nextBuses[busIndex], [pdoType]: currentPdo }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleAddCanopenBus = () => {
    if (canopenConfig.buses.length >= 8) return
    updateCanopenStore({ buses: [...canopenConfig.buses, defaultCanopenBus()] })
  }

  const handleRemoveCanopenBus = (index: number) => {
    if (canopenConfig.buses.length <= 1) return
    updateCanopenStore({ buses: canopenConfig.buses.filter((_, i) => i !== index) })
  }

  const handleAddCanopenPdo = (busIndex: number, pdoType: 'tpdo' | 'rpdo') => {
    const nextBuses = [...canopenConfig.buses]
    const nextPdo = { index: pdoType === 'tpdo' ? 0x1800 : 0x1400, subIndex: 0, mapping: [] }
    nextBuses[busIndex] = {
      ...nextBuses[busIndex],
      [pdoType]: [...(nextBuses[busIndex]?.[pdoType] ?? []), nextPdo],
    }
    updateCanopenStore({ buses: nextBuses })
  }

  const handleRemoveCanopenPdo = (busIndex: number, pdoType: 'tpdo' | 'rpdo', pdoIndex: number) => {
    const nextBuses = [...canopenConfig.buses]
    nextBuses[busIndex] = {
      ...nextBuses[busIndex],
      [pdoType]: (nextBuses[busIndex]?.[pdoType] ?? []).filter((_, i) => i !== pdoIndex),
    }
    updateCanopenStore({ buses: nextBuses })
  }

  const handleAddCanopenMapping = (busIndex: number, pdoType: 'tpdo' | 'rpdo', pdoIndex: number) => {
    const nextBuses = [...canopenConfig.buses]
    const pdo = nextBuses[busIndex]?.[pdoType]?.[pdoIndex] ?? { index: 0x1800, mapping: [] }
    const nextPdo = {
      ...pdo,
      mapping: [...(pdo.mapping ?? []), { index: 0x2000 + (pdo.mapping?.length ?? 0), bitLength: 8, name: `map_${(pdo.mapping?.length ?? 0) + 1}` }],
    }
    const nextPdoList = [...(nextBuses[busIndex]?.[pdoType] ?? [])]
    nextPdoList[pdoIndex] = nextPdo
    nextBuses[busIndex] = { ...nextBuses[busIndex], [pdoType]: nextPdoList }
    updateCanopenStore({ buses: nextBuses })
  }

  const handleRemoveCanopenMapping = (
    busIndex: number,
    pdoType: 'tpdo' | 'rpdo',
    pdoIndex: number,
    mappingIndex: number,
  ) => {
    const nextBuses = [...canopenConfig.buses]
    const pdo = nextBuses[busIndex]?.[pdoType]?.[pdoIndex]
    if (!pdo) return
    const nextPdo = {
      ...pdo,
      mapping: (pdo.mapping ?? []).filter((_, i) => i !== mappingIndex),
    }
    const nextPdoList = [...(nextBuses[busIndex]?.[pdoType] ?? [])]
    nextPdoList[pdoIndex] = nextPdo
    nextBuses[busIndex] = { ...nextBuses[busIndex], [pdoType]: nextPdoList }
    updateCanopenStore({ buses: nextBuses })
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

          <div className='flex flex-col gap-4'>
            {canopenConfig.buses.map((bus, busIndex) => (
              <div key={`${bus.name}-${busIndex}`} className='rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900'>
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
                    <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Node ID (节点 ID)</Label>
                    <InputWithRef
                      type='number'
                      min={1}
                      max={127}
                      value={bus.nodeId}
                      onChange={(e) =>
                        handleCanopenBusChange(busIndex, {
                          nodeId: Math.min(127, Math.max(1, Number(e.target.value) || 1)),
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

                {(['tpdo', 'rpdo'] as const).map((pdoType) => (
                  <div key={pdoType} className='mt-5 rounded border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950'>
                    <div className='mb-3 flex items-center justify-between'>
                      <h3 className='text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300'>
                        {pdoType.toUpperCase()} Entries
                      </h3>
                      <button
                        type='button'
                        onClick={() => handleAddCanopenPdo(busIndex, pdoType)}
                        className='flex items-center gap-1 rounded bg-brand px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-medium-dark'
                      >
                        <PlusIcon className='h-3 w-3 stroke-white' />
                        Add PDO
                      </button>
                    </div>

                    {(bus[pdoType] ?? []).length === 0 ? (
                      <p className='text-xs italic text-neutral-500'>No {pdoType.toUpperCase()} configured.</p>
                    ) : (
                      <div className='space-y-3'>
                        {(bus[pdoType] ?? []).map((pdo, pdoIndex) => (
                          <div key={`${pdoType}-${pdoIndex}`} className='rounded border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900'>
                            <div className='mb-2 flex items-center justify-between gap-3'>
                              <span className='text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-600 dark:text-neutral-400'>
                                PDO {pdoIndex + 1}
                              </span>
                              <button
                                type='button'
                                onClick={() => handleRemoveCanopenPdo(busIndex, pdoType, pdoIndex)}
                                className='text-[11px] font-medium text-red-500 hover:text-red-600'
                              >
                                Remove PDO
                              </button>
                            </div>

                            <div className='grid grid-cols-2 gap-3'>
                              <div className='flex flex-col gap-1.5'>
                                <Label className='text-[11px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                                <InputWithRef
                                  type='number'
                                  value={pdo.index}
                                  onChange={(e) =>
                                    handleCanopenPdoChange(busIndex, pdoType, pdoIndex, {
                                      index: Number(e.target.value) || 0,
                                    })
                                  }
                                  className={inputStyles}
                                />
                              </div>
                              <div className='flex flex-col gap-1.5'>
                                <Label className='text-[11px] text-neutral-700 dark:text-neutral-300'>SubIndex</Label>
                                <InputWithRef
                                  type='number'
                                  value={pdo.subIndex ?? 0}
                                  onChange={(e) =>
                                    handleCanopenPdoChange(busIndex, pdoType, pdoIndex, {
                                      subIndex: Number(e.target.value) || 0,
                                    })
                                  }
                                  className={inputStyles}
                                />
                              </div>
                            </div>

                            <div className='mt-3 flex items-center justify-between'>
                              <span className='text-[11px] font-medium text-neutral-600 dark:text-neutral-400'>Mappings</span>
                              <button
                                type='button'
                                onClick={() => handleAddCanopenMapping(busIndex, pdoType, pdoIndex)}
                                className='flex items-center gap-1 rounded bg-neutral-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600'
                              >
                                <PlusIcon className='h-3 w-3 stroke-white' />
                                Add Mapping
                              </button>
                            </div>

                            {(pdo.mapping ?? []).length === 0 ? (
                              <p className='mt-2 text-[11px] italic text-neutral-500'>No mappings defined.</p>
                            ) : (
                              <div className='mt-2 space-y-2'>
                                {(pdo.mapping ?? []).map((mapping, mappingIndex) => (
                                  <div key={`${pdoType}-mapping-${mappingIndex}`} className='grid grid-cols-4 gap-2 rounded bg-white p-2 dark:bg-neutral-950'>
                                    <div className='flex flex-col gap-1'>
                                      <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                                      <InputWithRef
                                        type='number'
                                        value={mapping.index}
                                        onChange={(e) =>
                                          handleCanopenMappingChange(busIndex, pdoType, pdoIndex, mappingIndex, {
                                            index: Number(e.target.value) || 0,
                                          })
                                        }
                                        className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                                      />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                      <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Sub</Label>
                                      <InputWithRef
                                        type='number'
                                        value={mapping.subIndex ?? 0}
                                        onChange={(e) =>
                                          handleCanopenMappingChange(busIndex, pdoType, pdoIndex, mappingIndex, {
                                            subIndex: Number(e.target.value) || 0,
                                          })
                                        }
                                        className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                                      />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                      <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Bits</Label>
                                      <InputWithRef
                                        type='number'
                                        value={mapping.bitLength ?? 8}
                                        onChange={(e) =>
                                          handleCanopenMappingChange(busIndex, pdoType, pdoIndex, mappingIndex, {
                                            bitLength: Number(e.target.value) || 8,
                                          })
                                        }
                                        className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                                      />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                      <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                                      <div className='flex items-center gap-1'>
                                        <InputWithRef
                                          value={mapping.name ?? ''}
                                          onChange={(e) =>
                                            handleCanopenMappingChange(busIndex, pdoType, pdoIndex, mappingIndex, {
                                              name: e.target.value,
                                            })
                                          }
                                          className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                                        />
                                        <button
                                          type='button'
                                          onClick={() =>
                                            handleRemoveCanopenMapping(
                                              busIndex,
                                              pdoType,
                                              pdoIndex,
                                              mappingIndex,
                                            )
                                          }
                                          className='text-neutral-500 hover:text-red-500'
                                        >
                                          <TrashIcon className='h-3.5 w-3.5' />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { CanopenDeviceEditor }
export default CanopenDeviceEditor
