import { Pencil1Icon, TrashIcon } from '@radix-ui/react-icons'
import type {
  CanConfig,
  CanHardwareConfig,
  CanMapping,
  CanRxFrame,
  CanTxFrame,
} from '@root/middleware/shared/ports/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { PlusIcon } from '../../../../../../assets/icons/interface/Plus'
import { useOpenPLCStore } from '../../../../../../store'
import { InputWithRef } from '../../../../../_atoms/input'
import { Label } from '../../../../../_atoms/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../../../_atoms/select'
import { ToggleSwitch } from '../../../../../_atoms/toggle-switch'
import { Modal, ModalContent, ModalFooter, ModalHeader, ModalTitle } from '../../../../../_molecules/modal'

const BITRATE_OPTIONS = [
  { value: '125000', label: '125 Kbps' },
  { value: '250000', label: '250 Kbps' },
  { value: '500000', label: '500 Kbps' },
  { value: '1000000', label: '1 Mbps' },
]

const RX_IEC_TYPES = [
  { value: 'BYTE_INPUT', label: 'BYTE (%IB)' },
  { value: 'WORD_INPUT', label: 'WORD (%IW)' },
  { value: 'INT_INPUT', label: 'INT (%IW)' },
  { value: 'DINT_INPUT', label: 'DINT (%ID)' },
  { value: 'REAL_INPUT', label: 'REAL (%ID)' },
  { value: 'BOOL_INPUT', label: 'BOOL (%IX)' },
]

const TX_IEC_TYPES = [
  { value: 'BYTE_OUTPUT', label: 'BYTE (%QB)' },
  { value: 'WORD_OUTPUT', label: 'WORD (%QW)' },
  { value: 'INT_OUTPUT', label: 'INT (%QW)' },
  { value: 'DINT_OUTPUT', label: 'DINT (%QD)' },
  { value: 'REAL_OUTPUT', label: 'REAL (%QD)' },
  { value: 'BOOL_OUTPUT', label: 'BOOL (%QX)' },
]

const TRIGGER_OPTIONS = [
  { value: 'cyclic', label: 'Cyclic (周期发送)' },
  { value: 'on_change', label: 'On Change (变化发送)' },
]

const CAN_SELECT_TRIGGER_STYLES =
  'flex h-[30px] w-full items-center justify-between gap-1 rounded-md border border-neutral-300 bg-white px-2 py-1 font-caption !text-xs font-medium text-neutral-850 outline-none data-[state=open]:border-brand-medium-dark dark:border-neutral-850 dark:bg-neutral-950 dark:text-neutral-300'

const CAN_SELECT_CONTENT_STYLES =
  'h-fit max-h-[200px] w-[--radix-select-trigger-width] overflow-y-auto rounded-lg border border-neutral-300 bg-white outline-none drop-shadow-lg dark:border-brand-medium-dark dark:bg-neutral-950'

const CAN_SELECT_ITEM_STYLES =
  'data-[state=checked]:[&:not(:hover)]:bg-neutral-100 data-[state=checked]:dark:[&:not(:hover)]:bg-neutral-900 flex w-full cursor-pointer items-center justify-start px-2 py-1 outline-none hover:bg-neutral-100 dark:hover:bg-neutral-800'

const DEFAULT_HARDWARE_CONFIG: CanHardwareConfig = {
  interface: 'can0',
  bitrate: 500000,
  sjw: 1,
  samplePoint: 0.875,
  restartMs: 100,
  tripleSampling: false,
}

// Modal for editing an RX Frame
type RxFrameModalProps = {
  isOpen: boolean
  onClose: () => void
  frame: CanRxFrame | null
  onSave: (frame: CanRxFrame) => void
}

