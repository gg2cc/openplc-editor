import { TrashIcon } from '@radix-ui/react-icons'
import type {
  CanopenBusConfig,
  CanopenConfig,
  CanopenOdEntry,
  CanopenPdo,
  CanopenPdoMapping,
  CanopenSdoEntry,
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
  sjw: 1,
  samplePoint: 0.875,
  restartMs: 100,
  tripleSampling: false,
  heartbeatMs: 1000,
  syncPeriodMs: 0,
  odEntries: [],
  tpdo: [],
  rpdo: [],
  sdo: [],
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
      const currentPdoList = [...(nextBuses[busIndex]?.[pdoType] ?? [])]
      const currentPdo = currentPdoList[pdoIndex] ?? {
        index: pdoType === 'tpdo' ? 0x1800 : 0x1400,
        mapping: [],
      }

      const nextMappingList = [...(currentPdo.mapping ?? [])]
      nextMappingList[mappingIndex] = {
        ...(nextMappingList[mappingIndex] ?? { index: 0x2000, bitLength: 8 }),
        ...updates,
      }

      currentPdoList[pdoIndex] = {
        ...currentPdo,
        mapping: nextMappingList,
      }

      nextBuses[busIndex] = {
        ...nextBuses[busIndex],
        [pdoType]: currentPdoList,
      }
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
    const nextMapping: CanopenPdoMapping = {
      index: 0x2000 + (pdo.mapping?.length ?? 0),
      bitLength: 8,
      name: `map_${(pdo.mapping?.length ?? 0) + 1}`,
      plcAddress: '',
      direction: 'output',
    }
    const nextPdo: CanopenPdo = {
      ...pdo,
      mapping: [...(pdo.mapping ?? []), nextMapping],
    }
    const nextPdoList = [...(nextBuses[busIndex]?.[pdoType] ?? [])]
    nextPdoList[pdoIndex] = nextPdo
    nextBuses[busIndex] = { ...nextBuses[busIndex], [pdoType]: nextPdoList }
    updateCanopenStore({ buses: nextBuses })
  }

  const handleCanopenSdoChange = useCallback(
    (busIndex: number, sdoIndex: number, updates: Partial<CanopenSdoEntry>) => {
      const nextBuses = [...canopenConfig.buses]
      const current = nextBuses[busIndex]?.sdo ?? []
      const next = [...current]
      const baseEntry: CanopenSdoEntry = {
        ...(next[sdoIndex] ?? {}),
        index: next[sdoIndex]?.index ?? 0x2000,
        subIndex: next[sdoIndex]?.subIndex ?? 0,
        dataType: next[sdoIndex]?.dataType ?? 'u32',
        access: next[sdoIndex]?.access ?? 'rw',
      }
      next[sdoIndex] = { ...baseEntry, ...updates }
      nextBuses[busIndex] = { ...nextBuses[busIndex], sdo: next }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleAddCanopenSdo = useCallback(
    (busIndex: number) => {
      const nextBuses = [...canopenConfig.buses]
      const next = [...(nextBuses[busIndex]?.sdo ?? [])]
      next.push({
        name: `sdo_${next.length + 1}`,
        index: 0x2000 + next.length,
        subIndex: 0,
        dataType: 'u32',
        access: 'rw',
        defaultValue: 0,
        plcAddress: '',
        direction: 'output',
      })
      nextBuses[busIndex] = { ...nextBuses[busIndex], sdo: next }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleRemoveCanopenSdo = useCallback(
    (busIndex: number, sdoIndex: number) => {
      const nextBuses = [...canopenConfig.buses]
      nextBuses[busIndex] = {
        ...nextBuses[busIndex],
        sdo: (nextBuses[busIndex]?.sdo ?? []).filter((_, i) => i !== sdoIndex),
      }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

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

  const normalizeCanopenOdEntry = useCallback((raw: unknown): CanopenOdEntry | null => {
    if (!raw || typeof raw !== 'object') return null

    const entry = raw as Record<string, unknown>
    const parseIntValue = (value: unknown, fallback = 0): number => {
      if (typeof value === 'number' && Number.isFinite(value)) return value
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return fallback
        const asHex = trimmed.startsWith('0x') || trimmed.startsWith('0X')
        return Number.parseInt(trimmed, asHex ? 16 : 10)
      }
      return fallback
    }
    const parseType = (value: unknown): CanopenOdEntry['dataType'] => {
      const typed = typeof value === 'string' || typeof value === 'number' ? String(value).trim().toLowerCase() : ''
      if (!typed) return 'u32'
      const map: Record<string, CanopenOdEntry['dataType']> = {
        bool: 'bool',
        boolean: 'bool',
        int8: 'i8',
        i8: 'i8',
        uint8: 'u8',
        u8: 'u8',
        int16: 'i16',
        i16: 'i16',
        uint16: 'u16',
        u16: 'u16',
        int32: 'i32',
        i32: 'i32',
        uint32: 'u32',
        u32: 'u32',
        int64: 'i64',
        i64: 'i64',
        uint64: 'u64',
        u64: 'u64',
        float32: 'f32',
        f32: 'f32',
        float64: 'f64',
        f64: 'f64',
        string: 'string',
        bytes: 'bytes',
      }
      return map[typed] ?? 'u32'
    }
    const parseAccess = (value: unknown): CanopenOdEntry['access'] => {
      const access = typeof value === 'string' ? value.trim().toLowerCase() : ''
      const map: Record<string, CanopenOdEntry['access']> = {
        ro: 'ro',
        wo: 'wo',
        rw: 'rw',
        rwr: 'rwr',
        const: 'const',
      }
      return map[access] ?? 'rw'
    }
    const index = parseIntValue(entry.index ?? entry.odIndex ?? entry.idx ?? 0)
    const subIndex = parseIntValue(entry.subIndex ?? entry.subindex ?? 0)
    const rawDefaultValue = entry.defaultValue ?? entry.default ?? 0
    const defaultValue =
      typeof rawDefaultValue === 'number' || typeof rawDefaultValue === 'string' || typeof rawDefaultValue === 'boolean'
        ? rawDefaultValue
        : rawDefaultValue === null
          ? null
          : 0
    const nameValue =
      typeof entry.name === 'string'
        ? entry.name
        : typeof entry.label === 'string'
          ? entry.label
          : `entry_${index.toString(16)}`

    return {
      name: nameValue,
      index,
      subIndex: subIndex > 0xff ? 0 : subIndex,
      dataType: parseType(entry.dataType ?? entry.type),
      access: parseAccess(entry.access),
      defaultValue,
      description: typeof entry.description === 'string' ? entry.description : '',
    }
  }, [])

  const handleCanopenOdEntryChange = useCallback(
    (busIndex: number, entryIndex: number, updates: Partial<CanopenOdEntry>) => {
      const nextBuses = [...canopenConfig.buses]
      const current = nextBuses[busIndex]?.odEntries ?? []
      const nextEntries = [...current]
      nextEntries[entryIndex] = { ...(nextEntries[entryIndex] ?? { index: 0x1000, dataType: 'u32', access: 'rw' }), ...updates }
      nextBuses[busIndex] = { ...nextBuses[busIndex], odEntries: nextEntries }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleAddCanopenOdEntry = useCallback(
    (busIndex: number) => {
      const nextBuses = [...canopenConfig.buses]
      const nextEntries = [...(nextBuses[busIndex]?.odEntries ?? [])]
      nextEntries.push({ name: `entry_${nextEntries.length + 1}`, index: 0x1000 + nextEntries.length, subIndex: 0, dataType: 'u32', access: 'rw', defaultValue: 0 })
      nextBuses[busIndex] = { ...nextBuses[busIndex], odEntries: nextEntries }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleRemoveCanopenOdEntry = useCallback(
    (busIndex: number, entryIndex: number) => {
      const nextBuses = [...canopenConfig.buses]
      nextBuses[busIndex] = {
        ...nextBuses[busIndex],
        odEntries: (nextBuses[busIndex]?.odEntries ?? []).filter((_, i) => i !== entryIndex),
      }
      updateCanopenStore({ buses: nextBuses })
    },
    [canopenConfig, updateCanopenStore],
  )

  const handleImportCanopenOd = useCallback(
    async (busIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as unknown
        const candidates = Array.isArray(parsed)
          ? parsed
          : Array.isArray((parsed as { odEntries?: unknown[] })?.odEntries)
            ? (parsed as { odEntries: unknown[] }).odEntries
            : Array.isArray((parsed as { objectDictionary?: unknown[] })?.objectDictionary)
              ? (parsed as { objectDictionary: unknown[] }).objectDictionary
              : []

        const normalized = candidates
          .map((entry) => normalizeCanopenOdEntry(entry))
          .filter((entry): entry is CanopenOdEntry => entry !== null)

        if (normalized.length === 0) return

        const nextBuses = [...canopenConfig.buses]
        const currentEntries = nextBuses[busIndex]?.odEntries ?? []
        nextBuses[busIndex] = { ...nextBuses[busIndex], odEntries: [...currentEntries, ...normalized] }
        updateCanopenStore({ buses: nextBuses })
      } catch (error) {
        console.warn('Failed to import CANopen OD JSON', error)
      } finally {
        event.target.value = ''
      }
    },
    [canopenConfig, normalizeCanopenOdEntry, updateCanopenStore],
  )

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
                      Object Dictionary
                    </h3>
                    <div className='flex items-center gap-2'>
                      <button
                        type='button'
                        onClick={() => handleAddCanopenOdEntry(busIndex)}
                        className='flex items-center gap-1 rounded bg-brand px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-medium-dark'
                      >
                        <PlusIcon className='h-3 w-3 stroke-white' />
                        Add Entry
                      </button>
                      <label className='flex cursor-pointer items-center gap-1 rounded bg-neutral-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-neutral-800 dark:bg-neutral-700 dark:hover:bg-neutral-600'>
                        Import OD
                        <input
                          type='file'
                          accept='.json,.txt,.eds'
                          className='hidden'
                          onChange={(event) => void handleImportCanopenOd(busIndex, event)}
                        />
                      </label>
                    </div>
                  </div>

                  {(bus.odEntries ?? []).length === 0 ? (
                    <p className='text-xs italic text-neutral-500'>No object dictionary entries defined.</p>
                  ) : (
                    <div className='space-y-2'>
                      {(bus.odEntries ?? []).map((entry, entryIndex) => (
                        <div key={`${bus.name}-od-${entryIndex}`} className='grid grid-cols-[1.2fr_0.8fr_0.6fr_0.8fr_0.8fr_0.8fr_0.8fr_1.2fr_0.8fr_0.4fr] gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900'>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                            <InputWithRef
                              value={entry.name ?? ''}
                              onChange={(e) =>
                                handleCanopenOdEntryChange(busIndex, entryIndex, { name: e.target.value || `entry_${entryIndex + 1}` })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                            <InputWithRef
                              type='number'
                              value={entry.index}
                              onChange={(e) =>
                                handleCanopenOdEntryChange(busIndex, entryIndex, {
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
                              value={entry.subIndex ?? 0}
                              onChange={(e) =>
                                handleCanopenOdEntryChange(busIndex, entryIndex, {
                                  subIndex: Number(e.target.value) || 0,
                                })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Type</Label>
                            <select
                              value={entry.dataType ?? 'u32'}
                              onChange={(e) =>
                                handleCanopenOdEntryChange(busIndex, entryIndex, {
                                  dataType: (e.target.value as CanopenOdEntry['dataType']) ?? 'u32',
                                })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            >
                              <option value='bool'>bool</option>
                              <option value='u8'>u8</option>
                              <option value='i8'>i8</option>
                              <option value='u16'>u16</option>
                              <option value='i16'>i16</option>
                              <option value='u32'>u32</option>
                              <option value='i32'>i32</option>
                              <option value='u64'>u64</option>
                              <option value='i64'>i64</option>
                              <option value='f32'>f32</option>
                              <option value='f64'>f64</option>
                              <option value='string'>string</option>
                              <option value='bytes'>bytes</option>
                            </select>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Access</Label>
                            <select
                              value={entry.access ?? 'rw'}
                              onChange={(e) =>
                                handleCanopenOdEntryChange(busIndex, entryIndex, {
                                  access: (e.target.value as CanopenOdEntry['access']) ?? 'rw',
                                })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            >
                              <option value='ro'>ro</option>
                              <option value='wo'>wo</option>
                              <option value='rw'>rw</option>
                              <option value='rwr'>rwr</option>
                              <option value='const'>const</option>
                            </select>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Default</Label>
                            <InputWithRef
                              value={String(entry.defaultValue ?? 0)}
                              onChange={(e) =>
                                handleCanopenOdEntryChange(busIndex, entryIndex, {
                                  defaultValue: e.target.value,
                                })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex items-end justify-center'>
                            <button
                              type='button'
                              onClick={() => handleRemoveCanopenOdEntry(busIndex, entryIndex)}
                              className='text-neutral-500 hover:text-red-500'
                            >
                              <TrashIcon className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className='mt-5 rounded border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950'>
                  <div className='mb-3 flex items-center justify-between'>
                    <h3 className='text-xs font-semibold uppercase tracking-[0.12em] text-neutral-700 dark:text-neutral-300'>
                      SDO Entries
                    </h3>
                    <button
                      type='button'
                      onClick={() => handleAddCanopenSdo(busIndex)}
                      className='flex items-center gap-1 rounded bg-brand px-2 py-1 text-[11px] font-medium text-white hover:bg-brand-medium-dark'
                    >
                      <PlusIcon className='h-3 w-3 stroke-white' />
                      Add SDO
                    </button>
                  </div>

                  {(bus.sdo ?? []).length === 0 ? (
                    <p className='text-xs italic text-neutral-500'>No SDO entries configured.</p>
                  ) : (
                    <div className='space-y-2'>
                      {(bus.sdo ?? []).map((sdoEntry, sdoIndex) => (
                        <div key={`${bus.name}-sdo-${sdoIndex}`} className='grid grid-cols-[1.2fr_0.8fr_0.6fr_0.8fr_0.8fr_1.2fr_0.8fr_0.4fr] gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900'>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Name</Label>
                            <InputWithRef
                              value={sdoEntry.name ?? ''}
                              onChange={(e) => handleCanopenSdoChange(busIndex, sdoIndex, { name: e.target.value || `sdo_${sdoIndex + 1}` })}
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Index</Label>
                            <InputWithRef
                              type='number'
                              value={sdoEntry.index}
                              onChange={(e) => handleCanopenSdoChange(busIndex, sdoIndex, { index: Number(e.target.value) || 0 })}
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Sub</Label>
                            <InputWithRef
                              type='number'
                              value={sdoEntry.subIndex ?? 0}
                              onChange={(e) => handleCanopenSdoChange(busIndex, sdoIndex, { subIndex: Number(e.target.value) || 0 })}
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Type</Label>
                            <select
                              value={sdoEntry.dataType ?? 'u32'}
                              onChange={(e) =>
                                handleCanopenSdoChange(busIndex, sdoIndex, {
                                  dataType: (e.target.value as CanopenSdoEntry['dataType']) ?? 'u32',
                                })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            >
                              <option value='bool'>bool</option>
                              <option value='u8'>u8</option>
                              <option value='i8'>i8</option>
                              <option value='u16'>u16</option>
                              <option value='i16'>i16</option>
                              <option value='u32'>u32</option>
                              <option value='i32'>i32</option>
                              <option value='u64'>u64</option>
                              <option value='i64'>i64</option>
                              <option value='f32'>f32</option>
                              <option value='f64'>f64</option>
                              <option value='string'>string</option>
                              <option value='bytes'>bytes</option>
                            </select>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Access</Label>
                            <select
                              value={sdoEntry.access ?? 'rw'}
                              onChange={(e) =>
                                handleCanopenSdoChange(busIndex, sdoIndex, {
                                  access: (e.target.value as CanopenSdoEntry['access']) ?? 'rw',
                                })
                              }
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            >
                              <option value='ro'>ro</option>
                              <option value='wo'>wo</option>
                              <option value='rw'>rw</option>
                              <option value='rwr'>rwr</option>
                              <option value='const'>const</option>
                            </select>
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>PLC</Label>
                            <InputWithRef
                              value={sdoEntry.plcAddress ?? ''}
                              onChange={(e) => handleCanopenSdoChange(busIndex, sdoIndex, {
                                plcAddress: e.target.value || undefined,
                                binding: {
                                  direction: sdoEntry.direction ?? 'output',
                                  iecAddress: e.target.value || '',
                                },
                              })}
                              placeholder='%QW0 / %IW0'
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            />
                          </div>
                          <div className='flex flex-col gap-1'>
                            <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Dir</Label>
                            <select
                              value={sdoEntry.direction ?? 'output'}
                              onChange={(e) => handleCanopenSdoChange(busIndex, sdoIndex, {
                                direction: (e.target.value as 'input' | 'output') ?? 'output',
                                binding: {
                                  direction: (e.target.value as 'input' | 'output') ?? 'output',
                                  iecAddress: sdoEntry.plcAddress ?? '',
                                },
                              })}
                              className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                            >
                              <option value='input'>input</option>
                              <option value='output'>output</option>
                            </select>
                          </div>
                          <div className='flex items-end justify-center'>
                            <button
                              type='button'
                              onClick={() => handleRemoveCanopenSdo(busIndex, sdoIndex)}
                              className='text-neutral-500 hover:text-red-500'
                            >
                              <TrashIcon className='h-3.5 w-3.5' />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                                  <div key={`${pdoType}-mapping-${mappingIndex}`} className='grid grid-cols-[0.8fr_0.6fr_0.7fr_1.2fr_0.9fr_1.2fr_0.2fr] gap-2 rounded bg-white p-2 dark:bg-neutral-950'>
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
                                      <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>PLC</Label>
                                      <InputWithRef
                                        value={mapping.plcAddress ?? ''}
                                        onChange={(e) =>
                                          handleCanopenMappingChange(busIndex, pdoType, pdoIndex, mappingIndex, {
                                            plcAddress: e.target.value || undefined,
                                            binding: {
                                              direction: mapping.direction ?? 'output',
                                              iecAddress: e.target.value || '',
                                            },
                                          })
                                        }
                                        placeholder='%QW0 / %IW0'
                                        className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                                      />
                                    </div>
                                    <div className='flex flex-col gap-1'>
                                      <Label className='text-[10px] text-neutral-700 dark:text-neutral-300'>Dir</Label>
                                      <select
                                        value={mapping.direction ?? 'output'}
                                        onChange={(e) =>
                                          handleCanopenMappingChange(busIndex, pdoType, pdoIndex, mappingIndex, {
                                            direction: (e.target.value as 'input' | 'output') ?? 'output',
                                            binding: {
                                              direction: (e.target.value as 'input' | 'output') ?? 'output',
                                              iecAddress: mapping.plcAddress ?? '',
                                            },
                                          })
                                        }
                                        className='h-[26px] w-full rounded border border-neutral-300 bg-white px-2 text-[11px] dark:border-neutral-700 dark:bg-neutral-950'
                                      >
                                        <option value='input'>input</option>
                                        <option value='output'>output</option>
                                      </select>
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
