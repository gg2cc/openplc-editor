import { fireEvent, render, screen, within } from '@testing-library/react'
import type { CanConfig } from '@root/middleware/shared/ports/types'

import CanDeviceEditor from '../index'

const mockUpdateCanConfig = jest.fn()
const mockMarkDirty = jest.fn()
let mockCanConfig: CanConfig

jest.mock('@root/frontend/store', () => ({
  useOpenPLCStore: () => ({
    editor: { type: 'plc-remote-device', meta: { name: 'can0', protocol: 'can' } },
    project: { data: { remoteDevices: [{ name: 'can0', protocol: 'can', canConfig: mockCanConfig }] } },
    projectActions: { updateCanConfig: mockUpdateCanConfig },
    sharedWorkspaceActions: { handleFileAndWorkspaceSavedState: mockMarkDirty },
  }),
}))

beforeEach(() => {
  jest.clearAllMocks()
  mockCanConfig = { rxFrames: [], txFrames: [] }
})

it('saves a normalized enable address and displays it in the TX table', () => {
  const { rerender } = render(<CanDeviceEditor />)
  fireEvent.click(screen.getByRole('button', { name: /Add TX Frame/ }))
  fireEvent.change(screen.getByLabelText('Enable PLC (BOOL)'), { target: { value: ' %qx10.7 ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Frame' }))

  expect(mockUpdateCanConfig).toHaveBeenCalledWith(
    'can0',
    expect.objectContaining({ txFrames: [expect.objectContaining({ enablePlcAddress: '%QX10.7' })] }),
  )
  expect(mockMarkDirty).toHaveBeenCalledWith('can0')
  mockCanConfig = mockUpdateCanConfig.mock.calls[0][1]
  rerender(<CanDeviceEditor />)
  expect(screen.getByRole('cell', { name: '%QX10.7' })).toBeTruthy()
})

it.each(['%IX0.0', '%QB0', '%QX0.8', '%QX0.'])('prevents saving invalid enable address %s', (address) => {
  render(<CanDeviceEditor />)
  fireEvent.click(screen.getByRole('button', { name: /Add TX Frame/ }))
  fireEvent.change(screen.getByLabelText('Enable PLC (BOOL)'), { target: { value: address } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Frame' }))
  expect(screen.getByRole('alert').textContent).toContain('BOOL output address')
  expect(mockUpdateCanConfig).not.toHaveBeenCalled()
})

it('loads and clears an existing binding without changing the TX trigger', () => {
  mockCanConfig = {
    txFrames: [{ canId: '0x123', trigger: 'on_change', enablePlcAddress: '%QX2.3', mappings: [] }],
  }
  render(<CanDeviceEditor />)
  const row = screen.getByRole('cell', { name: '%QX2.3' }).closest('tr')
  if (!row) throw new Error('TX frame row missing')
  fireEvent.click(within(row).getAllByRole('button')[0])
  const input = screen.getByLabelText('Enable PLC (BOOL)')
  expect(input).toHaveProperty('value', '%QX2.3')
  fireEvent.change(input, { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save Frame' }))
  expect(mockUpdateCanConfig).toHaveBeenCalledWith(
    'can0',
    expect.objectContaining({
      txFrames: [expect.objectContaining({ trigger: 'on_change', enablePlcAddress: undefined })],
    }),
  )
})

it('keeps new frames always enabled when no address is entered', () => {
  render(<CanDeviceEditor />)
  fireEvent.click(screen.getByRole('button', { name: /Add TX Frame/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Save Frame' }))
  expect(mockUpdateCanConfig).toHaveBeenCalledWith(
    'can0',
    expect.objectContaining({ txFrames: [expect.objectContaining({ enablePlcAddress: undefined })] }),
  )
})
