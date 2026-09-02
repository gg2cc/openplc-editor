import { render, screen } from '@testing-library/react'

import { PluginStatsPanel } from '..'

describe('PluginStatsPanel', () => {
  it('renders one stats row per CAN interface when plugin payload is grouped by interface', () => {
    const pluginStats = {
      can: {
        can0: {
          label: 'CAN Bus (can0)',
          fields: [
            { label: 'RX Frames', value: 3 },
            { label: 'TX Frames', value: 2 },
            { label: 'RX Errors', value: 0 },
            { label: 'TX Errors', value: 1 },
          ],
        },
        can1: {
          label: 'CAN Bus (can1)',
          fields: [
            { label: 'RX Frames', value: 5 },
            { label: 'TX Frames', value: 4 },
            { label: 'RX Errors', value: 1 },
            { label: 'TX Errors', value: 2 },
          ],
        },
      },
    }

    render(<PluginStatsPanel pluginStats={pluginStats as any} />)

    expect(screen.getByText('CAN Bus (can0)')).toBeTruthy()
    expect(screen.getByText('CAN Bus (can1)')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it('renders multiple rows for a grouped CANopen interface payload', () => {
    const pluginStats = {
      canopen: {
        interfaces: {
          can1: {
            label: 'CANopen (can1)',
            fields: [],
            rows: [
              {
                key: 'bus',
                fields: [
                  { label: 'Role', value: 'Bus' },
                  { label: 'Name', value: 'main' },
                  { label: 'Node ID', value: '-' },
                  { label: 'Interface', value: 'can1 / 500 Kbps' },
                  { label: 'Status', value: 'OK' },
                ],
              },
              {
                key: 'slave-0',
                fields: [
                  { label: 'Role', value: 'Slave' },
                  { label: 'Name', value: 'drive' },
                  { label: 'Node ID', value: '3' },
                  { label: 'Interface', value: 'can1' },
                  { label: 'Status', value: 'Operational' },
                ],
              },
            ],
          },
        },
      },
    }

    render(<PluginStatsPanel pluginStats={pluginStats as any} />)

    expect(screen.getByText('CANopen (can1)')).toBeTruthy()
    expect(screen.getByText('main')).toBeTruthy()
    expect(screen.getByText('drive')).toBeTruthy()
    expect(screen.getByText('Operational')).toBeTruthy()
  })
})