const RxFrameModal = ({ isOpen, onClose, frame, onSave }: RxFrameModalProps) => {
  const [canId, setCanId] = useState('0x123')
  const [eff, setEff] = useState(false)
  const [rtr, setRtr] = useState(false)
  const [dlc, setDlc] = useState(8)
  const [mappings, setMappings] = useState<CanMapping[]>([])

  useEffect(() => {
    if (frame) {
      setCanId(frame.canId || '0x123')
      setEff(!!frame.eff)
      setRtr(!!frame.rtr)
      setDlc(frame.dlc ?? 8)
      setMappings(frame.mappings ? [...frame.mappings] : [])
    } else {
      setCanId('0x123')
      setEff(false)
      setRtr(false)
      setDlc(8)
      setMappings([{ byteOffset: 0, iecType: 'BYTE_INPUT', iecIndex: 0 }])
    }
  }, [frame, isOpen])

  const handleAddMapping = () => {
    const nextOffset = mappings.length > 0 ? (mappings[mappings.length - 1].byteOffset + 1) % 8 : 0
    setMappings([...mappings, { byteOffset: nextOffset, iecType: 'BYTE_INPUT', iecIndex: mappings.length }])
  }

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index))
  }

  const handleUpdateMapping = (index: number, key: keyof CanMapping, value: string | number) => {
    const updated = [...mappings]
    updated[index] = { ...updated[index], [key]: value }
    setMappings(updated)
  }

  const handleSave = () => {
    onSave({
      canId,
      eff,
      rtr,
      dlc,
      mappings,
    })
    onClose()
  }

  const inputStyles =
    'h-[30px] w-full rounded-md border border-neutral-300 bg-white px-2 py-1 font-caption text-cp-sm font-medium text-neutral-850 outline-none focus:border-brand-medium-dark dark:border-neutral-850 dark:bg-neutral-950 dark:text-neutral-300'

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className='w-[560px] max-h-[90vh] overflow-y-auto' onClose={onClose}>
        <ModalHeader>
          <ModalTitle>{frame ? 'Edit RX Frame' : 'New RX Frame'}</ModalTitle>
        </ModalHeader>
        <div className='flex flex-col gap-3 py-2'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='flex items-center gap-2'>
              <Label className='w-20 text-xs text-neutral-950 dark:text-white'>CAN ID</Label>
              <InputWithRef
                value={canId}
                onChange={(e) => setCanId(e.target.value)}
                placeholder='0x123'
                className={inputStyles}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Label className='w-20 text-xs text-neutral-950 dark:text-white'>DLC</Label>
              <InputWithRef
                type='number'
                min={1}
                max={8}
                value={dlc}
                onChange={(e) => setDlc(parseInt(e.target.value, 10) || 8)}
                className={inputStyles}
              />
            </div>
          </div>

          <div className='flex items-center gap-6 py-1'>
            <div className='flex items-center gap-2'>
              <ToggleSwitch id='eff-switch' checked={eff} onCheckedChange={setEff} />
              <Label htmlFor='eff-switch' className='text-xs text-neutral-950 dark:text-white cursor-pointer'>
                Extended Frame (29-bit EFF)
              </Label>
            </div>
            <div className='flex items-center gap-2'>
              <ToggleSwitch id='rtr-switch' checked={rtr} onCheckedChange={setRtr} />
              <Label htmlFor='rtr-switch' className='text-xs text-neutral-950 dark:text-white cursor-pointer'>
                Remote Frame (RTR)
              </Label>
            </div>
          </div>

          <div className='mt-2 flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-neutral-950 dark:text-white'>
                IEC Variable Mappings (To %I)
              </span>
              <button
                type='button'
                onClick={handleAddMapping}
                className='flex items-center gap-1 rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-medium-dark'
              >
                <PlusIcon className='h-3 w-3 stroke-white' />
                <span>Add Mapping</span>
              </button>
            </div>

            <div className='flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1'>
              {mappings.length === 0 ? (
                <p className='text-xs italic text-neutral-500'>No IEC mappings defined for this frame.</p>
              ) : (
                mappings.map((m, idx) => (
                  <div
                    key={idx}
                    className='flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900'
                  >
                    <div className='flex items-center gap-1 w-28'>
                      <Label className='text-[11px] text-neutral-600 dark:text-neutral-400'>Byte</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        max={7}
                        value={m.byteOffset}
                        onChange={(e) => handleUpdateMapping(idx, 'byteOffset', parseInt(e.target.value, 10) || 0)}
                        className='h-[26px] w-14 rounded border px-1 text-xs'
                      />
                    </div>

                    <div className='w-36'>
                      <Select
                        value={m.iecType}
                        onValueChange={(val) => handleUpdateMapping(idx, 'iecType', val)}
                      >
                        <SelectTrigger className='h-[26px] text-xs px-2' />
                        <SelectContent className='bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800'>
                          {RX_IEC_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className='text-xs py-1 px-2 cursor-pointer'>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-1 w-24'>
                      <Label className='text-[11px] text-neutral-600 dark:text-neutral-400'>Idx</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        value={m.iecIndex}
                        onChange={(e) => handleUpdateMapping(idx, 'iecIndex', parseInt(e.target.value, 10) || 0)}
                        className='h-[26px] w-14 rounded border px-1 text-xs'
                      />
                    </div>

                    <button
                      type='button'
                      onClick={() => handleRemoveMapping(idx)}
                      className='p-1 text-neutral-500 hover:text-red-500'
                    >
                      <TrashIcon className='h-4 w-4' />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <ModalFooter>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSave}
            className='rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-medium-dark'
          >
            Save Frame
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// Modal for editing a TX Frame
type TxFrameModalProps = {
  isOpen: boolean
  onClose: () => void
  frame: CanTxFrame | null
  onSave: (frame: CanTxFrame) => void
}

const TxFrameModal = ({ isOpen, onClose, frame, onSave }: TxFrameModalProps) => {
  const [canId, setCanId] = useState('0x456')
  const [eff, setEff] = useState(false)
  const [dlc, setDlc] = useState(8)
  const [trigger, setTrigger] = useState<'cyclic' | 'on_change'>('cyclic')
  const [cycleTimeMs, setCycleTimeMs] = useState(10)
  const [mappings, setMappings] = useState<CanMapping[]>([])

  useEffect(() => {
    if (frame) {
      setCanId(frame.canId || '0x456')
      setEff(!!frame.eff)
      setDlc(frame.dlc ?? 8)
      setTrigger(frame.trigger ?? 'cyclic')
      setCycleTimeMs(frame.cycleTimeMs ?? 10)
      setMappings(frame.mappings ? [...frame.mappings] : [])
    } else {
      setCanId('0x456')
      setEff(false)
      setDlc(8)
      setTrigger('cyclic')
      setCycleTimeMs(10)
      setMappings([{ byteOffset: 0, iecType: 'BYTE_OUTPUT', iecIndex: 0 }])
    }
  }, [frame, isOpen])

  const handleAddMapping = () => {
    const nextOffset = mappings.length > 0 ? (mappings[mappings.length - 1].byteOffset + 1) % 8 : 0
    setMappings([...mappings, { byteOffset: nextOffset, iecType: 'BYTE_OUTPUT', iecIndex: mappings.length }])
  }

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index))
  }

  const handleUpdateMapping = (index: number, key: keyof CanMapping, value: string | number) => {
    const updated = [...mappings]
    updated[index] = { ...updated[index], [key]: value }
    setMappings(updated)
  }

  const handleSave = () => {
    onSave({
      canId,
      eff,
      dlc,
      trigger,
      cycleTimeMs,
      mappings,
    })
    onClose()
  }

  const inputStyles =
    'h-[30px] w-full rounded-md border border-neutral-300 bg-white px-2 py-1 font-caption text-cp-sm font-medium text-neutral-850 outline-none focus:border-brand-medium-dark dark:border-neutral-850 dark:bg-neutral-950 dark:text-neutral-300'

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className='w-[560px] max-h-[90vh] overflow-y-auto' onClose={onClose}>
        <ModalHeader>
          <ModalTitle>{frame ? 'Edit TX Frame' : 'New TX Frame'}</ModalTitle>
        </ModalHeader>
        <div className='flex flex-col gap-3 py-2'>
          <div className='grid grid-cols-2 gap-3'>
            <div className='flex items-center gap-2'>
              <Label className='w-20 text-xs text-neutral-950 dark:text-white'>CAN ID</Label>
              <InputWithRef
                value={canId}
                onChange={(e) => setCanId(e.target.value)}
                placeholder='0x456'
                className={inputStyles}
              />
            </div>
            <div className='flex items-center gap-2'>
              <Label className='w-20 text-xs text-neutral-950 dark:text-white'>DLC</Label>
              <InputWithRef
                type='number'
                min={1}
                max={8}
                value={dlc}
                onChange={(e) => setDlc(parseInt(e.target.value, 10) || 8)}
                className={inputStyles}
              />
            </div>
          </div>

          <div className='grid grid-cols-2 gap-3'>
            <div className='flex items-center gap-2'>
              <Label className='w-20 text-xs text-neutral-950 dark:text-white'>Trigger</Label>
              <Select value={trigger} onValueChange={(val) => setTrigger(val as 'cyclic' | 'on_change')}>
                <SelectTrigger withIndicator placeholder='Select trigger' className={CAN_SELECT_TRIGGER_STYLES} />
                <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                  {TRIGGER_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value} className={CAN_SELECT_ITEM_STYLES}>
                      <span className='text-start font-caption text-xs font-normal text-neutral-700 dark:text-neutral-100'>
                        {t.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {trigger === 'cyclic' && (
              <div className='flex items-center gap-2'>
                <Label className='w-24 text-xs text-neutral-950 dark:text-white'>Cycle (ms)</Label>
                <InputWithRef
                  type='number'
                  min={1}
                  value={cycleTimeMs}
                  onChange={(e) => setCycleTimeMs(parseInt(e.target.value, 10) || 10)}
                  className={inputStyles}
                />
              </div>
            )}
          </div>

          <div className='flex items-center gap-2 py-1'>
            <ToggleSwitch id='tx-eff-switch' checked={eff} onCheckedChange={setEff} />
            <Label htmlFor='tx-eff-switch' className='text-xs text-neutral-950 dark:text-white cursor-pointer'>
              Extended Frame (29-bit EFF)
            </Label>
          </div>

          <div className='mt-2 flex flex-col gap-2'>
            <div className='flex items-center justify-between'>
              <span className='text-xs font-semibold text-neutral-950 dark:text-white'>
                IEC Variable Mappings (From %Q)
              </span>
              <button
                type='button'
                onClick={handleAddMapping}
                className='flex items-center gap-1 rounded bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-medium-dark'
              >
                <PlusIcon className='h-3 w-3 stroke-white' />
                <span>Add Mapping</span>
              </button>
            </div>

            <div className='flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1'>
              {mappings.length === 0 ? (
                <p className='text-xs italic text-neutral-500'>No IEC mappings defined for this frame.</p>
              ) : (
                mappings.map((m, idx) => (
                  <div
                    key={idx}
                    className='flex items-center gap-2 rounded border border-neutral-200 bg-neutral-50 p-2 dark:border-neutral-800 dark:bg-neutral-900'
                  >
                    <div className='flex items-center gap-1 w-28'>
                      <Label className='text-[11px] text-neutral-600 dark:text-neutral-400'>Byte</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        max={7}
                        value={m.byteOffset}
                        onChange={(e) => handleUpdateMapping(idx, 'byteOffset', parseInt(e.target.value, 10) || 0)}
                        className='h-[26px] w-14 rounded border px-1 text-xs'
                      />
                    </div>

                    <div className='w-36'>
                      <Select
                        value={m.iecType}
                        onValueChange={(val) => handleUpdateMapping(idx, 'iecType', val)}
                      >
                        <SelectTrigger className='h-[26px] text-xs px-2' />
                        <SelectContent className='bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800'>
                          {TX_IEC_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value} className='text-xs py-1 px-2 cursor-pointer'>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='flex items-center gap-1 w-24'>
                      <Label className='text-[11px] text-neutral-600 dark:text-neutral-400'>Idx</Label>
                      <InputWithRef
                        type='number'
                        min={0}
                        value={m.iecIndex}
                        onChange={(e) => handleUpdateMapping(idx, 'iecIndex', parseInt(e.target.value, 10) || 0)}
                        className='h-[26px] w-14 rounded border px-1 text-xs'
                      />
                    </div>

                    <button
                      type='button'
                      onClick={() => handleRemoveMapping(idx)}
                      className='p-1 text-neutral-500 hover:text-red-500'
                    >
                      <TrashIcon className='h-4 w-4' />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        <ModalFooter>
          <button
            type='button'
            onClick={onClose}
            className='rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:text-neutral-300'
          >
            Cancel
          </button>
          <button
            type='button'
            onClick={handleSave}
            className='rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-medium-dark'
          >
            Save Frame
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

const CanDeviceEditor = () => {
  const {
    editor,
    project,
    projectActions,
    sharedWorkspaceActions: { handleFileAndWorkspaceSavedState },
  } = useOpenPLCStore()

  const deviceName = editor.type === 'plc-remote-device' ? editor.meta.name : ''
  const protocol = editor.type === 'plc-remote-device' ? editor.meta.protocol : null

  const device = useMemo(() => {
    return project.data.remoteDevices?.find((d) => d.name === deviceName)
  }, [project.data.remoteDevices, deviceName])

  const canConfig: CanConfig = useMemo(() => {
    return (
      device?.canConfig ?? {
        hardwareConfig: DEFAULT_HARDWARE_CONFIG,
        rxFrames: [],
        txFrames: [],
      }
    )
  }, [device])

  const hw = canConfig.hardwareConfig ?? DEFAULT_HARDWARE_CONFIG

  // State for modals
  const [isRxModalOpen, setIsRxModalOpen] = useState(false)
  const [editingRxIndex, setEditingRxIndex] = useState<number | null>(null)

  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [editingTxIndex, setEditingTxIndex] = useState<number | null>(null)

  // Update store helper
  const updateStore = useCallback(
    (newConfig: CanConfig) => {
      if (!deviceName || protocol !== 'can') return
      projectActions.updateCanConfig(deviceName, newConfig)
      handleFileAndWorkspaceSavedState(deviceName)
    },
    [deviceName, protocol, projectActions, handleFileAndWorkspaceSavedState],
  )

  // Handlers for Hardware config
  const handleHwChange = (key: keyof CanHardwareConfig, value: unknown) => {
    const updatedHw: CanHardwareConfig = { ...hw, [key]: value }
    updateStore({ ...canConfig, hardwareConfig: updatedHw })
  }

  // Handlers for RX Frames
  const handleSaveRxFrame = (frame: CanRxFrame) => {
    const rxFrames = [...(canConfig.rxFrames ?? [])]
    if (editingRxIndex !== null && editingRxIndex >= 0) {
      rxFrames[editingRxIndex] = frame
    } else {
      rxFrames.push(frame)
    }
    updateStore({ ...canConfig, rxFrames })
  }

  const handleDeleteRxFrame = (index: number) => {
    const rxFrames = (canConfig.rxFrames ?? []).filter((_, i) => i !== index)
    updateStore({ ...canConfig, rxFrames })
  }

  // Handlers for TX Frames
  const handleSaveTxFrame = (frame: CanTxFrame) => {
    const txFrames = [...(canConfig.txFrames ?? [])]
    if (editingTxIndex !== null && editingTxIndex >= 0) {
      txFrames[editingTxIndex] = frame
    } else {
      txFrames.push(frame)
    }
    updateStore({ ...canConfig, txFrames })
  }

  const handleDeleteTxFrame = (index: number) => {
    const txFrames = (canConfig.txFrames ?? []).filter((_, i) => i !== index)
    updateStore({ ...canConfig, txFrames })
  }

  const inputStyles =
    'h-[30px] w-full rounded-md border border-neutral-300 bg-white px-2 py-1 font-caption text-cp-sm font-medium text-neutral-850 outline-none focus:border-brand-medium-dark dark:border-neutral-850 dark:bg-neutral-950 dark:text-neutral-300'

  return (
    <div className='flex h-full w-full flex-col overflow-y-auto bg-neutral-100 p-6 dark:bg-neutral-900'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800'>
        <div>
          <h1 className='font-display text-xl font-bold text-neutral-950 dark:text-white'>{deviceName}</h1>
          <p className='text-sm text-neutral-600 dark:text-neutral-400'>Protocol: CAN</p>
        </div>
      </div>

      <div className='flex flex-col gap-6 max-w-5xl'>
        {/* Hardware & Bit Timing Settings */}
        <div className='rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950'>
          <h2 className='mb-4 font-display text-sm font-semibold text-neutral-950 dark:text-white'>
            Hardware & Bit Timing Settings (硬件与位定时配置)
          </h2>

          <div className='grid grid-cols-3 gap-4 mb-4'>
            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Interface (接口名称)</Label>
              <InputWithRef
                value={hw.interface}
                onChange={(e) => handleHwChange('interface', e.target.value)}
                placeholder='can0'
                className={inputStyles}
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Bitrate (波特率 bps)</Label>
              <Select
                value={hw.bitrate.toString()}
                onValueChange={(val) => handleHwChange('bitrate', parseInt(val, 10) || 500000)}
              >
                <SelectTrigger withIndicator placeholder='Select bitrate' className={CAN_SELECT_TRIGGER_STYLES} />
                <SelectContent className={CAN_SELECT_CONTENT_STYLES}>
                  {BITRATE_OPTIONS.map((b) => (
                    <SelectItem key={b.value} value={b.value} className={CAN_SELECT_ITEM_STYLES}>
                      <span className='text-start font-caption text-xs font-normal text-neutral-700 dark:text-neutral-100'>
                        {b.label}
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
                value={hw.sjw ?? 1}
                onChange={(e) => handleHwChange('sjw', parseInt(e.target.value, 10) || 1)}
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
                value={hw.samplePoint ?? 0.875}
                onChange={(e) => handleHwChange('samplePoint', parseFloat(e.target.value) || 0.875)}
                className={inputStyles}
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label className='text-xs text-neutral-700 dark:text-neutral-300'>Bus-Off Restart (ms)</Label>
              <InputWithRef
                type='number'
                min={0}
                value={hw.restartMs ?? 100}
                onChange={(e) => handleHwChange('restartMs', parseInt(e.target.value, 10) || 0)}
                className={inputStyles}
              />
            </div>

            <div className='flex items-center gap-2'>
              <ToggleSwitch
                id='triple-sampling'
                checked={hw.tripleSampling ?? false}
                onCheckedChange={(checked) => handleHwChange('tripleSampling', checked)}
              />
              <Label
                htmlFor='triple-sampling'
                className='text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer'
              >
                Triple Sampling
              </Label>
            </div>
          </div>
        </div>

        {/* RX Frames Table */}
        <div className='rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='font-display text-sm font-semibold text-neutral-950 dark:text-white'>
                RX Frames (接收报文 - 映射至 PLC %I 输入表)
              </h2>
              <p className='text-xs text-neutral-500'>
                从 CAN 总线接收包含匹配 CAN ID 的帧并自动写入 PLC 输入表
              </p>
            </div>
            <button
              type='button'
              onClick={() => {
                setEditingRxIndex(null)
                setIsRxModalOpen(true)
              }}
              className='flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-medium-dark'
            >
              <PlusIcon className='h-3.5 w-3.5 stroke-white' />
              <span>Add RX Frame</span>
            </button>
          </div>

          <div className='overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-neutral-50 font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'>
                <tr>
                  <th className='p-2.5'>CAN ID</th>
                  <th className='p-2.5'>Frame Type</th>
                  <th className='p-2.5'>DLC</th>
                  <th className='p-2.5'>Mappings (IEC Inputs)</th>
                  <th className='p-2.5 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                {(canConfig.rxFrames ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className='p-4 text-center italic text-neutral-500'>
                      No RX frames configured. Click "Add RX Frame" to define CAN reception rules.
                    </td>
                  </tr>
                ) : (
                  (canConfig.rxFrames ?? []).map((frame, index) => (
                    <tr key={index} className='hover:bg-neutral-50 dark:hover:bg-neutral-900/50'>
                      <td className='p-2.5 font-mono font-medium text-neutral-900 dark:text-neutral-100'>
                        {frame.canId}
                      </td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>
                        {frame.eff ? 'Extended (29-bit)' : 'Standard (11-bit)'}
                        {frame.rtr ? ' [RTR]' : ''}
                      </td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>{frame.dlc ?? 8} bytes</td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>
                        {(frame.mappings ?? []).length === 0 ? (
                          <span className='italic text-neutral-400'>None</span>
                        ) : (
                          (frame.mappings ?? [])
                            .map((m) => `Byte ${m.byteOffset} to ${m.iecType} #${m.iecIndex}`)
                            .join(', ')
                        )}
                      </td>
                      <td className='p-2.5 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            type='button'
                            onClick={() => {
                              setEditingRxIndex(index)
                              setIsRxModalOpen(true)
                            }}
                            className='text-neutral-600 hover:text-brand dark:text-neutral-400'
                          >
                            <Pencil1Icon className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDeleteRxFrame(index)}
                            className='text-neutral-600 hover:text-red-500 dark:text-neutral-400'
                          >
                            <TrashIcon className='h-4 w-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* TX Frames Table */}
        <div className='rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950'>
          <div className='mb-4 flex items-center justify-between'>
            <div>
              <h2 className='font-display text-sm font-semibold text-neutral-950 dark:text-white'>
                TX Frames (发送报文 - 读取自 PLC %Q 输出表)
              </h2>
              <p className='text-xs text-neutral-500'>
                从 PLC 输出表读取数据，打包构造 CAN 帧并发送至物理总线
              </p>
            </div>
            <button
              type='button'
              onClick={() => {
                setEditingTxIndex(null)
                setIsTxModalOpen(true)
              }}
              className='flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-medium-dark'
            >
              <PlusIcon className='h-3.5 w-3.5 stroke-white' />
              <span>Add TX Frame</span>
            </button>
          </div>

          <div className='overflow-x-auto rounded border border-neutral-200 dark:border-neutral-800'>
            <table className='w-full text-left text-xs'>
              <thead className='bg-neutral-50 font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'>
                <tr>
                  <th className='p-2.5'>CAN ID</th>
                  <th className='p-2.5'>Frame Type</th>
                  <th className='p-2.5'>DLC</th>
                  <th className='p-2.5'>Trigger</th>
                  <th className='p-2.5'>Mappings (IEC Outputs)</th>
                  <th className='p-2.5 text-right'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-neutral-200 dark:divide-neutral-800'>
                {(canConfig.txFrames ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className='p-4 text-center italic text-neutral-500'>
                      No TX frames configured. Click "Add TX Frame" to define CAN transmission rules.
                    </td>
                  </tr>
                ) : (
                  (canConfig.txFrames ?? []).map((frame, index) => (
                    <tr key={index} className='hover:bg-neutral-50 dark:hover:bg-neutral-900/50'>
                      <td className='p-2.5 font-mono font-medium text-neutral-900 dark:text-neutral-100'>
                        {frame.canId}
                      </td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>
                        {frame.eff ? 'Extended (29-bit)' : 'Standard (11-bit)'}
                      </td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>{frame.dlc ?? 8} bytes</td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>
                        {frame.trigger === 'on_change' ? 'On Change' : `Cyclic (${frame.cycleTimeMs ?? 10} ms)`}
                      </td>
                      <td className='p-2.5 text-neutral-600 dark:text-neutral-400'>
                        {(frame.mappings ?? []).length === 0 ? (
                          <span className='italic text-neutral-400'>None</span>
                        ) : (
                          (frame.mappings ?? [])
                            .map((m) => `Byte ${m.byteOffset} from ${m.iecType} #${m.iecIndex}`)
                            .join(', ')
                        )}
                      </td>
                      <td className='p-2.5 text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            type='button'
                            onClick={() => {
                              setEditingTxIndex(index)
                              setIsTxModalOpen(true)
                            }}
                            className='text-neutral-600 hover:text-brand dark:text-neutral-400'
                          >
                            <Pencil1Icon className='h-4 w-4' />
                          </button>
                          <button
                            type='button'
                            onClick={() => handleDeleteTxFrame(index)}
                            className='text-neutral-600 hover:text-red-500 dark:text-neutral-400'
                          >
                            <TrashIcon className='h-4 w-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* RX Frame Modal */}
      <RxFrameModal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        frame={editingRxIndex !== null ? (canConfig.rxFrames ?? [])[editingRxIndex] : null}
        onSave={handleSaveRxFrame}
      />

      {/* TX Frame Modal */}
      <TxFrameModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        frame={editingTxIndex !== null ? (canConfig.txFrames ?? [])[editingTxIndex] : null}
        onSave={handleSaveTxFrame}
      />
    </div>
  )
}

export default CanDeviceEditor
